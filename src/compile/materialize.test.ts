import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { RRequest, RResult } from "../compute/r.ts";
import { RError } from "../compute/r.ts";
import { parsePresentation, type Presentation } from "../presentation/parse.ts";
import {
  exhibitFrame,
  exhibitSlug,
  hasExhibits,
  materializePresentation,
  MaterializeError,
} from "./materialize.ts";

/**
 * The stage, without R.
 *
 * The runner is injected, so what is under test here is cuecraft's own half: which slides are
 * picked up, what the program is told, how many pictures a slide may have, and whether a failure
 * arrives naming the slide the author wrote. `../compute/r.live-test.ts` runs the other half.
 */

const workspaces: string[] = [];

async function scratch(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "cuecraft-materialize-"));
  workspaces.push(path);
  return path;
}

after(async () => {
  for (const path of workspaces) await rm(path, { recursive: true, force: true });
});

const PROGRAM = 'cat("#cuecraft output png chart chart.png\\n")\n';

function deck(exhibit: string): Presentation {
  return parsePresentation(
    [
      "title: T",
      "slides:",
      "  - slide:",
      "      title: Before",
      '    say: "One."',
      "  - slide:",
      "      title: A chart",
      ...exhibit.split("\n").map((line) => `      ${line}`),
      '    say: "Two."',
    ].join("\n"),
    "deck.yaml",
    {
      read: (file) => {
        if (file === "chart.R") return PROGRAM;
        throw new Error(`file ${JSON.stringify(file)} does not exist in the repository`);
      },
    },
  );
}

/** A runner that returns whatever the test says the program declared. */
function runner(
  outputs: readonly { name: string; file: string; width?: number; height?: number }[],
  seen?: RRequest[],
): (request: RRequest) => Promise<RResult> {
  return async (request) => {
    seen?.push(request);
    await mkdir(request.outputDir, { recursive: true });
    return {
      outputs: outputs.map((output) => ({
        name: output.name,
        type: "png" as const,
        file: output.file,
        path: join(request.outputDir, output.file),
        bytes: 4096,
        width: output.width ?? 3312,
        height: output.height ?? 1328,
      })),
      notes: "",
      stderr: "",
      elapsedSeconds: 0.4,
    };
  };
}

async function repoWith(files: Record<string, string>): Promise<string> {
  const root = await scratch();
  for (const [name, content] of Object.entries(files)) {
    await mkdir(join(root, name, ".."), { recursive: true });
    await writeFile(join(root, name), content);
  }
  return root;
}

test("only the exhibit slides are run, and the rest come through untouched", async () => {
  const root = await repoWith({ "data.csv": "a,b\n1,2\n" });
  const seen: RRequest[] = [];

  const { presentation, exhibits } = await materializePresentation(
    deck("exhibit:\n  run: chart.R\n  with:\n    sales: data.csv"),
    {
      workspace: join(await scratch(), "work"),
      root,
      run: runner([{ name: "chart", file: "chart.png" }], seen),
    },
  );

  assert.equal(seen.length, 1);
  assert.equal(exhibits.length, 1);
  assert.equal(exhibits[0]?.ordinal, 2);

  assert.equal(presentation.slides[0]?.body.kind, "none");
  const body = presentation.slides[1]?.body;
  assert.equal(body?.kind, "exhibit");
  assert.deepEqual(body?.kind === "exhibit" ? body.resource : undefined, {
    src: "exhibits/slide-02-chart/chart.png",
    name: "chart",
    width: 3312,
    height: 1328,
    bytes: 4096,
  });
});

test("the program is handed its source, its inputs resolved, and the box", async () => {
  const root = await repoWith({ "examples/data.csv": "a\n1\n" });
  const seen: RRequest[] = [];

  await materializePresentation(
    deck("exhibit:\n  run: chart.R\n  with:\n    sales: examples/data.csv"),
    {
      workspace: join(await scratch(), "work"),
      root,
      run: runner([{ name: "chart", file: "chart.png" }], seen),
    },
  );

  const request = seen[0];
  assert.equal(request?.source, PROGRAM);
  assert.equal(request?.label, "chart.R");
  // Realpath'd, because containment is decided on the real path — on macOS the temp root is
  // reached through a symlink, and comparing the literal strings would be wrong in both directions.
  assert.deepEqual(request?.inputs, [
    { name: "sales", path: join(realpathSync(root), "examples", "data.csv") },
  ]);
  // Every exhibit in every deck gets the same frame: it is a property of the composition, not of
  // the content, and there is no key that could vary it.
  assert.deepEqual(request?.frame, exhibitFrame());
});

test("an input that does not exist fails the stage, naming the slide and the file", async () => {
  const root = await repoWith({});
  const error = await failing(
    deck("exhibit:\n  run: chart.R\n  with:\n    sales: missing.csv"),
    root,
    runner([{ name: "chart", file: "chart.png" }]),
  );

  assert.equal(error.ordinal, 2);
  assert.match(error.report(), /slide 2/);
  assert.match(error.report(), /"sales"/);
  assert.match(error.report(), /"missing.csv" does not exist/);
});

test("an input that is a directory is refused rather than handed over", async () => {
  const root = await repoWith({});
  await mkdir(join(root, "data"), { recursive: true });
  const error = await failing(
    deck("exhibit:\n  run: chart.R\n  with:\n    sales: data"),
    root,
    runner([{ name: "chart", file: "chart.png" }]),
  );
  assert.match(error.report(), /is not a file/);
});

test("a program that declares nothing fails, because a slide needs a picture", async () => {
  const root = await repoWith({});
  const error = await failing(deck("exhibit:\n  run: chart.R"), root, runner([]));
  assert.match(error.report(), /declared no output/);
});

test("a program that declares several is refused, listing what it declared", async () => {
  const root = await repoWith({});
  const error = await failing(
    deck("exhibit:\n  run: chart.R"),
    root,
    runner([
      { name: "chart", file: "chart.png" },
      { name: "table", file: "table.png" },
    ]),
  );
  assert.match(error.report(), /declared 2 outputs \(chart, table\)/);
  assert.match(error.report(), /must declare exactly one/);
});

test("a failing program becomes a stage failure carrying R's own words", async () => {
  const root = await repoWith({});
  const error = await failing(deck("exhibit:\n  run: chart.R"), root, async () => {
    throw new RError("failed", "chart.R exited 1", {
      stderr: "Error: object 'revenu' not found",
      exitCode: 1,
    });
  });

  assert.match(error.report(), /slide 2: chart\.R exited 1/);
  assert.match(error.report(), /object 'revenu' not found/);
});

test("a deck with nothing to compute is not put through the stage at all", async () => {
  const root = await repoWith({});
  const plain = parsePresentation(
    ["title: T", "slides:", "  - slide:", "      title: A", '    say: "One."'].join("\n"),
    "deck.yaml",
  );
  assert.equal(hasExhibits(plain), false);
});

test("two slides running one program get directories of their own", () => {
  assert.equal(
    exhibitSlug(2, "examples/revenue/quarterly-revenue.R"),
    "slide-02-quarterly-revenue",
  );
  assert.equal(exhibitSlug(11, "chart.R"), "slide-11-chart");
  // Whatever a filesystem allows in a filename, a directory name here is one cuecraft chose.
  assert.equal(
    exhibitSlug(3, "reports/Q4 revenue (final).R"),
    "slide-03-Q4-revenue-final-",
  );
  // A program whose name survives none of that still gets a directory rather than none.
  assert.equal(exhibitSlug(4, "!!!.R"), "slide-04--");
});

async function failing(
  presentation: Presentation,
  root: string,
  run: (request: RRequest) => Promise<RResult>,
): Promise<MaterializeError> {
  try {
    await materializePresentation(presentation, {
      workspace: join(await scratch(), "work"),
      root,
      run,
    });
  } catch (error) {
    assert.ok(
      error instanceof MaterializeError,
      `expected a MaterializeError: ${String(error)}`,
    );
    return error;
  }
  throw new assert.AssertionError({ message: "expected materialization to fail" });
}
