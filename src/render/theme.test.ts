import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CODE,
  COLORS,
  fitHeading,
  fitSpecimen,
  fitTerm,
  headingLines,
  mix,
  TYPE,
} from "./theme.ts";

/**
 * Sizing is derived from content, which is the whole reason authors never set it. That makes
 * these rules ordinary functions with ordinary failure modes — a specimen that overflows the
 * frame, a heading whose second line is not accounted for — and worth pinning here rather than
 * discovering in a render.
 */

const BOX = { width: 1622, height: 644 };

test("a specimen never exceeds its box in either direction", () => {
  for (const lines of [1, 5, 10, 24, 60]) {
    for (const longest of [10, 46, 90, 200]) {
      const size = fitSpecimen(lines, longest, BOX);
      // The floor wins over fitting when a specimen is genuinely too big for the frame, and
      // that is deliberate: silently setting code at 9px would be worse than overflowing
      // visibly. Only check the fit where the size was not clamped.
      if (size > CODE.minSize) {
        assert.ok(
          lines * size * CODE.lineHeight <= BOX.height + 1,
          `${lines} lines at ${size}px overflows vertically`,
        );
        assert.ok(
          longest * size * CODE.charWidth <= BOX.width + 1,
          `${longest} columns at ${size}px overflows horizontally`,
        );
      }
    }
  }
});

test("a specimen is never set smaller than presentation scale, or larger than the cap", () => {
  assert.equal(
    fitSpecimen(1, 1, BOX),
    CODE.maxSize,
    "a tiny specimen still stops at the cap",
  );
  assert.equal(
    fitSpecimen(400, 400, BOX),
    CODE.minSize,
    "and an enormous one stops at the floor",
  );
});

test("the self-demo's two specimens are set at readable sizes", () => {
  // Ten lines of 46 columns, and nine of 49 — the two blocks in examples/cuecraft.yaml.
  assert.ok(fitSpecimen(10, 46, BOX) >= 38);
  assert.ok(fitSpecimen(9, 49, BOX) >= 38);
});

test("a heading that wraps is known to wrap", () => {
  const short = "One slide, in full";
  assert.equal(headingLines(short.length, fitHeading(short.length, TYPE.title), 1500), 1);

  const long = "Author relationships. Derive mechanics.";
  assert.equal(
    headingLines(long.length, fitHeading(long.length, TYPE.title), 1500),
    2,
    "the close slide's title takes two lines, and the specimen under it has to know",
  );
});

test("heading line counts are at least one, for any input", () => {
  for (const length of [0, 1, 400]) {
    for (const size of [1, 104, 400]) {
      assert.ok(headingLines(length, size, 1500) >= 1);
    }
  }
});

test("headings step down as they lengthen, and never up", () => {
  let previous = Number.POSITIVE_INFINITY;
  for (let length = 1; length <= 120; length += 1) {
    const size = fitHeading(length, TYPE.title);
    assert.ok(size <= previous, `heading grew at length ${length}`);
    previous = size;
  }
});

test("a matrix of four terms is set larger than a matrix of six", () => {
  assert.ok(fitTerm(4) > fitTerm(6));
  assert.equal(fitTerm(6), TYPE.term);
  assert.equal(
    fitTerm(2),
    fitTerm(4),
    "the threshold is the row count, not the item count",
  );
});

test("mixing colours returns the endpoints exactly", () => {
  assert.equal(mix(COLORS.accent, COLORS.flare, 0), COLORS.accent.toLowerCase());
  assert.equal(mix(COLORS.accent, COLORS.flare, 1), COLORS.flare.toLowerCase());
});

test("mixing clamps rather than extrapolating past the palette", () => {
  assert.equal(mix(COLORS.dormant, COLORS.paper, -5), COLORS.dormant.toLowerCase());
  assert.equal(mix(COLORS.dormant, COLORS.paper, 5), COLORS.paper.toLowerCase());
});

test("a mix is always a six-digit hex colour", () => {
  for (let step = 0; step <= 10; step += 1) {
    const blended = mix("#000000", "#ffffff", step / 10);
    assert.match(blended, /^#[0-9a-f]{6}$/);
  }
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
});
