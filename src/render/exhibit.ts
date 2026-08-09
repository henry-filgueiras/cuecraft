import type { ExhibitRegion } from "../presentation/exhibit.ts";
import {
  attentionAt,
  attentionClaims,
  type AttentionScene,
  type AttentionTiming,
} from "./attention.ts";

/**
 * Which part of a computed **picture** the narration is talking about, and where the opening is.
 *
 * decision:58's model, and after sprint:28 almost none of it lives here. The timing — persistent,
 * exclusive, released, merged when a release is interrupted, held for as long as the sentence that
 * caused it — turned out to be shared by every exhibit that has a *current* one, so it moved to
 * `./attention.ts` when the second and third callers arrived. idea:20's test for whether occupancy
 * is a real concept or a coincidence was "write a second implementation and see whether what gets
 * shared is narrower than it looks". What was left over after sharing is this file, and it is one
 * function: **a rectangle travelling between two rectangles.**
 *
 * That leftover is the honest measure of how much of this was ever about charts. A raster cannot
 * show part of itself at a different opacity, so emphasis has to be a veil with a hole in it, and a
 * hole has coordinates that have to move. Nothing else in the exhibit family has that problem — a
 * drawing recolours the element itself and a table lights a row — which is why the geometry stayed
 * behind rather than being generalized into a shape nobody else has.
 */

/** Kept as this module's own name for the timing, so `./theme.ts`'s `EXHIBIT.focus` reads right. */
export type FocusTiming = AttentionTiming;

export interface Focus {
  /** Where the opening is, which is a region except while one is handing over to the next. */
  readonly region: ExhibitRegion;
  /** How dark the rest of the picture is, 0 to 1, before the archetype's own depth is applied. */
  readonly veil: number;
}

/**
 * The veil's strength and the opening's rectangle on one frame.
 *
 * Undefined is ground, exactly as `attentionAt`'s is: no veil, no interpolation, and the picture as
 * the program drew it.
 */
export function focusAt(
  scene: AttentionScene,
  regions: readonly ExhibitRegion[],
  frame: number,
  timing: FocusTiming,
): Focus | undefined {
  const claims = attentionClaims(scene, (index) => regions[index] !== undefined);
  const attention = attentionAt(claims, frame, timing);
  if (attention === undefined) return undefined;

  const to = regions[attention.index];
  if (to === undefined) return undefined;

  const from = attention.from === undefined ? undefined : regions[attention.from];
  return {
    veil: attention.strength,
    region: from === undefined ? to : between(from, to, attention.travel),
  };
}

/** The opening partway between two regions. Four numbers; there is nothing else to move. */
function between(from: ExhibitRegion, to: ExhibitRegion, at: number): ExhibitRegion {
  const step = (a: number, b: number): number => a + (b - a) * at;
  return {
    name: to.name,
    left: step(from.left, to.left),
    top: step(from.top, to.top),
    right: step(from.right, to.right),
    bottom: step(from.bottom, to.bottom),
  };
}
