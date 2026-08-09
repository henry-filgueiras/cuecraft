import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import { describeMissingR, RError, runR } from "./r.ts";
import { repositoryRoot } from "../repository.ts";

/**
 * The boundary itself, against a real interpreter.
 *
 * Named `*.live-test.ts` so `npm test`'s glob cannot pick it up, exactly as the Kokoro tests are:
 * the ordinary suite has to stay runnable on a machine that has bootstrapped nothing. Run these
 * with `npm run test:r` after ./scripts/bootstrap-r.sh.
 *
 * These are not a second copy of `./r.test.ts`. What is checked here is only what a stub cannot
 * establish: that R actually receives its program over stdin, actually sees the environment, and
 * that a failure on the far side arrives as something a person can act on.
 */

let workspace: string;

before(async () => {
  const problem = await describeMissingR();
  if (problem !== undefined) {
    throw new Error(`${problem}\n\nThese tests require R.`);
  }
  // A directory with a space in it, deliberately. macOS puts checkouts under paths like
  // "Library/Mobile Documents" often enough that a runner which quotes nothing would work here
  // and fail on somebody's laptop; the whole path is threaded through an environment variable
  // and a shell-less spawn, and this is what proves it.
  workspace = await mkdtemp(join(tmpdir(), "cuecraft r live "));
});

after(async () => {
  if (workspace !== undefined) await rm(workspace, { recursive: true, force: true });
});

const PLOT = `
  out <- Sys.getenv("CUECRAFT_OUTPUT_DIR")
  png(file.path(out, "chart.png"),
      width = as.integer(Sys.getenv("CUECRAFT_WIDTH")),
      height = as.integer(Sys.getenv("CUECRAFT_HEIGHT")),
      bg = Sys.getenv("CUECRAFT_BACKGROUND"), type = "cairo")
  barplot(c(3, 1, 4, 1, 5), col = Sys.getenv("CUECRAFT_ACCENT"), border = NA)
  invisible(dev.off())
  cat("#cuecraft output png chart chart.png\\n")
`;

const FRAME = {
  width: 800,
  height: 400,
  pointSize: 20,
  background: "#0A0D12",
  foreground: "#F5F7FB",
  muted: "#C2CBD9",
  accent: "#D9A05B",
} as const;

test("TypeScript drives R over stdin and gets a real PNG back", async () => {
  const result = await runR({
    source: PLOT,
    label: "plot.R",
    outputDir: join(workspace, "plot"),
    frame: FRAME,
  });

  assert.equal(result.outputs.length, 1);
  const [output] = result.outputs;
  assert.equal(output?.name, "chart");
  assert.equal(output?.type, "png");

  // The dimensions come from the environment, so this is the round trip: cuecraft said how big,
  // R drew that size, and cuecraft read the size back out of the file rather than assuming it.
  assert.equal(output?.width, FRAME.width);
  assert.equal(output?.height, FRAME.height);

  const bytes = await readFile(output?.path ?? "");
  assert.ok(bytes.length > 1000, `expected a real image, got ${bytes.length} bytes`);
  assert.equal(result.stderr.trim(), "");
});

test("R reads a declared input, and paths with spaces survive", async () => {
  const data = join(workspace, "quarterly figures.csv");
  await writeFile(data, "region,revenue\nnorth,10\nsouth,32\nnorth,8\n");

  const result = await runR({
    source: `
      rows <- read.csv(Sys.getenv("CUECRAFT_INPUT_SALES"))
      totals <- aggregate(revenue ~ region, data = rows, FUN = sum)
      cat("names:", Sys.getenv("CUECRAFT_INPUT_NAMES"), "\\n")
      cat("north:", totals$revenue[totals$region == "north"], "\\n")
      out <- file.path(Sys.getenv("CUECRAFT_OUTPUT_DIR"), "totals.png")
      png(out, width = 200, height = 200, type = "cairo")
      barplot(totals$revenue)
      invisible(dev.off())
      cat("#cuecraft output png totals totals.png\\n")
    `,
    label: "totals.R",
    outputDir: join(workspace, "totals"),
    inputs: [{ name: "sales", path: data }],
  });

  assert.equal(result.outputs.length, 1);
  // The aggregation actually happened on the far side, on the file cuecraft named.
  assert.match(result.notes, /north: 18/);
  assert.match(result.notes, /names: sales/);
});

test("the working directory is the output directory, so a bare filename lands there", async () => {
  const result = await runR({
    source: `
      png("relative.png", width = 480, height = 360, type = "cairo")
      plot(1:3)
      invisible(dev.off())
      cat("#cuecraft output png chart relative.png\\n")
    `,
    label: "relative.R",
    outputDir: join(workspace, "relative"),
  });

  assert.equal(result.outputs[0]?.file, "relative.png");
});

test("a syntax error is a failed run carrying R's own complaint", async () => {
  const error = await failing({
    source: "this is( not R\n",
    label: "broken.R",
    outputDir: join(workspace, "broken"),
  });

  assert.equal(error.failure, "failed");
  assert.notEqual(error.exitCode, 0);
  assert.match(error.report(), /broken\.R exited/);
  assert.match(error.stderr, /Error/i);
});

test("a runtime error names the object the program got wrong", async () => {
  const error = await failing({
    source: `
      rows <- data.frame(region = c("a", "b"), revenue = c(1, 2))
      aggregate(revenu ~ region, data = rows, FUN = sum)
    `,
    label: "typo.R",
    outputDir: join(workspace, "typo"),
  });

  assert.equal(error.failure, "failed");
  assert.match(error.stderr, /revenu/);
  // The whole point of separating the streams: the traceback is quoted under a label rather than
  // interleaved with whatever the program printed before it broke.
  assert.match(error.report(), /R stderr:/);
});

test("a program that exits nonzero on purpose is still a failure with its message", async () => {
  const error = await failing({
    source: 'cat("about to give up\\n"); quit(status = 3)\n',
    label: "giveup.R",
    outputDir: join(workspace, "giveup"),
  });

  assert.equal(error.exitCode, 3);
  assert.match(error.stdout, /about to give up/);
});

test("a program that declares a file it did not write is refused after a successful exit", async () => {
  const error = await failing({
    source: 'cat("#cuecraft output png chart chart.png\\n")\n',
    label: "absent.R",
    outputDir: join(workspace, "absent"),
  });

  assert.equal(error.failure, "protocol");
  assert.match(error.message, /was declared but never written/);
});

test("a program that declares a path outside its directory is refused", async () => {
  const error = await failing({
    source: 'cat("#cuecraft output png chart ../escape.png\\n")\n',
    label: "escape.R",
    outputDir: join(workspace, "escape"),
  });

  assert.equal(error.failure, "protocol");
  assert.match(error.message, /resolves outside CUECRAFT_OUTPUT_DIR/);
});

test("the output directory is emptied before each run", async () => {
  const outputDir = join(workspace, "stale");
  const first = await runR({
    source: PLOT,
    label: "plot.R",
    outputDir,
    frame: FRAME,
  });
  assert.ok(first.outputs[0] !== undefined);

  // A program that stops producing its chart must fail, not keep succeeding against the one it
  // produced last time — which is the whole reason materialization does not cache.
  const error = await failing({
    source: 'cat("#cuecraft output png chart chart.png\\n")\n',
    label: "plot.R",
    outputDir,
  });
  assert.match(error.message, /was declared but never written/);
});

test("a run is stopped when it will not finish", async () => {
  const error = await failing({
    source: "while (TRUE) {}\n",
    label: "spin.R",
    outputDir: join(workspace, "spin"),
    timeoutMs: 2000,
  });

  assert.equal(error.failure, "timeout");
  assert.match(error.message, /did not finish within 2s/);
});

test("the shipped demo program runs, against the shipped data", async () => {
  const result = await runR({
    source: await readFile(
      join(repositoryRoot(), "examples", "revenue", "quarterly-revenue.R"),
      "utf8",
    ),
    label: "examples/revenue/quarterly-revenue.R",
    outputDir: join(workspace, "revenue"),
    inputs: [
      {
        name: "transactions",
        path: join(repositoryRoot(), "examples", "revenue", "transactions.csv"),
      },
    ],
    frame: FRAME,
  });

  assert.equal(result.outputs.length, 1);
  assert.equal(result.outputs[0]?.name, "quarterly-revenue");
  const chart = result.outputs[0];
  assert.equal(chart?.type === "png" ? chart.width : undefined, FRAME.width);
  // The program reports what it actually read, so the deck's claims have something to check.
  assert.match(result.notes, /468 transactions, 4 regions, 4 quarters/);
});

/**
 * The two formats sprint:28 added, against the interpreter that has to produce them.
 *
 * `./csv.test.ts` and `./svg.test.ts` prove cuecraft can *read* a good file. What only a real R can
 * establish is that base R can *write* one — in particular that the tagging technique works against
 * whatever cairo this machine has, which is the finding decision:57's spike said was impossible and
 * this round says is not.
 */

test("the showcase's table program runs, and hands back a table", async () => {
  const result = await runR({
    source: await readFile(
      join(repositoryRoot(), "examples", "pivot", "quarterly-table.R"),
      "utf8",
    ),
    label: "examples/pivot/quarterly-table.R",
    outputDir: join(workspace, "pivot-table"),
    inputs: [
      {
        name: "transactions",
        path: join(repositoryRoot(), "examples", "pivot", "transactions.csv"),
      },
    ],
    frame: FRAME,
  });

  const output = result.outputs[0];
  assert.equal(output?.type, "csv");
  assert.ok(output?.type === "csv");
  assert.deepEqual(output.table.columns, ["segment", "Q1", "Q2", "Q3", "Q4", "movement"]);
  assert.equal(output.table.rows.length, 24);
  // Quoted by write.csv, and unquoted by the reader: what comes back is the value, not the file.
  assert.equal(output.table.rows[0]?.[0], "East Fathom");
  assert.match(result.notes, /673 transactions in, 24 segments out/);
});

test("the showcase's chart program runs, and every bar it drew has a name", async () => {
  const result = await runR({
    source: await readFile(
      join(repositoryRoot(), "examples", "pivot", "quarterly-chart.R"),
      "utf8",
    ),
    label: "examples/pivot/quarterly-chart.R",
    outputDir: join(workspace, "pivot-chart"),
    inputs: [
      {
        name: "transactions",
        path: join(repositoryRoot(), "examples", "pivot", "transactions.csv"),
      },
    ],
    frame: FRAME,
  });

  const output = result.outputs[0];
  assert.equal(output?.type, "svg");
  assert.ok(output?.type === "svg");
  assert.equal(output.elements.length, 16, "four regions by four quarters");
  assert.ok(output.elements.includes("south-q4"));

  // The sentinel is an implementation detail of the program and must not survive into the film:
  // a leftover one is a bar drawn in pure red. The program refuses rather than shipping it, and
  // this is the check that the refusal never has to fire.
  const markup = await readFile(output.path, "utf8");
  assert.ok(
    !markup.includes("rgb(100%, 0%,"),
    "a tagged element was left as its sentinel",
  );
  assert.match(markup, /data-cuecraft="west-q1" fill="/);
});

async function failing(request: Parameters<typeof runR>[0]): Promise<RError> {
  try {
    await runR(request);
  } catch (error) {
    assert.ok(error instanceof RError, `expected an RError, got ${String(error)}`);
    return error;
  }
  throw new assert.AssertionError({ message: `expected ${request.label} to fail` });
}
