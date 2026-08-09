import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import {
  DECLARATION_SHAPE,
  environmentFor,
  envName,
  pngSize,
  RError,
  resolveOutputs,
  resolveRegions,
  split,
} from "./r.ts";

/**
 * The half of the boundary that does not need R installed.
 *
 * Everything here is about what cuecraft does with what R said: which lines are protocol, which
 * are ordinary output, what the environment on the far side looks like, and whether a file that
 * claims to be a PNG is one. `./r.live-test.ts` runs the other half against a real interpreter.
 *
 * The split is the same one the model and the browser already have — `npm test` must stay runnable
 * on a machine that has bootstrapped nothing.
 */

const workspaces: string[] = [];

async function scratch(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "cuecraft-r-"));
  workspaces.push(path);
  return path;
}

after(async () => {
  for (const path of workspaces) await rm(path, { recursive: true, force: true });
});

/** A minimal but genuine PNG: signature, IHDR with the given size, and nothing else. */
function pngHeader(width: number, height: number): Buffer {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "latin1");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

test("protocol lines are separated from what the program printed", () => {
  const { declared, notes } = split(
    [
      "468 transactions, 4 regions",
      "#cuecraft output png chart chart.png",
      "still working",
      "",
    ].join("\n"),
  );

  assert.deepEqual(declared, ["#cuecraft output png chart chart.png"]);
  // The point of reserving a prefix rather than owning the whole stream: an R programmer's
  // `cat()` and `print()` keep working, and are kept for the failure report.
  assert.equal(notes, "468 transactions, 4 regions\nstill working");
});

test("a program that declares nothing still returns its output as notes", () => {
  const { declared, notes } = split("nothing to declare\n");
  assert.deepEqual(declared, []);
  assert.equal(notes, "nothing to declare");
});

test("an input name becomes an environment variable a shell can hold", () => {
  assert.equal(envName("transactions"), "TRANSACTIONS");
  assert.equal(envName("raw-events"), "RAW_EVENTS");
  assert.equal(envName("q4_2025"), "Q4_2025");
});

test("the environment names the output directory, every input, and the box", () => {
  const env = environmentFor(
    {
      inputs: [
        { name: "transactions", path: "/repo/examples/revenue/transactions.csv" },
        { name: "prior-year", path: "/repo/examples/revenue/2024.csv" },
      ],
      frame: {
        width: 3312,
        height: 1328,
        pointSize: 60,
        fps: 30,
        background: "#0A0D12",
        foreground: "#F5F7FB",
        muted: "#C2CBD9",
        accent: "#D9A05B",
      },
    },
    "/work/exhibits/slide-04",
  );

  assert.equal(env["CUECRAFT_OUTPUT_DIR"], "/work/exhibits/slide-04");
  assert.equal(env["CUECRAFT_INPUT_NAMES"], "transactions prior-year");
  assert.equal(
    env["CUECRAFT_INPUT_TRANSACTIONS"],
    "/repo/examples/revenue/transactions.csv",
  );
  assert.equal(env["CUECRAFT_INPUT_PRIOR_YEAR"], "/repo/examples/revenue/2024.csv");
  assert.equal(env["CUECRAFT_WIDTH"], "3312");
  assert.equal(env["CUECRAFT_POINTSIZE"], "60");
  assert.equal(env["CUECRAFT_FPS"], "30");
  assert.equal(env["CUECRAFT_ACCENT"], "#D9A05B");
});

test("a deck with no inputs still tells the program there are none", () => {
  const env = environmentFor({}, "/work/out");
  assert.equal(env["CUECRAFT_INPUT_NAMES"], "");
  // No frame means no frame keys, rather than empty ones a program would have to test for.
  assert.equal(env["CUECRAFT_WIDTH"], undefined);
});

test("a PNG's size is read from its header", async () => {
  const dir = await scratch();
  const path = join(dir, "chart.png");
  await writeFile(path, pngHeader(3312, 1328));
  assert.deepEqual(await pngSize(path), { width: 3312, height: 1328 });
});

test("a file that is not a PNG has no size, however it is named", async () => {
  const dir = await scratch();

  const lying = join(dir, "chart.png");
  await writeFile(lying, "this is a CSV somebody renamed\n");
  assert.equal(await pngSize(lying), undefined);

  const truncated = join(dir, "half.png");
  await writeFile(truncated, pngHeader(10, 10).subarray(0, 12));
  assert.equal(await pngSize(truncated), undefined);

  const empty = join(dir, "empty.png");
  await writeFile(empty, "");
  assert.equal(await pngSize(empty), undefined);
});

test("a PNG whose first chunk is not IHDR is refused", async () => {
  const dir = await scratch();
  const path = join(dir, "odd.png");
  const header = pngHeader(4, 4);
  header.write("iTXt", 12, "latin1");
  await writeFile(path, header);
  assert.equal(await pngSize(path), undefined);
});

test("an error carries what R said, under labels, without losing the message", () => {
  const error = new RError("failed", "chart.R exited 1", {
    stderr:
      "Error in aggregate.formula(...) : object 'revenu' not found\nExecution halted",
    stdout: "reading 468 rows",
    exitCode: 1,
  });

  const report = error.report();
  assert.match(report, /chart\.R exited 1/);
  assert.match(report, /R stderr:/);
  assert.match(report, /object 'revenu' not found/);
  assert.match(report, /R stdout:/);
  assert.equal(error.exitCode, 1);
  assert.equal(error.failure, "failed");
});

test("an error with nothing to add is just its message", () => {
  const error = new RError("missing", "Rscript is not on PATH");
  assert.equal(error.report(), "Rscript is not on PATH");
});

test("the declaration shape is quotable, because errors quote it", () => {
  assert.equal(DECLARATION_SHAPE, "#cuecraft output <type> <name> <file>");
});

/**
 * A run's output directory, with whatever the program is pretending to have written in it.
 *
 * Every refusal below is a program that *succeeded* and produced something cuecraft would
 * otherwise have put on a slide, which is why none of them has a fallback: a picture that is
 * silently the wrong one is the defect this whole mechanism exists to prevent.
 */
async function outputDirWith(files: Record<string, Buffer | string>): Promise<string> {
  const dir = join(await scratch(), "run");
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }
  return dir;
}

async function refusal(declared: readonly string[], outputDir: string): Promise<RError> {
  try {
    await resolveOutputs(declared, outputDir, "chart.R");
  } catch (error) {
    assert.ok(error instanceof RError, `expected an RError, got ${String(error)}`);
    assert.equal(error.failure, "protocol");
    return error;
  }
  throw new assert.AssertionError({
    message: `expected a refusal for ${declared.join(" | ")}`,
  });
}

test("a well-formed declaration resolves to the file it named", async () => {
  const dir = await outputDirWith({ "quarterly-revenue.png": pngHeader(3312, 1328) });
  const [output, ...rest] = await resolveOutputs(
    ["#cuecraft output png quarterly-revenue quarterly-revenue.png"],
    dir,
    "chart.R",
  );

  assert.equal(rest.length, 0);
  assert.deepEqual(
    { ...output, path: undefined },
    {
      name: "quarterly-revenue",
      type: "png",
      file: "quarterly-revenue.png",
      bytes: 24,
      width: 3312,
      height: 1328,
      path: undefined,
    },
  );
  assert.equal(output?.path, join(dir, "quarterly-revenue.png"));
});

test("a declared file may sit in a subdirectory of the output directory", async () => {
  const dir = await outputDirWith({});
  await mkdir(join(dir, "figures"));
  await writeFile(join(dir, "figures", "a.png"), pngHeader(8, 8));

  const [output] = await resolveOutputs(
    ["#cuecraft output png chart figures/a.png"],
    dir,
    "chart.R",
  );
  assert.equal(output?.file, "figures/a.png");
});

test("a filename with spaces survives the protocol", async () => {
  const dir = await outputDirWith({ "quarterly revenue 2025.png": pngHeader(100, 50) });
  const [output] = await resolveOutputs(
    ["#cuecraft output png chart quarterly revenue 2025.png"],
    dir,
    "chart.R",
  );
  assert.equal(output?.file, "quarterly revenue 2025.png");
  assert.equal(output?.type === "png" ? output.width : undefined, 100);
});

test("a malformed declaration is refused, and the shape is quoted back", async () => {
  const dir = await outputDirWith({ "chart.png": pngHeader(4, 4) });

  // A line whose verb IS `output` but whose fields are wrong. A line whose verb is not a verb at
  // all is a different mistake with a different message — see the mistyped-verb test below.
  for (const line of [
    "#cuecraft output png chart.png",
    "#cuecraft output png 4chart chart.png",
    "#cuecraft output png chart",
  ]) {
    const error = await refusal([line], dir);
    assert.match(error.message, /cannot read the output declaration/, line);
    assert.match(error.message, /#cuecraft output <type> <name> <file>/);
  }
});

test("a line that is not a declaration at all names both shapes", async () => {
  const dir = await outputDirWith({ "chart.png": pngHeader(4, 4) });
  for (const line of [
    "#cuecraft chart.png",
    "#cuecraft",
    "#cuecraft outputs png a a.png",
  ]) {
    const error = await refusal([line], dir);
    assert.match(error.message, /is not something cuecraft understands/, line);
  }
});

test("an output type cuecraft cannot take back is refused by name", async () => {
  const dir = await outputDirWith({ "chart.tiff": "II*\u0000" });
  const error = await refusal(["#cuecraft output tiff chart chart.tiff"], dir);
  assert.match(error.message, /has type "tiff"/);
  assert.match(error.message, /can take back png, svg, csv/);
});

test("a declared file outside the output directory is refused", async () => {
  const dir = await outputDirWith({ "chart.png": pngHeader(4, 4) });
  await writeFile(join(dir, "..", "elsewhere.png"), pngHeader(4, 4));

  for (const escape of ["../elsewhere.png", "figures/../../elsewhere.png", ".."]) {
    const error = await refusal([`#cuecraft output png chart ${escape}`], dir);
    assert.match(error.message, /resolves outside CUECRAFT_OUTPUT_DIR/);
  }
});

test("an absolute declared path is refused before it is resolved", async () => {
  const dir = await outputDirWith({ "chart.png": pngHeader(4, 4) });
  const error = await refusal(
    [`#cuecraft output png chart ${join(dir, "chart.png")}`],
    dir,
  );
  assert.match(error.message, /names the absolute path/);
});

test("a declared file that was never written is refused", async () => {
  const dir = await outputDirWith({});
  const error = await refusal(["#cuecraft output png chart chart.png"], dir);
  assert.match(error.message, /was declared but never written/);
});

test("a declared file that is a directory is refused", async () => {
  const dir = await outputDirWith({});
  await mkdir(join(dir, "chart.png"));
  const error = await refusal(["#cuecraft output png chart chart.png"], dir);
  assert.match(error.message, /is not a file/);
});

test("an empty declared file is refused before it is opened as an image", async () => {
  const dir = await outputDirWith({ "chart.png": "" });
  const error = await refusal(["#cuecraft output png chart chart.png"], dir);
  assert.match(error.message, /is empty/);
});

test("a declared PNG that is not one is refused", async () => {
  const dir = await outputDirWith({ "chart.png": "date,region,product,revenue\n" });
  const error = await refusal(["#cuecraft output png chart chart.png"], dir);
  assert.match(error.message, /is not a PNG/);
});

test("two outputs with one name are refused", async () => {
  const dir = await outputDirWith({
    "a.png": pngHeader(4, 4),
    "b.png": pngHeader(4, 4),
  });
  const error = await refusal(
    ["#cuecraft output png chart a.png", "#cuecraft output png chart b.png"],
    dir,
  );
  assert.match(error.message, /declared two outputs named "chart"/);
});

test("a refusal carries what the program said, so the program can be fixed", async () => {
  const dir = await outputDirWith({});
  try {
    await resolveOutputs(["#cuecraft output png chart chart.png"], dir, "chart.R", {
      stderr: "Warning message: NAs introduced by coercion",
      stdout: "468 transactions",
    });
    assert.fail("expected a refusal");
  } catch (error) {
    assert.ok(error instanceof RError);
    assert.match(error.report(), /NAs introduced by coercion/);
    assert.match(error.report(), /468 transactions/);
  }
});

/* ------------------------------------------------ regions (decision:57) */

test("a region is read as four fractions of the picture", () => {
  const regions = resolveRegions(
    [
      "#cuecraft output png chart chart.png",
      "#cuecraft region asia-pacific 0.5430 0.1377 0.7543 0.8192",
    ],
    "chart.R",
  );

  // The output line is walked past rather than choking it: both resolvers read the same list.
  assert.deepEqual(regions, [
    { name: "asia-pacific", left: 0.543, top: 0.1377, right: 0.7543, bottom: 0.8192 },
  ]);
});

test("a program that names nowhere declares no regions", () => {
  assert.deepEqual(
    resolveRegions(["#cuecraft output png chart chart.png"], "chart.R"),
    [],
  );
});

test("regions keep the order the program declared them in", () => {
  const regions = resolveRegions(
    [
      "#cuecraft region b 0.4 0 0.6 1",
      "#cuecraft region a 0.0 0 0.2 1",
      "#cuecraft region c 0.8 0 1.0 1",
    ],
    "chart.R",
  );
  assert.deepEqual(
    regions.map((region) => region.name),
    ["b", "a", "c"],
  );
});

test("a coordinate outside the picture is refused", async () => {
  for (const line of [
    "#cuecraft region r -0.1 0 0.5 1",
    "#cuecraft region r 0 0 1.4 1",
    "#cuecraft region r 0 0 0.5 1.0001",
  ]) {
    const error = regionRefusal([line]);
    assert.match(error.message, /outside the picture/, line);
  }
});

test("a coordinate that is not a number is refused", () => {
  const error = regionRefusal(["#cuecraft region r NaN 0 0.5 1"]);
  assert.match(error.message, /coordinate that is not a number/);
});

test("a region with no area is refused, in either direction", () => {
  for (const line of [
    "#cuecraft region r 0.6 0 0.4 1",
    "#cuecraft region r 0.4 0 0.4 1",
    "#cuecraft region r 0 0.9 1 0.2",
  ]) {
    assert.match(regionRefusal([line]).message, /has no area/, line);
  }
});

test("a malformed region quotes the shape back", () => {
  for (const line of [
    "#cuecraft region r 0 0 1",
    "#cuecraft region 0 0 1 1",
    "#cuecraft region r 0 0 1 1 1",
  ]) {
    const error = regionRefusal([line]);
    assert.match(error.message, /cannot read the region declaration/, line);
    assert.match(error.message, /#cuecraft region <name> <left> <top> <right> <bottom>/);
  }
});

test("two regions with one name are refused", () => {
  const error = regionRefusal([
    "#cuecraft region r 0 0 0.4 1",
    "#cuecraft region r 0.5 0 1 1",
  ]);
  assert.match(error.message, /declared two regions named "r"/);
});

test("a mistyped verb names both shapes, so the typo is visible", async () => {
  const dir = await outputDirWith({ "chart.png": pngHeader(4, 4) });
  const error = await refusal(["#cuecraft regions r 0 0 1 1"], dir);
  assert.match(error.message, /#cuecraft output <type> <name> <file>/);
  assert.match(error.message, /#cuecraft region <name>/);
});

function regionRefusal(declared: readonly string[]): RError {
  try {
    resolveRegions(declared, "chart.R");
  } catch (error) {
    assert.ok(error instanceof RError, `expected an RError, got ${String(error)}`);
    assert.equal(error.failure, "protocol");
    return error;
  }
  throw new assert.AssertionError({
    message: `expected a refusal for ${declared.join(" | ")}`,
  });
}

/**
 * The two formats sprint:28 added, at the boundary rather than in their readers.
 *
 * `./csv.test.ts` and `./svg.test.ts` say what a good file looks like. What is asserted here is
 * narrower and is the thing decision:56 actually promised: that adding a format was "a line in a
 * list plus a validator", and that **every refusal the first format had applies unchanged to the
 * other two**. A containment check that only guarded PNGs would be a hole shaped exactly like the
 * newest feature.
 */

const SVG = '<svg viewBox="0 0 400 200"><path data-cuecraft="west" d="M0 0"/></svg>';

test("a declared CSV comes back parsed, with its columns and rows", async () => {
  const dir = await outputDirWith({ "summary.csv": "region,q1\nWest,1200\nEast,980\n" });
  const [output] = await resolveOutputs(
    ["#cuecraft output csv summary summary.csv"],
    dir,
    "pivot.R",
  );
  assert.equal(output?.type, "csv");
  assert.deepEqual(output?.type === "csv" ? output.table.columns : undefined, [
    "region",
    "q1",
  ]);
  assert.equal(output?.type === "csv" ? output.table.rows.length : undefined, 2);
});

test("a declared SVG comes back with its dimensions and the names inside it", async () => {
  const dir = await outputDirWith({ "chart.svg": SVG });
  const [output] = await resolveOutputs(
    ["#cuecraft output svg chart chart.svg"],
    dir,
    "chart.R",
  );
  assert.equal(output?.type, "svg");
  assert.equal(output?.type === "svg" ? output.width : undefined, 400);
  assert.deepEqual(output?.type === "svg" ? output.elements : undefined, ["west"]);
});

test("a CSV that is not one is refused, naming the file and the reason", async () => {
  const dir = await outputDirWith({ "summary.csv": "region,q1\n" });
  const error = await refusal(["#cuecraft output csv summary summary.csv"], dir);
  assert.match(error.message, /is not a CSV cuecraft can take/);
  assert.match(error.message, /"summary\.csv"/);
  assert.match(error.message, /no rows/);
});

test("an SVG that is not one is refused, naming the file and the reason", async () => {
  const dir = await outputDirWith({ "chart.svg": "not markup" });
  const error = await refusal(["#cuecraft output svg chart chart.svg"], dir);
  assert.match(error.message, /is not an SVG cuecraft can take/);
  assert.match(error.message, /no <svg> root/);
});

test("an empty CSV and an empty SVG are refused as empty, before being parsed", async () => {
  for (const [type, file] of [
    ["csv", "summary.csv"],
    ["svg", "chart.svg"],
  ] as const) {
    const dir = await outputDirWith({ [file]: "" });
    const error = await refusal([`#cuecraft output ${type} out ${file}`], dir);
    assert.match(error.message, /is empty/, type);
  }
});

test("a CSV and an SVG declared outside the output directory are refused", async () => {
  for (const [type, file] of [
    ["csv", "summary.csv"],
    ["svg", "chart.svg"],
  ] as const) {
    const dir = await outputDirWith({ [file]: SVG });
    await writeFile(join(dir, "..", file), SVG);
    const error = await refusal([`#cuecraft output ${type} out ../${file}`], dir);
    assert.match(error.message, /resolves outside CUECRAFT_OUTPUT_DIR/, type);
  }
});

test("a CSV and an SVG that were declared and never written are refused", async () => {
  for (const type of ["csv", "svg"] as const) {
    const dir = await outputDirWith({});
    const error = await refusal([`#cuecraft output ${type} out missing.${type}`], dir);
    assert.match(error.message, /was declared but never written/, type);
  }
});
