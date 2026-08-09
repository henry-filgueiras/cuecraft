import type { ExhibitTable } from "../presentation/exhibit.ts";
import {
  attentionAt,
  attentionClaims,
  clampUnit,
  type Attention,
  type AttentionScene,
  type AttentionTiming,
} from "./attention.ts";

/**
 * Laying out a table a foreign program computed, and deciding what part of it is on screen.
 *
 * The first exhibit cuecraft draws itself. Everything before it was pixels somebody else produced,
 * and the composition's entire job was to place a rectangle; here the artifact is *data*, so all
 * the questions decision:10 usually answers come back — how large is the type, how wide is a
 * column, what happens to a value that does not fit, and how much of it can be on screen at once.
 *
 * None of those is authorable, and that is the point of putting them here rather than in the
 * component. A deck writes `run:`, `with:`, `key:` and the names it will talk about. It writes no
 * width, no size, no row count, no alignment, and there is no key it could write.
 *
 * ## Two things this deliberately is not
 *
 * **Not a table engine.** No sorting, no filtering, no spans, no nesting, no per-cell rules, no
 * measurement of the DOM. Widths come from the same character-advance estimate every other
 * composition in this repository uses, because composition has to resolve before anything renders.
 *
 * **Not a scroller.** There is no velocity, no easing curve worth naming, no user, and no history.
 * The viewport's position on a frame is a pure function of the *claims* narration makes — see
 * `registerScroll` — which is what makes it reproducible rather than merely smooth.
 *
 * ## dragon:26, taken as an adversary rather than a warning
 *
 * A matrix cell that wrapped drew its second line through the subtitle band, because nothing in
 * that composition accounted for a second line. The rule here is the opposite one and it is stated
 * once: **a row is a fixed height, that height is chosen from the worst cell in the table, and
 * anything that still does not fit is elided.** So there is no content-dependent overflow to
 * escape a bound — the bound is computed from the content before a single row is drawn.
 */

/** How a register is set. Frames at 30fps and pixels at 1080p; unreachable from any source. */
export interface RegisterTheme {
  /** Type sizes to try, largest first. A table is set as large as it can be and still fit. */
  readonly sizes: readonly number[];
  readonly lineHeight: number;
  /** The most lines one cell may wrap to before it is elided. */
  readonly maxLines: number;
  /** Room inside a cell, left and right. */
  readonly padX: number;
  /** Room above and below the text in a row, on top of the line boxes. */
  readonly padY: number;
  /** The narrowest a column may be squeezed to, in characters of the body face. */
  readonly minChars: number;
  /** Average advance width of the body face, as a fraction of the size. */
  readonly charWidth: number;
  /** Space between the header rule and the first row. */
  readonly headerGap: number;
}

export interface RegisterColumn {
  readonly width: number;
  /**
   * Right for a column whose every value is a number, left for everything else.
   *
   * The one inference in this file, and it is about *setting type* rather than about the data: a
   * column of figures that does not align on its digits is harder to compare, which is the only
   * reason anybody would put it in a table. cuecraft still does not know what the number means, and
   * nothing downstream may ask — it does not parse it, sum it, format it or sort by it.
   */
  readonly align: "left" | "right";
}

export interface RegisterLayout {
  readonly size: number;
  readonly columns: readonly RegisterColumn[];
  readonly rowHeight: number;
  /** How many lines a cell is allowed, after the whole table has been measured. */
  readonly lines: number;
  /** How many rows are on screen at once. Never more than the table has. */
  readonly visibleRows: number;
  /** Whether the table is taller than its room, and therefore has anywhere to scroll to. */
  readonly overflows: boolean;
}

/** Anything that reads as a figure. Deliberately narrow: a guess here only changes an alignment. */
const NUMERIC = /^[-+(]?[$£€]?[\d,]+(\.\d+)?\)?%?$/;

/**
 * Choose the type size, the column widths and the viewport height for one table in one box.
 *
 * Largest-first over a ladder rather than solved, which is the rule the rest of `./theme.ts`
 * follows: try the size a table would like to be, accept the first one whose natural columns fit,
 * and squeeze only at the floor. A solver here would be able to produce sizes no other composition
 * in the deck uses, and a table that is set two points off every other slide reads as a screenshot.
 */
export function fitRegister(
  table: ExhibitTable,
  box: { readonly width: number; readonly height: number },
  theme: RegisterTheme,
): RegisterLayout {
  const size = theme.sizes.find(
    (candidate) => natural(table, candidate, theme) <= box.width,
  );
  const chosen = size ?? theme.sizes.at(-1) ?? 20;

  const widths = distribute(table, chosen, box.width, theme);
  const columns = widths.map((width, index) => ({
    width,
    align: alignmentOf(table, index),
  }));

  // The worst cell in the whole table decides every row's height. Uniform because the viewport's
  // arithmetic is `row * rowHeight` and a table of variable rows would make "reveal row 73" a
  // running sum — which is a scroller with state, and this is not one.
  let lines = 1;
  for (const row of table.rows) {
    for (const [index, cell] of row.entries()) {
      const column = columns[index];
      if (column === undefined) continue;
      lines = Math.max(lines, linesFor(cell, column.width, chosen, theme));
    }
  }
  lines = Math.min(lines, theme.maxLines);

  const rowHeight = Math.ceil(chosen * theme.lineHeight * lines + theme.padY * 2);
  const headerHeight = Math.ceil(chosen * theme.lineHeight + theme.padY * 2);
  const room = box.height - headerHeight - theme.headerGap;

  const capacity = Math.max(1, Math.floor(room / rowHeight));
  const visibleRows = Math.min(capacity, table.rows.length);

  return {
    size: chosen,
    columns,
    rowHeight,
    lines,
    visibleRows,
    overflows: table.rows.length > visibleRows,
  };
}

/** How wide the columns want to be at a size, before anything is squeezed. */
function natural(table: ExhibitTable, size: number, theme: RegisterTheme): number {
  return naturalWidths(table, size, theme).reduce((sum, width) => sum + width, 0);
}

function naturalWidths(
  table: ExhibitTable,
  size: number,
  theme: RegisterTheme,
): readonly number[] {
  return table.columns.map((header, index) => {
    const longest = table.rows.reduce(
      (most, row) => Math.max(most, (row[index] ?? "").length),
      header.length,
    );
    return Math.ceil(longest * size * theme.charWidth + theme.padX * 2);
  });
}

/**
 * Natural widths made to add up to the room available.
 *
 * Slack is spread evenly rather than proportionally, because a proportional spread gives the widest
 * column the most extra air, which is exactly the column that needed the least. Overflow is taken
 * from the widest columns first, down to a floor, which is what makes the long text cell the one
 * that wraps rather than the one that pushes everything else off the frame.
 */
function distribute(
  table: ExhibitTable,
  size: number,
  available: number,
  theme: RegisterTheme,
): readonly number[] {
  const widths = [...naturalWidths(table, size, theme)];
  const floor = Math.ceil(theme.minChars * size * theme.charWidth + theme.padX * 2);
  const total = widths.reduce((sum, width) => sum + width, 0);

  if (total <= available) {
    const slack = Math.floor((available - total) / widths.length);
    return widths.map((width) => width + slack);
  }

  // Take from the widest, one pass, in proportion to how far each is above the floor. A loop that
  // shaved the single widest repeatedly converges to the same place and is harder to reason about
  // when two columns are the same width.
  const over = widths.map((width) => Math.max(0, width - floor));
  const spare = over.reduce((sum, value) => sum + value, 0);
  const excess = total - available;
  if (spare <= 0) return widths.map(() => Math.floor(available / widths.length));

  // `min(width, floor)` rather than `floor`: the floor is a limit on how far a column may be
  // *shrunk*, not a width every column is entitled to. Taking it literally widened the four narrow
  // quarter columns of the showcase's table up to the floor while the prose column was being cut,
  // which made the squeeze add width overall — the opposite of what it was asked to do.
  const shaved = widths.map((width, index) =>
    Math.max(
      Math.min(width, floor),
      Math.floor(width - (excess * (over[index] ?? 0)) / spare),
    ),
  );

  // The proportional pass can leave a few pixels over — a column that hit the floor did not give up
  // its full share, and every width is rounded down independently. Those pixels are taken off the
  // widest column that can still afford them, because "the columns fit in the room" is the property
  // the whole composition rests on and an approximation of it is a frame with a column off the edge.
  let remaining = shaved.reduce((sum, width) => sum + width, 0) - available;
  while (remaining > 0) {
    let widest = -1;
    for (const [index, width] of shaved.entries()) {
      if (width > floor && (widest < 0 || width > (shaved[widest] as number)))
        widest = index;
    }
    if (widest < 0) break;
    const take = Math.min(
      remaining,
      (shaved[widest] as number) - Math.min(widths[widest] as number, floor),
    );
    shaved[widest] = (shaved[widest] as number) - take;
    remaining -= take;
  }
  return shaved;
}

function alignmentOf(table: ExhibitTable, index: number): "left" | "right" {
  if (index === table.keyColumn) return "left";
  const cells = table.rows.map((row) => row[index] ?? "");
  return cells.length > 0 && cells.every((cell) => NUMERIC.test(cell.trim()))
    ? "right"
    : "left";
}

/** How many lines a cell needs at a width, before the cap is applied. */
export function linesFor(
  text: string,
  width: number,
  size: number,
  theme: RegisterTheme,
): number {
  const perLine = Math.max(
    1,
    Math.floor((width - theme.padX * 2) / (size * theme.charWidth)),
  );
  return Math.max(1, Math.ceil(text.length / perLine));
}

/**
 * How many characters of a cell will actually be drawn, given the lines the table settled on.
 *
 * Returned as a count rather than as truncated text so that the component can decide what an
 * elision looks like, and so that this stays testable as arithmetic. `-1` means all of it.
 */
export function cellBudget(
  width: number,
  size: number,
  lines: number,
  theme: RegisterTheme,
): number {
  const perLine = Math.max(
    1,
    Math.floor((width - theme.padX * 2) / (size * theme.charWidth)),
  );
  return perLine * lines;
}

/**
 * Where the viewport is on a frame, as a fractional row index.
 *
 * **Folded over the claims, not over the frames.** The position is a running consequence of what
 * narration has asked for, so the rule is "minimum movement that reveals the row" — a row already
 * on screen does not move the table at all, and one below the fold brings the table up by exactly
 * as much as it has to. Computing that per frame would need the previous frame's answer, which is
 * state; computing it per claim needs only the claim list, which is fixed before rendering starts.
 *
 * So a still at frame 900 is the same still whether it was rendered on its own or after 899 others,
 * which is the property every other derived quantity in this repository has and the reason there is
 * no inertia here.
 */
export function registerScroll(
  claims: readonly { readonly index: number; readonly from: number }[],
  rows: number,
  layout: RegisterLayout,
  frame: number,
  timing: AttentionTiming,
): number {
  const last = Math.max(0, rows - layout.visibleRows);
  if (last === 0) return 0;

  let top = 0;
  let previous = 0;
  let since = -Infinity;

  for (const claim of claims) {
    if (claim.from > frame) break;
    previous = top;
    top = reveal(top, claim.index, layout.visibleRows, last);
    since = claim.from;
  }

  if (top === previous) return top;
  const travel = clampUnit((frame - since) / Math.max(1, timing.move));
  return previous + (top - previous) * easeOut(travel);
}

/**
 * The least the table can move and still show a row, with one row of air where there is room.
 *
 * The air matters more than it sounds. A row revealed flush against the bottom edge reads as the
 * table having *just* run out rather than as the table having gone and fetched something, and the
 * whole claim this composition makes is the second one.
 */
export function reveal(top: number, row: number, visible: number, last: number): number {
  const lead = visible > 2 ? 1 : 0;
  if (row < top) return clamp(row - lead, 0, last);
  if (row > top + visible - 1) return clamp(row - visible + 1 + lead, 0, last);
  return top;
}

/**
 * Which row and which column narration is on, as two independent occupancies.
 *
 * Two tracks rather than one set, because "which row" and "which column" each have exactly one
 * answer and the interesting frame is the one where both do — the cell they cross is the answer to
 * a sentence about a row and a sentence about a column, with no selection algebra and without
 * `activates:` learning to take a list.
 */
export interface RegisterAttention {
  readonly row: Attention | undefined;
  readonly column: Attention | undefined;
}

export function registerAttention(
  scene: AttentionScene,
  shows: readonly string[],
  table: ExhibitTable,
  frame: number,
  timing: AttentionTiming,
): RegisterAttention {
  return {
    row: attentionAt(rowClaims(scene, shows, table), frame, timing),
    column: attentionAt(claimsOn(scene, shows, table.columnIds), frame, timing),
  };
}

/** The row track's claims, translated out of the anchor's index space into the table's. */
export function rowClaims(
  scene: AttentionScene,
  shows: readonly string[],
  table: ExhibitTable,
): readonly { readonly index: number; readonly from: number; readonly until: number }[] {
  return claimsOn(scene, shows, table.rowIds);
}

/**
 * Anchors that landed on one track, renumbered into that track's own indices.
 *
 * The translation is the whole of it, and the reason it is needed is worth stating. An anchor
 * resolves at parse time against `bodyElements`, which for an exhibit is `shows:` — a short list of
 * the names this deck happens to talk about, in the order it wrote them. A table's rows are a
 * different and much longer list, generated from data. So `elementIndex` 2 might be the ninetieth
 * row, and every consumer that wants to know *which row* has to go through the name.
 *
 * Which is also the answer to why identities and not offsets: the two lists are related only by the
 * name, and the name is the thing an author wrote.
 */
function claimsOn(
  scene: AttentionScene,
  shows: readonly string[],
  ids: readonly string[],
): readonly { readonly index: number; readonly from: number; readonly until: number }[] {
  const track = new Map<number, number>();
  for (const [elementIndex, name] of shows.entries()) {
    const index = ids.indexOf(name);
    if (index >= 0) track.set(elementIndex, index);
  }
  return attentionClaims(scene, (index) => track.has(index)).map((claim) => ({
    ...claim,
    index: track.get(claim.index) as number,
  }));
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

function easeOut(t: number): number {
  const remaining = 1 - t;
  return 1 - remaining * remaining * remaining;
}
