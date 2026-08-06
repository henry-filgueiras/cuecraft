/**
 * Choosing a composition from the shape of the content.
 *
 * The source stays semantic: a title and some bullets. It never names a layout, a column
 * count, a font size, or a coordinate. This module looks at what the author actually wrote
 * — how many bullets, how long they are, how long the title is — and picks one of four
 * curated compositions.
 *
 * Four, deliberately. This is not a layout engine and must not become one. Every archetype
 * here exists because a real slide in the canonical deck looked wrong without it, and the
 * rule that selects it is a comparison against a number, not a solver. If selection ever
 * needs a scoring function, the right move is to delete an archetype rather than add a
 * heuristic.
 *
 * Plain TypeScript rather than TSX so the whole of the decision is unit-testable without a
 * browser, and so the render summary can report what each slide was given.
 */

export type LayoutArchetype = "statement" | "matrix" | "index" | "lead";

export interface SlideContent {
  readonly title: string;
  readonly bullets: readonly string[];
}

/**
 * Thresholds, named so the selection rules read as prose.
 *
 * `TERSE` is about where a phrase stops being a label and starts being a sentence — two or
 * three words. `COMPACT` is where it stops fitting comfortably on one line of a numbered row
 * at index scale.
 */
export const TERSE_BULLET = 24;
export const COMPACT_BULLET = 38;
export const MAX_CURATED_BULLETS = 6;

export interface ContentShape {
  readonly bulletCount: number;
  readonly longestBullet: number;
  readonly averageBullet: number;
  readonly titleLength: number;
  /** Every bullet short enough to read as a label rather than a sentence. */
  readonly terse: boolean;
  /** No bullet long enough to need wrapping at numbered-row scale. */
  readonly compact: boolean;
}

export function analyzeContent(content: SlideContent): ContentShape {
  const lengths = content.bullets.map((bullet) => bullet.length);
  const longest = lengths.length === 0 ? 0 : Math.max(...lengths);
  const total = lengths.reduce((sum, length) => sum + length, 0);

  return {
    bulletCount: lengths.length,
    longestBullet: longest,
    averageBullet: lengths.length === 0 ? 0 : total / lengths.length,
    titleLength: content.title.length,
    terse: lengths.length > 0 && longest <= TERSE_BULLET,
    compact: lengths.length > 0 && longest <= COMPACT_BULLET,
  };
}

/**
 * Pick a composition. Deterministic, total, and ordered from most specific to least.
 *
 * - **statement** — nothing but a title. The title becomes the slide, at display size.
 * - **matrix** — a handful of short parallel labels. They become a two-column field of
 *   terms rather than a list, which is what the content already is.
 * - **index** — a handful of compact phrases with an order worth showing. Numbered rows.
 * - **lead** — anything longer or more numerous. Title holds the left column, the list
 *   stacks on the right.
 */
export function chooseLayout(content: SlideContent): LayoutArchetype {
  const shape = analyzeContent(content);

  if (shape.bulletCount === 0) return "statement";
  if (shape.bulletCount <= MAX_CURATED_BULLETS && shape.terse) return "matrix";
  if (shape.bulletCount <= MAX_CURATED_BULLETS && shape.compact) return "index";
  return "lead";
}
