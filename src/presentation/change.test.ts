import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveChange, type ChangeRow } from "./change.ts";

/**
 * What the compiler works out about a change, so that no deck ever has to say it.
 *
 * The property under test throughout is that nothing here is annotated: given two states, the
 * kept lines, the removed lines, the added lines and the rows they occupy all fall out.
 */

function shape(rows: readonly ChangeRow[]): string[] {
  return rows.map((row) =>
    row.kind === "kept"
      ? `= ${row.text}`
      : `~ ${row.removed ?? ""} -> ${row.added ?? ""}`,
  );
}

test("unchanged lines are context and changed ones are a swap", () => {
  const derived = deriveChange("a\nb\nc\n", "a\nB\nc\n");
  assert.deepEqual(shape(derived.rows), ["= a", "~ b -> B", "= c"]);
  assert.deepEqual(derived.changedRows, [1]);
});

test("two states that differ nowhere produce no changed rows", () => {
  const derived = deriveChange("a\nb\n", "a\nb\n");
  assert.deepEqual(derived.changedRows, []);
  assert.deepEqual(shape(derived.rows), ["= a", "= b"]);
});

test("a hunk is as tall as its taller side, so nothing around it moves", () => {
  // One line becoming two: the row count grows by one, and both new lines sit in the hunk.
  const derived = deriveChange("a\nx\nz\n", "a\nx1\nx2\nz\n");
  assert.deepEqual(shape(derived.rows), ["= a", "~ x -> x1", "~  -> x2", "= z"]);
  assert.deepEqual(derived.changedRows, [1, 2]);
});

test("a pure deletion leaves the added half of its rows empty", () => {
  const derived = deriveChange("a\ngone\nb\n", "a\nb\n");
  assert.deepEqual(shape(derived.rows), ["= a", "~ gone -> ", "= b"]);
});

test("a pure insertion leaves the removed half of its rows empty", () => {
  const derived = deriveChange("a\nb\n", "a\nnew\nb\n");
  assert.deepEqual(shape(derived.rows), ["= a", "~  -> new", "= b"]);
});

test("several hunks stay separate, with their context between them", () => {
  const derived = deriveChange("1\nA\n3\nB\n5\n", "1\na\n3\nb\n5\n");
  assert.deepEqual(shape(derived.rows), ["= 1", "~ A -> a", "= 3", "~ B -> b", "= 5"]);
  assert.deepEqual(derived.changedRows, [1, 3]);
});

test("indentation is content, and a re-indented line is a change", () => {
  const derived = deriveChange("say:\n  - one\n", "say:\n    - one\n");
  assert.deepEqual(derived.changedRows, [1]);
});

test("the states are trimmed the way a specimen is, so surrounding blank lines are not a change", () => {
  const derived = deriveChange("\n\na\nb\n\n", "a\nb");
  assert.deepEqual(derived.changedRows, []);
});

test("interior blank lines are kept, because an author put them there", () => {
  const derived = deriveChange("a\n\nb\n", "a\n\nb\n");
  assert.deepEqual(shape(derived.rows), ["= a", "= ", "= b"]);
});

test("the longest line accounts for both states, so sizing never clips the one arriving", () => {
  const derived = deriveChange("short\n", "a much longer line than that\n");
  assert.equal(derived.longestLine, "a much longer line than that".length);
});
