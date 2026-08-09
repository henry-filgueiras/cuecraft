import assert from "node:assert/strict";
import test from "node:test";

import { readCsv } from "./csv.ts";

/**
 * What a CSV a foreign program wrote is allowed to be.
 *
 * The refusals matter more than the acceptances here. Every one of them is a program that *ran to
 * completion* and produced a file cuecraft would otherwise lay out as a table, and a table drawn
 * from a misread file is a slide that teaches something false while rendering perfectly — which is
 * the same argument decision:56 makes for a picture, applied to something with rows in it.
 */

test("a header and rows come back as strings, exactly as written", () => {
  const { table } = readCsv("region,q1,q2\nWest,1200,1310\nEast,980,1004\n");
  assert.deepEqual(table?.columns, ["region", "q1", "q2"]);
  assert.deepEqual(table?.rows, [
    ["West", "1200", "1310"],
    ["East", "980", "1004"],
  ]);
});

test("nothing is coerced: a number stays the text the program formatted", () => {
  const { table } = readCsv("n\n0007\n1,2\n");
  // The second row is two fields, not the number twelve hundred — which is also why that file is
  // refused below rather than repaired.
  assert.equal(table, undefined);
  const { table: kept } = readCsv("n\n0007\n0.50\n");
  assert.deepEqual(kept?.rows, [["0007"], ["0.50"]]);
});

test("a quoted field may hold a comma, a newline, and a quote", () => {
  const { table } = readCsv('a,b\n"one, two","he said ""no""\nagain"\n');
  assert.deepEqual(table?.rows, [["one, two", 'he said "no"\nagain']]);
});

test("a quote that is not the first character of a field is a literal quote", () => {
  const { table } = readCsv('a\n12" pipe\n');
  assert.deepEqual(table?.rows, [['12" pipe']]);
});

test("CRLF and a missing final newline are both ordinary", () => {
  const { table } = readCsv("a,b\r\n1,2\r\n3,4");
  assert.deepEqual(table?.rows, [
    ["1", "2"],
    ["3", "4"],
  ]);
});

test("an empty trailing field is a field, not a missing one", () => {
  const { table } = readCsv("a,b\n1,\n");
  assert.deepEqual(table?.rows, [["1", ""]]);
});

test("an empty file is refused", () => {
  assert.match(readCsv("").problem ?? "", /empty/);
});

test("a header with no rows is refused, and the header is quoted back", () => {
  const { problem } = readCsv("region,q1\n");
  assert.match(problem ?? "", /no rows/);
  assert.match(problem ?? "", /region, q1/);
});

test("a ragged row is refused, naming the row and both counts", () => {
  const { problem } = readCsv("a,b,c\n1,2,3\n4,5\n");
  assert.match(problem ?? "", /row 2 has 2 fields and the header has 3/);
});

test("a duplicate column name is refused", () => {
  assert.match(readCsv("a,b,a\n1,2,3\n").problem ?? "", /names "a" twice/);
});

test("a blank column name is refused, by position", () => {
  assert.match(readCsv("a,,c\n1,2,3\n").problem ?? "", /column 2 of the header/);
});

test("an unclosed quote is refused rather than swallowing the rest of the file", () => {
  assert.match(readCsv('a,b\n"one,two\n').problem ?? "", /never closed/);
});
