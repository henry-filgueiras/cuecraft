import assert from "node:assert/strict";
import { test } from "node:test";

import {
  markProblem,
  matchingLines,
  resolveMarkSpans,
  specimenLines,
} from "./specimen.ts";

/**
 * The rule these tests are pinning is "a mark names a line by what it says, and covers the block
 * that line opens". Everything here is a case where getting that wrong would produce a video
 * that emphasises the wrong region while looking entirely correct — which is the failure mode
 * worth spending tests on.
 */

const SPECIMEN = `slide:
  title: "Coding agents are black boxes"
  bullets:
    - id: tools
      text: Run tools

say:
  - "Agents do a lot of invisible work."
  - speech: "They read, search, and run tools."
    activates: tools`;

const LINES = specimenLines(SPECIMEN);

test("the displayed lines keep interior structure and lose only the edges", () => {
  assert.equal(LINES.length, 10);
  assert.equal(LINES[0], "slide:");
  assert.equal(
    LINES[5],
    "",
    "a blank line inside the specimen is the author separating parts",
  );
  assert.equal(LINES[9], "    activates: tools");
});

test("leading and trailing blank lines are dropped, indentation is not", () => {
  const lines = specimenLines("\n\n  a:\n    b: 1\n\n\n");
  assert.deepEqual(lines, ["  a:", "    b: 1"]);
});

test("trailing whitespace is removed but nothing else is touched", () => {
  assert.deepEqual(specimenLines("a:   \n  b:\t\n"), ["a:", "  b:"]);
});

test("an empty specimen is empty rather than one blank line", () => {
  assert.deepEqual(specimenLines(""), []);
  assert.deepEqual(specimenLines("\n  \n"), []);
});

test("carriage returns do not become visible characters", () => {
  assert.deepEqual(specimenLines("a:\r\n  b: 1\r\n"), ["a:", "  b: 1"]);
});

test("matching is exact and case-sensitive, because this is code", () => {
  assert.deepEqual(matchingLines(LINES, "say:"), [6]);
  assert.deepEqual(matchingLines(LINES, "Say:"), []);
  assert.deepEqual(matchingLines(LINES, "activates:"), [9]);
});

test("a mark covers the line it names and everything indented beneath it", () => {
  const spans = resolveMarkSpans(LINES, [
    { id: "slide", line: "slide:" },
    { id: "say", line: "say:" },
  ]);
  assert.deepEqual(spans, [
    { id: "slide", from: 0, to: 4 },
    { id: "say", from: 6, to: 9 },
  ]);
});

test("a blank line inside a block does not end it, but one before a sibling does", () => {
  const lines = specimenLines(`a:
  one: 1

  two: 2

b: 3`);
  const [span] = resolveMarkSpans(lines, [{ id: "a", line: "a:" }]);
  assert.deepEqual(span, { id: "a", from: 0, to: 3 });
});

test("a leaf line covers only itself", () => {
  const spans = resolveMarkSpans(LINES, [{ id: "link", line: "activates:" }]);
  assert.deepEqual(spans, [{ id: "link", from: 9, to: 9 }]);
});

test("marks may nest, because both regions are things narration can reach", () => {
  const spans = resolveMarkSpans(LINES, [
    { id: "say", line: "say:" },
    { id: "link", line: "activates:" },
  ]);
  assert.deepEqual(spans, [
    { id: "say", from: 6, to: 9 },
    { id: "link", from: 9, to: 9 },
  ]);
});

test("the last block in a specimen runs to the end", () => {
  const [span] = resolveMarkSpans(LINES, [{ id: "say", line: "say:" }]);
  assert.equal(span?.to, LINES.length - 1);
});

test("a mark that matches nothing is reported, naming what was looked for", () => {
  const problem = markProblem(LINES, { id: "nope", line: "instructions:" });
  assert.match(problem ?? "", /"instructions:" does not appear/);
});

test("an ambiguous mark is reported with every line it hit", () => {
  const problem = markProblem(LINES, { id: "tools", line: "tools" });
  assert.match(problem ?? "", /matches 4 lines/);
  assert.match(
    problem ?? "",
    /\(4, 5, 9, 10\)/,
    "line numbers are 1-based for the author",
  );
});

test("a mark that resolves has no problem", () => {
  assert.equal(markProblem(LINES, { id: "say", line: "say:" }), undefined);
});

test("unresolvable marks are dropped at render time rather than throwing", () => {
  const spans = resolveMarkSpans(LINES, [
    { id: "ghost", line: "nowhere" },
    { id: "many", line: "tools" },
    { id: "real", line: "slide:" },
  ]);
  assert.deepEqual(spans, [{ id: "real", from: 0, to: 4 }]);
});

test("resolution is deterministic and preserves authored order", () => {
  const marks = [
    { id: "say", line: "say:" },
    { id: "slide", line: "slide:" },
  ];
  assert.deepEqual(resolveMarkSpans(LINES, marks), resolveMarkSpans(LINES, marks));
  assert.deepEqual(
    resolveMarkSpans(LINES, marks).map((span) => span.id),
    ["say", "slide"],
  );
});
