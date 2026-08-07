/**
 * Choosing a composition from what the content means, then from the shape it has.
 *
 * The source stays semantic. It never names a layout, a column count, a font size, or a
 * coordinate. It says what its content *is* — points, stages, or code — and how much of it
 * there is; this module turns that into one of six curated compositions.
 *
 * decision:10 originally derived composition from shape alone: how many bullets, how long they
 * are. Building a real minute of video showed the limit of that. `steps` and `bullets` carry
 * identical data and want opposite compositions, because "these are stages of one
 * transformation" is a different claim from "these are points", and no amount of measuring
 * character counts can tell them apart. So the role is consulted first, and shape now decides
 * only *within* the list role.
 *
 * Eleven, and the ceiling was meant to be nine. Both of the ones that broke it were added because
 * a *role* had no composition rather than because an arrangement wanted a variant — mathematics,
 * and a bounded population — which is evidence that the ceiling was always about arrangements and
 * never about meanings. Every archetype here exists because a real slide looked wrong without it,
 * and the rule that selects it is a comparison against a number, not a solver. If selection ever
 * needs a scoring function, the right move is to delete an archetype rather than add a heuristic.
 *
 * The seventh arrived with the seventh *role*, not with a seventh way of arranging the same
 * content: a change has two states, and no composition for one state can show a transformation.
 *
 * Plain TypeScript rather than TSX so the whole of the decision is unit-testable without a
 * browser, and so the render summary can report what each slide was given.
 */

import type { SlideBody } from "../presentation/parse.ts";

export type LayoutArchetype =
  | "statement"
  | "matrix"
  | "index"
  | "lead"
  | "cascade"
  | "specimen"
  | "revision"
  | "atlas"
  | "figure"
  | "formula"
  | "series";

export interface SlideContent {
  readonly title: string;
  readonly body: SlideBody;
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
  /** Every item short enough to read as a label rather than a sentence. */
  readonly terse: boolean;
  /** No item long enough to need wrapping at numbered-row scale. */
  readonly compact: boolean;
}

export function analyzeContent(content: SlideContent): ContentShape {
  const items =
    content.body.kind === "bullets" || content.body.kind === "steps"
      ? content.body.items
      : [];
  const lengths = items.map((item) => item.text.length);
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
 * By role:
 *
 * - **specimen** — a code block. Heading above, the source full width beneath it, monospace at
 *   presentation scale. There is no second arrangement of code worth having.
 * - **revision** — one source becoming another. The same block, with the changed lines swapping
 *   in place while everything around them holds still.
 * - **atlas** — a semantic world. The only composition that is larger than the frame: the world
 *   is laid out once in its own coordinates and a derived camera travels through it as the
 *   narration does. Nothing else here has a camera, and nothing else needs one.
 * - **formula** — mathematics. Set by KaTeX at a size derived from the longest line, because a
 *   definition is not points and not source: it is one line whose spacing carries its meaning.
 * - **series** — a bounded population. A derived field of members, filling in reading order over
 *   a measured narration interval. The only composition whose size comes from a number rather
 *   than from how much the author wrote.
 * - **figure** — the compilation's own facts. One archetype rather than one per kind, because
 *   `timing` and `anchors` are two shapes of the same role — "show what the compiler worked out"
 *   — and the role picks the composition while the shape decides within it, which is the rule
 *   decision:15 already settled.
 * - **cascade** — stages of a transformation. They descend and step right along a single
 *   traced line, so the frame reads as something being carried forward rather than listed.
 *
 * Then, for points, by shape:
 *
 * - **statement** — no content at all. The title becomes the slide, at display size.
 * - **matrix** — a handful of short parallel labels. They become a two-column field of terms
 *   rather than a list, which is what the content already is.
 * - **index** — a handful of compact phrases with an order worth showing. Numbered rows.
 * - **lead** — anything longer or more numerous. Title holds the left column, the list stacks
 *   on the right.
 */
export function chooseLayout(content: SlideContent): LayoutArchetype {
  if (content.body.kind === "figure") return "figure";
  if (content.body.kind === "formula") return "formula";
  if (content.body.kind === "series") return "series";
  if (content.body.kind === "code") return "specimen";
  if (content.body.kind === "change") return "revision";
  if (content.body.kind === "world") return "atlas";
  if (content.body.kind === "steps") return "cascade";

  const shape = analyzeContent(content);

  if (shape.bulletCount === 0) return "statement";
  if (shape.bulletCount <= MAX_CURATED_BULLETS && shape.terse) return "matrix";
  if (shape.bulletCount <= MAX_CURATED_BULLETS && shape.compact) return "index";
  return "lead";
}
