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
  regions: readonly string[] = [],
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
      regions: regions.map((name, index) => ({
        name,
        left: index * 0.25,
        top: 0.1,
        right: index * 0.25 + 0.2,
        bottom: 0.9,
      })),
      moments: [],
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
    kind: "picture",
    src: "exhibits/slide-02-chart/chart.png",
    name: "chart",
    regions: [],
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

/* ------------------------------------------ shows / regions (decision:57) */

test("what the slide shows and what the program drew are matched, in the slide's order", async () => {
  const { presentation } = await materializePresentation(
    deck("exhibit:\n  run: chart.R\n  shows: [b, a]"),
    {
      workspace: join(await scratch(), "work"),
      root: await repoWith({}),
      // Declared in the other order on purpose: the resource must come back in the slide's order,
      // because that is the order `bodyElements` published and every anchor index already means.
      run: runner([{ name: "chart", file: "chart.png" }], undefined, ["a", "b"]),
    },
  );

  const body = presentation.slides[1]?.body;
  assert.equal(body?.kind, "exhibit");
  const resource = body?.kind === "exhibit" ? body.resource : undefined;
  const regions = resource?.kind === "picture" ? resource.regions : undefined;
  assert.deepEqual(
    regions?.map((region) => region.name),
    ["b", "a"],
  );
  assert.equal(regions?.[0]?.top, 0.1);
});

test("an identity the program never drew fails the render", async () => {
  const error = await failing(
    deck("exhibit:\n  run: chart.R\n  shows: [asia-pacific]"),
    await repoWith({}),
    runner([{ name: "chart", file: "chart.png" }], undefined, []),
  );
  assert.match(error.report(), /disagree about what the picture shows/);
  assert.match(
    error.report(),
    /the slide shows "asia-pacific", which the program did not draw/,
  );
});

test("a region the slide never asked for also fails the render", async () => {
  // Both directions, because a program that has quietly renamed something is not a program that
  // has quietly added something — and a deck that tolerated the extra would be trusting whichever
  // names happened to match.
  const error = await failing(
    deck("exhibit:\n  run: chart.R\n  shows: [europe]"),
    await repoWith({}),
    runner([{ name: "chart", file: "chart.png" }], undefined, ["europe", "eurpoe"]),
  );
  assert.match(
    error.report(),
    /the program drew "eurpoe", which the slide does not show/,
  );
});

test("an exhibit that shows nothing is not asked about regions at all", async () => {
  const { presentation } = await materializePresentation(
    deck("exhibit:\n  run: chart.R"),
    {
      workspace: join(await scratch(), "work"),
      root: await repoWith({}),
      run: runner([{ name: "chart", file: "chart.png" }]),
    },
  );
  const body = presentation.slides[1]?.body;
  const shown = body?.kind === "exhibit" ? body.resource : undefined;
  assert.deepEqual(shown?.kind === "picture" ? shown.regions : undefined, []);
});

/* ------------------------------- what comes back that is not a picture */

/**
 * The two artifacts sprint:28 added, at the stage that turns them into something a slide can draw.
 *
 * Every refusal below is a program that **succeeded**. That is the whole reason they are refusals
 * rather than fallbacks: a table drawn from a key column that does not identify a row would render
 * perfectly and light the wrong line, which is the same failure mode decision:55 refuses for a
 * stale picture, one layer in.
 */

/** A runner that hands back a CSV, parsed, exactly as `resolveOutputs` would have. */
function tableRunner(
  columns: readonly string[],
  rows: readonly (readonly string[])[],
): (request: RRequest) => Promise<RResult> {
  return async (request) => {
    await mkdir(request.outputDir, { recursive: true });
    return {
      outputs: [
        {
          name: "summary",
          type: "csv" as const,
          file: "summary.csv",
          path: join(request.outputDir, "summary.csv"),
          bytes: 128,
          table: { columns, rows },
        },
      ],
      regions: [],
      moments: [],
      notes: "",
      stderr: "",
      elapsedSeconds: 0.1,
    };
  };
}

const SEGMENTS = [
  ["West", "10"],
  ["East", "20"],
] as const;

async function tableFailure(
  exhibit: string,
  run: (request: RRequest) => Promise<RResult>,
): Promise<MaterializeError> {
  try {
    await materializePresentation(deck(exhibit), {
      workspace: join(await scratch(), "work"),
      root: await repoWith({}),
      run,
    });
  } catch (error) {
    assert.ok(error instanceof MaterializeError, `expected a MaterializeError: ${error}`);
    return error;
  }
  throw new assert.AssertionError({ message: `expected a refusal for ${exhibit}` });
}

test("a CSV becomes a table whose rows and columns have identities", async () => {
  const { presentation } = await materializePresentation(
    deck("exhibit:\n  run: chart.R\n  key: region\n  shows: [row-west]"),
    {
      workspace: join(await scratch(), "work"),
      root: await repoWith({}),
      run: tableRunner(["region", "revenue"], SEGMENTS),
    },
  );

  const body = presentation.slides[1]?.body;
  const resource = body?.kind === "exhibit" ? body.resource : undefined;
  assert.equal(resource?.kind, "table");
  assert.ok(resource?.kind === "table");
  assert.deepEqual(resource.table.rowIds, ["row-west", "row-east"]);
  assert.deepEqual(resource.table.columnIds, ["column-region", "column-revenue"]);
  assert.equal(resource.table.keyColumn, 0);
});

test("the identity of a row survives punctuation in the cell that names it", async () => {
  const { presentation } = await materializePresentation(
    deck("exhibit:\n  run: chart.R\n  key: region\n  shows: [row-asia-pacific]"),
    {
      workspace: join(await scratch(), "work"),
      root: await repoWith({}),
      run: tableRunner(
        ["region", "revenue"],
        [
          ["Asia / Pacific", "10"],
          ["Latin America", "20"],
        ],
      ),
    },
  );
  const body = presentation.slides[1]?.body;
  const resource = body?.kind === "exhibit" ? body.resource : undefined;
  assert.deepEqual(resource?.kind === "table" ? resource.table.rowIds : undefined, [
    "row-asia-pacific",
    "row-latin-america",
  ]);
});

test("a table with no key says so, and lists the columns it could have used", async () => {
  const error = await tableFailure(
    "exhibit:\n  run: chart.R",
    tableRunner(["region", "revenue"], SEGMENTS),
  );
  assert.match(error.message, /does not say which column identifies a row/);
  assert.match(error.message, /"region", "revenue"/);
});

test("a key naming no column is refused, not guessed around", async () => {
  const error = await tableFailure(
    "exhibit:\n  run: chart.R\n  key: segment",
    tableRunner(["region", "revenue"], SEGMENTS),
  );
  assert.match(error.message, /key is "segment" and chart\.R wrote no such column/);
});

test("two rows that address as one name are refused, naming both", async () => {
  // The failure this prevents is the worst kind: the film renders, and the sentence about the
  // second one lights the first.
  const error = await tableFailure(
    "exhibit:\n  run: chart.R\n  key: region",
    tableRunner(
      ["region", "revenue"],
      [
        ["Asia Pacific", "10"],
        ["asia-pacific", "20"],
      ],
    ),
  );
  assert.match(error.message, /rows 1 and 2 both address as "row-asia-pacific"/);
});

test("a key cell with nothing nameable in it is refused", async () => {
  const error = await tableFailure(
    "exhibit:\n  run: chart.R\n  key: region",
    tableRunner(["region", "revenue"], [["—", "10"]]),
  );
  assert.match(error.message, /nothing in it can be a name/);
});

test("a row the deck shows and the data does not generate is refused", async () => {
  const error = await tableFailure(
    "exhibit:\n  run: chart.R\n  key: region\n  shows: [row-north]",
    tableRunner(["region", "revenue"], SEGMENTS),
  );
  assert.match(error.message, /shows "row-north", which is not in the table/);
  assert.match(error.message, /Rows address as "row-west", "row-east"/);
});

test("a row the deck does not show is not a mismatch, because rows come from data", async () => {
  // The asymmetry with a picture's regions, asserted directly: two rows exist, the deck talks
  // about one, and that is a deck rather than a drift.
  const { exhibits } = await materializePresentation(
    deck("exhibit:\n  run: chart.R\n  key: region\n  shows: [row-west]"),
    {
      workspace: join(await scratch(), "work"),
      root: await repoWith({}),
      run: tableRunner(["region", "revenue"], SEGMENTS),
    },
  );
  assert.equal(exhibits.length, 1);
});

test("a table past the row ceiling is refused rather than drawn unreadably", async () => {
  const many = Array.from({ length: 201 }, (_, index) => [`r${index}`, "1"] as const);
  const error = await tableFailure(
    "exhibit:\n  run: chart.R\n  key: region",
    tableRunner(["region", "revenue"], many),
  );
  assert.match(error.message, /wrote 201 rows and cuecraft draws at most 200/);
});

test("a table past the column ceiling is refused, with the reason", async () => {
  const columns = Array.from({ length: 9 }, (_, index) => `c${index}`);
  const error = await tableFailure(
    "exhibit:\n  run: chart.R\n  key: c0",
    tableRunner(columns, [columns.map((_, index) => String(index))]),
  );
  assert.match(error.message, /wrote 9 columns and cuecraft draws at most 8/);
  assert.match(error.message, /too narrow to hold a value/);
});

test("an SVG becomes a drawing carrying its markup and every name in it", async () => {
  const markup = '<svg viewBox="0 0 400 200"><path data-cuecraft="west"/></svg>';
  const root = await repoWith({});
  const { presentation } = await materializePresentation(
    deck("exhibit:\n  run: chart.R\n  shows: [west]"),
    {
      workspace: join(await scratch(), "work"),
      root,
      run: async (request) => {
        await mkdir(request.outputDir, { recursive: true });
        await writeFile(join(request.outputDir, "chart.svg"), markup);
        return {
          outputs: [
            {
              name: "chart",
              type: "svg" as const,
              file: "chart.svg",
              path: join(request.outputDir, "chart.svg"),
              bytes: markup.length,
              width: 400,
              height: 200,
              elements: ["west", "east"],
            },
          ],
          regions: [],
          moments: [],
          notes: "",
          stderr: "",
          elapsedSeconds: 0.1,
        };
      },
    },
  );

  const body = presentation.slides[1]?.body;
  const resource = body?.kind === "exhibit" ? body.resource : undefined;
  assert.equal(resource?.kind, "drawing");
  assert.ok(resource?.kind === "drawing");
  // What narration can reach is what the slide declared; what recedes around it is everything the
  // program named. The two lists are different questions — see the resource's own note.
  assert.deepEqual(resource.elements, ["west"]);
  assert.deepEqual(resource.tagged, ["west", "east"]);
  assert.equal(resource.markup, markup);
});
