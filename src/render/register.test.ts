import assert from "node:assert/strict";
import { test } from "node:test";

import type { ExhibitTable } from "../presentation/exhibit.ts";
import type { AttentionScene, AttentionTiming } from "./attention.ts";
import {
  cellBudget,
  fitRegister,
  registerAttention,
  registerScroll,
  reveal,
  rowClaims,
  type RegisterTheme,
} from "./register.ts";

/**
 * The table's layout and its viewport, without a browser.
 *
 * Two claims are being checked, and the second one is the experiment.
 *
 * **Nothing overruns.** dragon:26 is a composition that let a wrapped cell draw through the
 * subtitle band, and the defence here is arithmetic rather than vigilance: a row is a fixed height
 * derived from the worst cell in the table, and the viewport is exactly `rows x rowHeight`. Both are
 * computed from the content before anything is drawn, so the tests can convict a regression that a
 * rendered frame would only show for one particular table.
 *
 * **The viewport is a pure function of the claims.** No frame's answer depends on any other frame's
 * having been computed, which is what makes a still reproducible and the whole reason `reveal` is
 * folded over sentences rather than over time.
 */

const THEME: RegisterTheme = {
  sizes: [30, 26, 22],
  lineHeight: 1.3,
  maxLines: 2,
  padX: 18,
  padY: 12,
  minChars: 8,
  charWidth: 0.52,
  headerGap: 10,
};

const TIMING: AttentionTiming = { rise: 10, fall: 20, move: 10 };
const BOX = { width: 1650, height: 552 };

/** The adversarial fixture: long labels, short ones, numbers of different widths, many rows. */
function fixture(rows: number): ExhibitTable {
  const names = [
    "West",
    "East",
    "North",
    "South",
    "Central",
    "Nordics",
    "Iberia and the Balearic Islands",
    "APAC",
  ];
  const body = Array.from({ length: rows }, (_, index) => [
    `${names[index % names.length]} ${index}`,
    index % 3 === 0 ? "1,204,993.40" : "88.10",
    index % 4 === 0
      ? "a note long enough that it cannot possibly fit in one column at any size cuecraft would set a table in, which is the point of it"
      : "fine",
  ]);
  return {
    columns: ["region", "revenue", "note"],
    rows: body,
    keyColumn: 0,
    rowIds: body.map((_, index) => `row-r${index}`),
    columnIds: ["column-region", "column-revenue", "column-note"],
  };
}

function scene(
  entries: readonly { element: number; from: number; length: number }[],
): AttentionScene {
  return {
    anchors: entries.map((entry, index) => ({
      elementIndex: entry.element,
      clipIndex: index,
      frame: entry.from,
    })),
    clips: entries.map((entry) => ({ from: entry.from, durationInFrames: entry.length })),
  };
}

test("the columns add up to no more than the room they were given", () => {
  for (const rows of [1, 5, 40, 200]) {
    const layout = fitRegister(fixture(rows), BOX, THEME);
    const total = layout.columns.reduce((sum, column) => sum + column.width, 0);
    assert.ok(total <= BOX.width, `${rows} rows spent ${total} of ${BOX.width}`);
  }
});

test("the viewport is never taller than the room, however long the table is", () => {
  for (const rows of [1, 3, 12, 200]) {
    const layout = fitRegister(fixture(rows), BOX, THEME);
    assert.ok(
      layout.rowHeight * layout.visibleRows <= BOX.height,
      `${rows} rows needed ${layout.rowHeight * layout.visibleRows}`,
    );
  }
});

test("a short table shows all of it and says it does not overflow", () => {
  const layout = fitRegister(fixture(3), BOX, THEME);
  assert.equal(layout.visibleRows, 3);
  assert.equal(layout.overflows, false);
});

test("a long table shows a bounded window and admits it", () => {
  const layout = fitRegister(fixture(40), BOX, THEME);
  assert.ok(layout.visibleRows < 40);
  assert.equal(layout.overflows, true);
});

test("a long cell wraps to a second line rather than widening its column", () => {
  const layout = fitRegister(fixture(8), BOX, THEME);
  assert.equal(layout.lines, THEME.maxLines);
  // And every row is that height, including the ones whose cells are short — which is what makes
  // "reveal row 30" a multiplication rather than a running sum.
  assert.equal(
    layout.rowHeight,
    Math.ceil(layout.size * THEME.lineHeight * 2 + THEME.padY * 2),
  );
});

test("a cell too long even for two lines is elided, not allowed a third", () => {
  const huge: ExhibitTable = {
    columns: ["region", "note"],
    rows: [["West", "x".repeat(4000)]],
    keyColumn: 0,
    rowIds: ["row-west"],
    columnIds: ["column-region", "column-note"],
  };
  const layout = fitRegister(huge, BOX, THEME);
  assert.ok(layout.lines <= THEME.maxLines);
  const note = layout.columns[1];
  const budget = cellBudget(note?.width ?? 0, layout.size, layout.lines, THEME);
  assert.ok(budget < 4000, `a 4000-character cell was given a budget of ${budget}`);
  // The row is still exactly the height the table settled on, so nothing it holds can reach the
  // subtitle band underneath it — which is dragon:26 stated as arithmetic.
  assert.ok(layout.rowHeight * layout.visibleRows <= BOX.height);
});

test("the narrowest column is never squeezed below the floor", () => {
  // Eight columns of long values in a 1650px box: something has to give, and what must not give is
  // a column becoming too narrow to hold anything.
  const wide: ExhibitTable = {
    columns: Array.from(
      { length: 8 },
      (_, index) => `column ${index} with a long header`,
    ),
    rows: [Array.from({ length: 8 }, () => "a fairly long value indeed")],
    keyColumn: 0,
    rowIds: ["row-a"],
    columnIds: Array.from({ length: 8 }, (_, index) => `column-c${index}`),
  };
  const layout = fitRegister(wide, BOX, THEME);
  const floor = THEME.minChars * layout.size * THEME.charWidth;
  for (const column of layout.columns) {
    assert.ok(column.width >= floor, `a column came out at ${column.width}`);
  }
});

test("a column of figures is set right, and the key column never is", () => {
  const layout = fitRegister(fixture(6), BOX, THEME);
  assert.equal(layout.columns[0]?.align, "left");
  assert.equal(layout.columns[1]?.align, "right");
  assert.equal(layout.columns[2]?.align, "left");
});

test("a table is set as large as it can be and still fit", () => {
  const small: ExhibitTable = {
    columns: ["a", "b"],
    rows: [["1", "2"]],
    keyColumn: 0,
    rowIds: ["row-a"],
    columnIds: ["column-a", "column-b"],
  };
  assert.equal(fitRegister(small, BOX, THEME).size, THEME.sizes[0]);
});

test("reveal moves the least it can, and not at all for a row already on screen", () => {
  assert.equal(reveal(0, 3, 10, 90), 0);
  assert.equal(reveal(0, 9, 10, 90), 0);
  // Below the fold: comes up by just enough, plus one row of air.
  assert.equal(reveal(0, 20, 10, 90), 12);
  // Above it: goes back by just enough, plus the air.
  assert.equal(reveal(50, 20, 10, 90), 19);
  // And never past either end of the table.
  assert.equal(reveal(0, 89, 10, 90), 81);
  assert.equal(reveal(50, 0, 10, 90), 0);
});

test("a table that fits never scrolls, on any frame", () => {
  const table = fixture(3);
  const layout = fitRegister(table, BOX, THEME);
  const claims = rowClaims(
    scene([{ element: 0, from: 100, length: 40 }]),
    ["row-r2"],
    table,
  );
  for (let frame = 0; frame <= 300; frame += 1) {
    assert.equal(registerScroll(claims, 3, layout, frame, TIMING), 0, `frame ${frame}`);
  }
});

test("activating a row below the fold brings it into view", () => {
  const table = fixture(40);
  const layout = fitRegister(table, BOX, THEME);
  const target = 30;
  const claims = rowClaims(
    scene([{ element: 0, from: 100, length: 60 }]),
    [`row-r${target}`],
    table,
  );

  // Before the sentence the table has not moved.
  assert.equal(registerScroll(claims, 40, layout, 99, TIMING), 0);

  // After the move has finished, the row is inside the window.
  const top = registerScroll(claims, 40, layout, 100 + TIMING.move, TIMING);
  assert.ok(top <= target, `top ${top} is past the row`);
  assert.ok(target <= top + layout.visibleRows - 1, `row ${target} is below ${top}`);
});

test("the move is a travel rather than a cut", () => {
  const table = fixture(40);
  const layout = fitRegister(table, BOX, THEME);
  const claims = rowClaims(
    scene([{ element: 0, from: 100, length: 60 }]),
    ["row-r30"],
    table,
  );

  const settled = registerScroll(claims, 40, layout, 100 + TIMING.move, TIMING);
  const halfway = registerScroll(claims, 40, layout, 100 + TIMING.move / 2, TIMING);
  assert.ok(halfway > 0 && halfway < settled, `halfway was ${halfway} of ${settled}`);
});

test("the viewport is a pure function of the frame, not of what was rendered before it", () => {
  const table = fixture(40);
  const layout = fitRegister(table, BOX, THEME);
  const claims = rowClaims(
    scene([
      { element: 0, from: 100, length: 50 },
      { element: 1, from: 200, length: 50 },
    ]),
    ["row-r30", "row-r5"],
    table,
  );

  // Forwards and backwards over the same frames give the same answers.
  const forwards: number[] = [];
  for (let frame = 0; frame <= 300; frame += 1) {
    forwards.push(registerScroll(claims, 40, layout, frame, TIMING));
  }
  for (let frame = 300; frame >= 0; frame -= 1) {
    assert.equal(
      registerScroll(claims, 40, layout, frame, TIMING),
      forwards[frame],
      `frame ${frame} differed on the second pass`,
    );
  }
});

test("a second row already on screen does not move the table again", () => {
  const table = fixture(40);
  const layout = fitRegister(table, BOX, THEME);
  const claims = rowClaims(
    scene([
      { element: 0, from: 100, length: 50 },
      { element: 1, from: 200, length: 50 },
    ]),
    ["row-r30", "row-r31"],
    table,
  );
  const settled = registerScroll(claims, 40, layout, 160, TIMING);
  assert.equal(registerScroll(claims, 40, layout, 260, TIMING), settled);
});

test("the row track and the column track are read from the same anchors", () => {
  const table = fixture(12);
  const shows = ["row-r7", "column-revenue"];
  const at = (frame: number) =>
    registerAttention(
      scene([
        { element: 0, from: 100, length: 60 },
        { element: 1, from: 160, length: 60 },
      ]),
      shows,
      table,
      frame,
      TIMING,
    );

  assert.equal(at(120).row?.index, 7);
  assert.equal(at(120).column, undefined);

  // The column's sentence, while the row has not yet released: the cell where they cross is the
  // answer to both, and neither track had to know about the other.
  assert.equal(at(172).row?.index, 7);
  assert.ok((at(172).row?.strength ?? 0) > 0);
  assert.equal(at(172).column?.index, 1);
});

test("attention leaving a table returns both tracks to ground", () => {
  const table = fixture(12);
  const attention = registerAttention(
    scene([{ element: 0, from: 100, length: 40 }]),
    ["row-r3"],
    table,
    140 + TIMING.fall,
    TIMING,
  );
  assert.equal(attention.row, undefined);
  assert.equal(attention.column, undefined);
});

test("a name the table does not have reaches neither track", () => {
  const table = fixture(12);
  const attention = registerAttention(
    scene([{ element: 0, from: 100, length: 40 }]),
    ["row-nowhere"],
    table,
    120,
    TIMING,
  );
  assert.equal(attention.row, undefined);
  assert.equal(attention.column, undefined);
});

test("the biggest table cuecraft draws still lays out and still bounds its viewport", () => {
  const layout = fitRegister(fixture(200), BOX, THEME);
  assert.ok(layout.visibleRows >= 1);
  assert.ok(layout.rowHeight * layout.visibleRows <= BOX.height);
  assert.equal(layout.overflows, true);
});
