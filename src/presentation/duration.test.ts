import assert from "node:assert/strict";
import { test } from "node:test";

import { formatTimecode, isDurationLiteral, parseDurationMs } from "./duration.ts";

test("durations carry their unit", () => {
  assert.equal(parseDurationMs("750ms"), 750);
  assert.equal(parseDurationMs("1200ms"), 1200);
  assert.equal(parseDurationMs("2s"), 2000);
  assert.equal(parseDurationMs("1.5s"), 1500);
  assert.equal(parseDurationMs("0.25s"), 250);
  assert.equal(parseDurationMs("0ms"), 0);
});

test("surrounding whitespace is not an author error", () => {
  assert.equal(parseDurationMs("  750ms  "), 750);
  assert.ok(isDurationLiteral(" 2s "));
});

test("unitless, negative, and nonsense values are rejected", () => {
  for (const value of [
    "750", // milliseconds? seconds? frames? — refuse to guess
    "-1s",
    "1 s",
    "1sec",
    "1.s",
    "s",
    "",
    "1m",
    "NaN",
  ]) {
    assert.equal(
      isDurationLiteral(value),
      false,
      `${JSON.stringify(value)} was accepted`,
    );
    assert.throws(() => parseDurationMs(value), RangeError);
  }
});

test("timecodes read as mm:ss.s", () => {
  assert.equal(formatTimecode(0), "00:00.0");
  assert.equal(formatTimecode(9400), "00:09.4");
  assert.equal(formatTimecode(17_400), "00:17.4");
  assert.equal(formatTimecode(63_250), "01:03.3");
  assert.equal(formatTimecode(600_000), "10:00.0");
});
