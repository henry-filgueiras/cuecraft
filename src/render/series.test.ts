import assert from "node:assert/strict";
import { test } from "node:test";

import { cellSize, fieldShape, memberFill, membersDone } from "./series.ts";

/**
 * Where a population sits, and how much of it has happened.
 *
 * The property under test throughout is that one rule handles every count. A field that is
 * eight-by-eight because somebody wrote `if (total === 64)` would look identical on the artifact
 * this was built for and be worthless as a language addition, so the cases here are chosen to be
 * awkward rather than representative: a prime, a perfect square, a rectangle, the degenerate one,
 * and the ceiling.
 */

test("a perfect square is drawn as one", () => {
  assert.deepEqual(fieldShape(64), { columns: 8, rows: 8 });
  assert.deepEqual(fieldShape(16), { columns: 4, rows: 4 });
});

test("a rectangle with no holes beats a squarer one with holes", () => {
  // 48 is 8x6 exactly. 7x7 would be closer to square and would leave one cell empty, and a
  // ragged last row is what stops a field being countable at a glance.
  assert.deepEqual(fieldShape(48), { columns: 8, rows: 6 });
  assert.deepEqual(fieldShape(90), { columns: 10, rows: 9 });
});

test("a prime cannot be exact, and does not become a strip", () => {
  const seven = fieldShape(7);
  assert.ok(
    seven.columns > 1 && seven.rows > 1,
    "a prime must not be laid out in one line",
  );
  assert.ok(seven.columns * seven.rows >= 7);
  assert.ok(seven.columns * seven.rows - 7 <= 2, "and must not waste much to avoid it");
});

test("one member is one cell", () => {
  assert.deepEqual(fieldShape(1), { columns: 1, rows: 1 });
});

test("every arrangement holds its population, and is wider than it is tall", () => {
  for (let total = 1; total <= 200; total += 1) {
    const { columns, rows } = fieldShape(total);
    assert.ok(columns * rows >= total, `${total} does not fit in ${columns}x${rows}`);
    assert.ok(columns >= rows, `${total} came out taller than wide`);
    // Never a row of holes: an arrangement with a whole empty row had too many rows.
    assert.ok(
      columns * (rows - 1) < total,
      `${total} wastes a whole row at ${columns}x${rows}`,
    );
  }
});

test("the arrangement is deterministic", () => {
  for (const total of [1, 7, 16, 48, 64, 90, 512]) {
    assert.deepEqual(fieldShape(total), fieldShape(total));
  }
});

test("the arrangement comes from the count, and the size from the box", () => {
  const shape = fieldShape(64);
  const wide = cellSize(shape, { width: 980, height: 590 });
  const narrow = cellSize(shape, { width: 400, height: 590 });
  // Same arrangement, smaller cells: whichever of width and height binds, binds.
  assert.ok(narrow.cell < wide.cell);
  assert.ok(wide.cell * shape.columns + wide.gap * shape.columns <= 980 + 1);
  assert.ok(wide.cell > 0 && wide.gap > 0);
});

/* --------------------------------------------------------------- progress */

test("nothing is filled before the interval, and everything is after it", () => {
  for (let index = 0; index < 64; index += 1) {
    assert.equal(memberFill(index, 64, 0), 0);
    assert.equal(memberFill(index, 64, 1), 1);
  }
  assert.equal(membersDone(64, 0), 0);
  assert.equal(membersDone(64, 1), 64);
});

test("members fill in order, and one at a time", () => {
  // A quarter of the way through, the first sixteen are done and the rest have not started.
  const progress = 0.25;
  assert.equal(memberFill(0, 64, progress), 1);
  assert.equal(memberFill(15, 64, progress), 1);
  assert.equal(memberFill(16, 64, progress), 0);
  assert.equal(memberFill(63, 64, progress), 0);
  assert.equal(membersDone(64, progress), 16);
});

test("the frontier is a wave rather than a switch", () => {
  // Halfway through the thirty-third member: it is half filled, its neighbours are not sharing.
  const progress = 32.5 / 64;
  assert.equal(memberFill(31, 64, progress), 1);
  assert.ok(Math.abs(memberFill(32, 64, progress) - 0.5) < 1e-9);
  assert.equal(memberFill(33, 64, progress), 0);
});

test("fill is monotone: a member that has happened stays happened", () => {
  for (let step = 0; step <= 100; step += 1) {
    const earlier = memberFill(20, 64, step / 100);
    const later = memberFill(20, 64, Math.min(1, (step + 1) / 100));
    assert.ok(later >= earlier, `member 20 went backwards at ${step}%`);
  }
});

test("the count never claims a member the field has not finished", () => {
  for (let step = 0; step <= 200; step += 1) {
    const progress = step / 200;
    const done = membersDone(64, progress);
    // Everything counted is complete...
    if (done > 0) assert.equal(memberFill(done - 1, 64, progress), 1);
    // ...and nothing beyond the count is.
    if (done < 64) assert.ok(memberFill(done, 64, progress) < 1);
  }
});

test("progress outside the interval is clamped rather than extrapolated", () => {
  assert.equal(memberFill(0, 64, -3), 0);
  assert.equal(memberFill(63, 64, 4), 1);
  assert.equal(membersDone(64, -1), 0);
  assert.equal(membersDone(64, 9), 64);
});
