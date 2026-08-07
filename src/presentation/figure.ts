/**
 * A figure: content that is not written down, because the compiler already knows it.
 *
 * The sixth body, and the only one whose content does not exist when the source is read. A
 * specimen quotes a file; a change diffs two states; a world names things. A figure names a
 * *kind of compilation fact* and gets the facts of the presentation it is part of
 * (`../compile/facts.ts`).
 *
 * The vocabulary is one word and a closed set of two values, and the smallness is the design:
 *
 *     figure: timing     the measured boundaries of this deck's own narration
 *     figure: anchors    the relationships this deck's narration resolved, and when
 *
 * What is deliberately not here is the whole of the interesting part. There is no field path, no
 * expression, no aggregation, no filter, no format string, and no way to name a value. An author
 * cannot write `clip[3].duration`, and the reason is not that it would be hard — it is that a
 * source able to name derived values is a source that will eventually try to *use* one, and a
 * presentation whose narration quotes its own measured length does not have a fixed point.
 *
 * So the author says which kind of truth to show, and the renderer decides what that means: which
 * facts are relevant, how many of them, in what order, and how they are set. Selection and
 * emphasis are projection decisions, exactly as composition is (decision:10).
 */

export const FIGURE_KINDS = ["timing", "anchors"] as const;
export type FigureKind = (typeof FIGURE_KINDS)[number];

export const FIGURE_HINT = `one of ${FIGURE_KINDS.join(", ")}`;

export function isFigureKind(value: unknown): value is FigureKind {
  return typeof value === "string" && (FIGURE_KINDS as readonly string[]).includes(value);
}

/** Checked by hand, like every other body, so a mistyped kind is told what the kinds are. */
export function figureProblem(value: unknown): string | undefined {
  if (isFigureKind(value)) return undefined;
  return typeof value === "string"
    ? `unknown figure ${JSON.stringify(value)} (${FIGURE_HINT})`
    : `must be ${FIGURE_HINT}`;
}
