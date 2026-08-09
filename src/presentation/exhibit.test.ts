import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePresentation, PresentationError } from "./parse.ts";
import { columnId, pathProblem, resolveExhibit, rowId } from "./exhibit.ts";

/**
 * What a deck may say about a computation, and everything it may not.
 *
 * The refusals are the feature. An `exhibit:` that accepted a little more — an image path, an
 * output filename, a size — would be the escape hatch turning into an authoring surface, which is
 * the failure the whole round is defending against.
 */

const PROGRAM = 'cat("#cuecraft output png chart chart.png\\n")\n';

function reader(files: Record<string, string>) {
  return (file: string): string => {
    const text = files[file];
    if (text === undefined) {
      throw new Error(`file ${JSON.stringify(file)} does not exist in the repository`);
    }
    return text;
  };
}

const read = reader({ "examples/revenue/quarterly-revenue.R": PROGRAM });

test("an exhibit names a program and its inputs, and the program is read at parse time", () => {
  const { exhibit, issues } = resolveExhibit(
    {
      run: "examples/revenue/quarterly-revenue.R",
      with: { transactions: "examples/revenue/transactions.csv" },
    },
    read,
  );

  assert.deepEqual(issues, []);
  assert.equal(exhibit?.program, "examples/revenue/quarterly-revenue.R");
  // Read now rather than at run time, exactly as a quoted specimen is: a program that has moved
  // should fail the deck before a second of narration is synthesized.
  assert.equal(exhibit?.source, PROGRAM);
  assert.deepEqual(exhibit?.inputs, [
    { name: "transactions", file: "examples/revenue/transactions.csv" },
  ]);
});

test("inputs are optional; a program that needs none is a whole exhibit", () => {
  const { exhibit, issues } = resolveExhibit(
    { run: "examples/revenue/quarterly-revenue.R" },
    read,
  );
  assert.deepEqual(issues, []);
  assert.deepEqual(exhibit?.inputs, []);
});

test("an exhibit has two keys, and a third is a typo rather than an extension", () => {
  const { issues } = resolveExhibit(
    { run: "examples/revenue/quarterly-revenue.R", image: "chart.png" },
    read,
  );
  assert.equal(issues.length, 1);
  assert.match(issues[0]?.message ?? "", /unknown key "image"/);
  assert.match(issues[0]?.message ?? "", /allowed: run, with/);
});

test("a program cuecraft cannot run is refused by extension", () => {
  const { issues } = resolveExhibit({ run: "examples/revenue/chart.py" }, read);
  assert.match(issues[0]?.message ?? "", /is not an R program/);
  assert.match(issues[0]?.message ?? "", /\.R, \.r/);
});

test("a missing program fails the deck rather than the render", () => {
  const { issues, exhibit } = resolveExhibit({ run: "examples/gone.R" }, read);
  assert.equal(exhibit, undefined);
  assert.match(issues[0]?.message ?? "", /does not exist in the repository/);
});

test("an empty program is refused", () => {
  const { issues } = resolveExhibit({ run: "blank.R" }, reader({ "blank.R": "   \n\n" }));
  assert.match(issues[0]?.message ?? "", /is empty/);
});

test("an input name has to survive becoming an environment variable", () => {
  for (const name of ["2025", "has space", "", "with.dot"]) {
    const { issues } = resolveExhibit(
      { run: "examples/revenue/quarterly-revenue.R", with: { [name]: "data.csv" } },
      read,
    );
    assert.match(issues[0]?.message ?? "", /is not a usable input name/, `for ${name}`);
  }
});

test("an input path that leaves the repository is refused at parse time", () => {
  for (const escape of [
    "../../etc/passwd",
    "/etc/passwd",
    "examples/../../secrets.csv",
  ]) {
    const { issues } = resolveExhibit(
      { run: "examples/revenue/quarterly-revenue.R", with: { data: escape } },
      read,
    );
    assert.equal(issues.length, 1, `for ${escape}`);
    assert.match(issues[0]?.message ?? "", /absolute|leaves the repository/);
  }
});

test("the path check refuses what it should and passes what it should", () => {
  assert.equal(pathProblem("examples/revenue/transactions.csv"), undefined);
  assert.match(pathProblem("") ?? "", /must name a file/);
  assert.match(pathProblem(42) ?? "", /must name a file/);
  assert.match(pathProblem("/tmp/x.csv") ?? "", /is absolute/);
  assert.match(pathProblem("a/../../b.csv") ?? "", /leaves the repository/);
  // A file whose name merely contains dots is not traversal.
  assert.equal(pathProblem("examples/revenue/2024..2025.csv"), undefined);
});

test("a deck reaches the exhibit body through the ordinary slide grammar", () => {
  const deck = parsePresentation(
    [
      "title: T",
      "slides:",
      "  - slide:",
      "      title: A chart",
      "      exhibit:",
      "        run: examples/revenue/quarterly-revenue.R",
      "        with:",
      "          transactions: examples/revenue/transactions.csv",
      '    say: "Here it is."',
    ].join("\n"),
    "deck.yaml",
    { read },
  );

  const body = deck.slides[0]?.body;
  assert.equal(body?.kind, "exhibit");
  // Nothing is materialized by parsing. The picture does not exist yet and the body says so.
  assert.equal(body?.kind === "exhibit" ? body.resource : "unset", undefined);
});

test("an exhibit cannot be an interior, in either spelling", () => {
  const inline = failure(() =>
    parsePresentation(
      [
        "title: T",
        "slides:",
        "  - slide:",
        "      title: A world",
        "      world:",
        "        entities:",
        "          chart:",
        "            label: The chart",
        "            detail:",
        "              exhibit:",
        "                run: examples/revenue/quarterly-revenue.R",
        "        relations: []",
        '    say: "Here it is."',
      ].join("\n"),
      "deck.yaml",
      { read },
    ),
  );
  assert.match(inline, /an exhibit cannot be an interior/);
  assert.match(inline, /drawn at concept scale/);

  // A file is what makes a world safe to nest (decision:31); it changes nothing here, because
  // what refuses an exhibit is the box it was drawn for and a file cannot change that.
  const module = failure(() =>
    parsePresentation(
      [
        "title: T",
        "slides:",
        "  - slide:",
        "      title: A world",
        "      world:",
        "        entities:",
        "          chart:",
        "            label: The chart",
        "            child: ./chart.yaml",
        "        relations: []",
        '    say: "Here it is."',
      ].join("\n"),
      "deck.yaml",
      {
        read: reader({
          "examples/revenue/quarterly-revenue.R": PROGRAM,
          "chart.yaml": [
            "exhibit:",
            "  run: examples/revenue/quarterly-revenue.R",
            'say: "Inside."',
          ].join("\n"),
        }),
      },
    ),
  );
  assert.match(module, /an exhibit cannot be an interior/);
});

test("a slide carries at most one body, and an exhibit is one of them", () => {
  const message = failure(() =>
    parsePresentation(
      [
        "title: T",
        "slides:",
        "  - slide:",
        "      title: Both",
        "      bullets: [a, b]",
        "      exhibit:",
        "        run: examples/revenue/quarterly-revenue.R",
        '    say: "Here it is."',
      ].join("\n"),
      "deck.yaml",
      { read },
    ),
  );
  assert.match(message, /"bullets" and "exhibit"/);
});

test("a slide declares the identities its picture will have", () => {
  const { exhibit, issues } = resolveExhibit(
    {
      run: "examples/revenue/quarterly-revenue.R",
      shows: ["north-america", "asia-pacific"],
    },
    read,
  );
  assert.deepEqual(issues, []);
  assert.deepEqual(exhibit?.shows, ["north-america", "asia-pacific"]);
});

test("an exhibit that shows nothing is still an exhibit", () => {
  const { exhibit } = resolveExhibit(
    { run: "examples/revenue/quarterly-revenue.R" },
    read,
  );
  assert.deepEqual(exhibit?.shows, []);
});

test("what a slide shows is checked the way an input name is", () => {
  for (const [shows, pattern] of [
    [["2025"], /is not a usable identity/],
    [["a", "a"], /duplicate identity "a"/],
    [[], /at least one identity, or be left out/],
    ["asia-pacific", /must be a list of identities/],
  ] as const) {
    const { issues } = resolveExhibit(
      { run: "examples/revenue/quarterly-revenue.R", shows },
      read,
    );
    assert.match(issues[0]?.message ?? "", pattern, JSON.stringify(shows));
  }
});

test("narration reaches what the slide shows, and nothing else", () => {
  const deck = parsePresentation(
    [
      "title: T",
      "slides:",
      "  - slide:",
      "      title: A chart",
      "      exhibit:",
      "        run: examples/revenue/quarterly-revenue.R",
      "        shows: [north-america, asia-pacific]",
      "    say:",
      '      - speech: "Asia Pacific doubles."',
      "        activates: asia-pacific",
    ].join("\n"),
    "deck.yaml",
    { read },
  );
  // Resolved at parse time, against names the program has not been asked for yet — which is the
  // whole reason `shows:` exists, and why materialization checks it against R on every render.
  const cue = deck.slides[0]?.say[0];
  assert.equal(cue?.kind, "speech");
  assert.equal(cue?.kind === "speech" ? cue.activates : undefined, "asia-pacific");
});

test("an exhibit declares nothing narration can reach beyond what it shows", () => {
  const message = failure(() =>
    parsePresentation(
      [
        "title: T",
        "slides:",
        "  - slide:",
        "      title: A chart",
        "      exhibit:",
        "        run: examples/revenue/quarterly-revenue.R",
        "        shows: [asia-pacific]",
        "    say:",
        '      - speech: "Look at the third bar."',
        "        activates: bar",
      ].join("\n"),
      "deck.yaml",
      { read },
    ),
  );
  // The refusal an author should get, and the boundary of decision:57: narration reaches what the
  // program will name and nothing finer. There is no coordinate an author could write instead.
  assert.match(message, /bar/);
  assert.match(message, /asia-pacific/);
});

function failure(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof PresentationError) return error.report();
    return (error as Error).message;
  }
  throw new assert.AssertionError({ message: "expected a failure" });
}

/* ------------------------------------------------- key, and the identities derived from it */

/**
 * The one key sprint:28 added, and the smallest thing it could be.
 *
 * `key:` names a column. It does not select, filter, order, or compute, and the tests below exist
 * as much to record that as to check it: the moment this accepts anything with an operator in it,
 * `activates:` has acquired a query language and decision:60's central refusal is gone.
 */

test("a key names the column a deck intends to address rows by", () => {
  const { exhibit, issues } = resolveExhibit(
    { run: "examples/revenue/quarterly-revenue.R", key: "account_id" },
    read,
  );
  assert.deepEqual(issues, []);
  assert.equal(exhibit?.key, "account_id");
});

test("a key is absent on an exhibit that never gets a table, and that is not an error", () => {
  const { exhibit, issues } = resolveExhibit(
    { run: "examples/revenue/quarterly-revenue.R" },
    read,
  );
  assert.deepEqual(issues, []);
  assert.equal(exhibit?.key, undefined);
  // Whether one was needed is a question for materialization, which is the first moment anybody
  // knows whether a table came back.
  assert.ok(!("key" in (exhibit ?? {})));
});

test("an empty key is refused rather than treated as absent", () => {
  const { issues } = resolveExhibit(
    { run: "examples/revenue/quarterly-revenue.R", key: "   " },
    read,
  );
  assert.deepEqual(issues, [
    { path: ["key"], message: "must name a column of the table the program will write" },
  ]);
});

test("an exhibit still takes four keys and no fifth", () => {
  const { issues } = resolveExhibit(
    { run: "examples/revenue/quarterly-revenue.R", columns: ["a", "b"] },
    read,
  );
  assert.equal(issues.length, 1);
  assert.match(issues[0]?.message ?? "", /unknown key "columns"/);
  assert.match(issues[0]?.message ?? "", /allowed: run, with, shows, key/);
});

test("a row identity is the key cell reduced to a name, and a column identity its header", () => {
  assert.equal(rowId("Asia Pacific"), "row-asia-pacific");
  assert.equal(rowId("West / Cirrus"), "row-west-cirrus");
  assert.equal(rowId("  2025 Q1  "), "row-2025-q1");
  assert.equal(columnId("Revenue (thousands)"), "column-revenue-thousands");
});

test("a cell with nothing nameable in it has no identity at all", () => {
  // Absent rather than `row-`, because a row that cannot be named is one narration would appear
  // to be able to reach and could not. Materialization turns this into a refusal.
  assert.equal(rowId("—"), undefined);
  assert.equal(rowId(""), undefined);
  assert.equal(columnId("!!"), undefined);
});
