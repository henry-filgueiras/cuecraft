import { indentOf } from "../presentation/specimen.ts";
import { CODE, fitSpecimen } from "./theme.ts";
import type { Typography } from "./typography.ts";

/**
 * Adapting truthful source to the perceptual constraints of a frame.
 *
 * decision:20 fixed the previous round's evidence scene by *selecting less*, and left one limit
 * it could not touch: the region contains a 74-character line of real prose, and no selection
 * rule shortens a sentence somebody wrote. The scene set at 36px against a 44px ceiling.
 *
 * The measurement that decided this round is the pair of numbers underneath that:
 *
 *     literal:  5 rows, 74 chars  ->  36px   width 1604 / 1622 used   height 274 / 644 used
 *
 * The frame had no spare width and 370px of spare height. Those are the same resource in a
 * monospace block, and **wrapping is the exchange rate between them** — one extra visual row
 * buys thirteen fewer columns. Searching the exchange:
 *
 *     columns  74 -> 36px   67 -> 40px   64 -> 42px   63 -> 44px (ceiling), 6 rows
 *
 * So one break on one line reaches the largest size the deck sets any specimen at. Nothing is
 * removed, nothing is reworded, and the author writes nothing.
 *
 * ## Truth and projection are different layers
 *
 * The repository is the authority; a projection is a *representation* of it, and the two are
 * allowed to differ visually. What they may not do is differ silently. So:
 *
 * - **Content is preserved exactly.** A projection is a partition of the logical line into
 *   character ranges. Nothing is dropped, reordered, reflowed, or reworded — put the fragments
 *   back together with the break spaces and you have the file's bytes again, which is asserted
 *   as a property in the tests rather than promised in a comment.
 * - **The transformation is visible.** A continuation fragment is marked, in the deck's dimmest
 *   grey, with a glyph that occupies the column the list marker would have. `-` starts an item;
 *   `↳` continues one. A viewer never has to wonder which lines are the file's.
 * - **Only wrapping.** Not elision, not folding. The specimen demanded the least lossy operation
 *   in the priority order and it was sufficient, so the others are unbuilt.
 *
 * ## The author is not consulted
 *
 * No wrap column, no manual break, no width. The renderer knows the viewport, the type scale and
 * the advance width, and `fitSpecimen` already reports what a given shape sets at; choosing the
 * measure is therefore a search over an existing function, not a new authored quantity. Same
 * trade as timing (decision:14) and composition (decision:10): state the relationship, derive
 * the mechanics.
 *
 * Pure, and free of React and of highlight.js, so the projection is decided identically whether
 * or not anything is being drawn.
 */

/** Marks a fragment that continues the line above it. Never part of any source. */
export const CONTINUATION = "↳";

/** Columns the continuation glyph and its trailing space occupy. */
const CONTINUATION_WIDTH = CONTINUATION.length + 1;

/**
 * Least content a continuation may carry.
 *
 * A deeply indented line in a narrow box could otherwise wrap to one word per row, which is
 * less legible than the long line was. Below this the line is left alone and the search simply
 * finds no gain at that measure.
 */
const MIN_CONTINUATION_CONTENT = 8;

/** Narrowest measure worth considering. Past here, wrapping is losing to indentation. */
const MIN_COLUMNS = 24;

/**
 * One visual row of a projected line: a character range of it, and where to draw that range.
 *
 * The `source` index is the whole of the semantic-identity story. A mark, or a change's derived
 * region, resolves to *logical* lines; a fragment carries the logical line it came from; so an
 * activation that covered one line before covers all of its fragments now, and nothing between
 * selection and rendering had to learn about wrapping. One semantic identity, several rendered
 * regions, and no identifier anywhere in the middle.
 */
export interface Fragment {
  /** Index of the logical line in the block being projected. */
  readonly source: number;
  /** Character range of that line, half-open. */
  readonly from: number;
  readonly to: number;
  /** Columns of leading space before the glyph. Zero for the first fragment. */
  readonly indent: number;
  readonly continuation: boolean;
}

/** Columns this fragment occupies, including its continuation glyph. */
export function fragmentWidth(fragment: Fragment): number {
  const prefix = fragment.continuation ? fragment.indent + CONTINUATION_WIDTH : 0;
  return prefix + (fragment.to - fragment.from);
}

/**
 * Break one logical line to fit `columns`.
 *
 * Breaks happen at a space and nowhere else: a word is never split, and a run of indentation is
 * never a break opportunity, so the structure the indentation carries survives. A line with no
 * usable break inside the measure is returned whole and overflows — which the search then costs
 * correctly, because the overflowing fragment is still measured at its full width. There is no
 * point at which text is cut to fit.
 *
 * Continuations hang at the line's own indentation, so the glyph lands in the column the `-`
 * would occupy and the continued text lines up with the content it continues.
 */
export function wrapLine(
  line: string,
  columns: number,
  source: number = 0,
): readonly Fragment[] {
  const whole: Fragment = {
    source,
    from: 0,
    to: line.length,
    indent: 0,
    continuation: false,
  };
  if (line.length <= columns) return [whole];

  const indent = indentOf(line);
  const prefix = indent + CONTINUATION_WIDTH;
  if (prefix + MIN_CONTINUATION_CONTENT > columns) return [whole];

  const fragments: Fragment[] = [];
  let cursor = 0;
  for (;;) {
    const first = fragments.length === 0;
    const budget = first ? columns : columns - prefix;
    if (line.length - cursor <= budget) {
      fragments.push({
        source,
        from: cursor,
        to: line.length,
        indent,
        continuation: !first,
      });
      return fragments;
    }
    // The last space that leaves something on this row. `indent` is excluded on the first
    // fragment so a break is never taken inside the line's own leading whitespace.
    const at = line.lastIndexOf(" ", cursor + budget);
    if (at <= (first ? indent : cursor)) {
      fragments.push({
        source,
        from: cursor,
        to: line.length,
        indent,
        continuation: !first,
      });
      return fragments;
    }
    fragments.push({ source, from: cursor, to: at, indent, continuation: !first });
    cursor = at + 1;
  }
}

/** Every line of a block, projected, in drawing order. */
export function projectLines(
  lines: readonly string[],
  columns: number,
): readonly Fragment[] {
  return lines.flatMap((line, index) => wrapLine(line, columns, index));
}

export interface Box {
  readonly width: number;
  readonly height: number;
}

export interface Fit {
  /** The derived measure. Equal to the longest literal line when nothing wrapped. */
  readonly columns: number;
  readonly size: number;
  readonly wrapped: boolean;
}

/**
 * Choose the measure a block is set at, and the size that follows from it.
 *
 * A row is given as the alternatives that may occupy it — one text for a specimen line, two for
 * a revision's swap row, where the taller side decides the row's height. That is the only thing
 * the two archetypes needed to have in common for one search to serve both.
 *
 * The search runs from the literal width downwards and keeps a measure only when it *improves*
 * the size, so the winner is the widest projection achieving the best size: the least wrapping
 * that pays for itself. A block whose height already binds — every specimen in the canonical
 * deck except one — finds no improvement at any measure and is left exactly as written.
 */
export function fitProjection(
  rows: readonly (readonly string[])[],
  box: Box,
  type: Typography,
): Fit {
  const literal = rows.reduce(
    (widest, variants) =>
      variants.reduce((row, text) => Math.max(row, text.length), widest),
    0,
  );

  let best: Fit = { columns: literal, size: 0, wrapped: false };
  for (let columns = literal; columns >= MIN_COLUMNS; columns -= 1) {
    let height = 0;
    let widest = 0;
    for (const variants of rows) {
      let tall = 1;
      for (const text of variants) {
        const fragments = wrapLine(text, columns);
        tall = Math.max(tall, fragments.length);
        for (const fragment of fragments) {
          widest = Math.max(widest, fragmentWidth(fragment));
        }
      }
      height += tall;
    }
    const size = fitSpecimen(height, widest, box, type);
    if (size > best.size) {
      best = { columns, size, wrapped: height > rows.length };
    }
    // Nothing narrower can beat the ceiling, and continuing would wrap for no gain.
    if (best.size >= CODE.maxSize) break;
  }
  return best;
}
