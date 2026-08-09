import {
  attentionAt,
  attentionClaims,
  type AttentionScene,
  type AttentionTiming,
} from "./attention.ts";

/**
 * What each named element of a drawing looks like on one frame — and why nothing has to be restored.
 *
 * ## The invariant, stated as a property rather than a promise
 *
 * A named element that has been emphasized must be able to return to **exactly** the state it was
 * imported in. Every obvious way to build that is a mechanism: remember the original fill, apply an
 * override, put the original back, and hope nothing was missed on the way. Each of those is a place
 * where ground state can be lost, and the loss is silent — the picture is subtly wrong afterwards
 * and no test that checks the emphasized frame would notice.
 *
 * So the mechanism is that there is no mechanism. **The imported markup is never modified.** It is
 * inlined once and handed to the browser unchanged; emphasis is a stylesheet computed from the
 * frame number, matching on the attribute the program wrote. At zero strength this function returns
 * nothing at all, no rule is emitted, and the element is exactly the element cairo wrote. Ground is
 * not restored, it is never left — which is the only version of this that cannot drift.
 *
 * That also settles what emphasis is allowed to be. cuecraft knows the *name* of an element and
 * nothing whatever about how the program drew it: not its fill, not its shape, not where it is. So
 * the treatment has to be one that composes with an unknown original — an opacity and a brightness,
 * both multiplicative, both identity at zero — rather than one that replaces a value it would have
 * to know first. The boundary decision:55 drew is what forces the vocabulary here, which is a good
 * sign that the boundary is real.
 *
 * ## Overlapping attention
 *
 * The hard case is not one element lighting up. It is `{A, B}` giving way to `{B, C}`, where B must
 * not flash through ground on the way. It does not, and again by construction rather than by a
 * special case: strength comes from the *run* (`./attention.ts`), which merges when a release is
 * interrupted, so B's own emphasis is a continuous function across the handover. What travels is
 * *which* element is lifted, and it travels rather than cutting, so a frame mid-handover has the
 * leaving element part-lifted and the arriving one part-lifted and neither at ground.
 */

/** What one named element is doing. Both fields are identity-valued at ground. */
export interface Emphasis {
  /** 1 is untouched. Below 1 is an element that is not what is being talked about. */
  readonly opacity: number;
  /** 1 is untouched. Above 1 is the element the sentence named. */
  readonly brightness: number;
}

export interface DrawingTreatment {
  /** How far an unattended named element gives way, at full strength. */
  readonly recede: number;
  /** How much brighter the attended one gets, at full strength. */
  readonly lift: number;
}

export const GROUND: Emphasis = { opacity: 1, brightness: 1 };

/**
 * Every named element's emphasis on this frame, or nothing — which is ground for all of them.
 *
 * Returning `undefined` rather than a map of identities is deliberate: a caller that gets nothing
 * emits no stylesheet, so the "no attention" path cannot accidentally emit `opacity: 1` and leave a
 * rule in the document that a later frame could inherit half of.
 */
export function drawingEmphasis(
  scene: AttentionScene,
  /** What narration can reach, index-aligned with the anchors. */
  elements: readonly string[],
  /** Every name the program wrote into the picture, which is usually a superset. */
  tagged: readonly string[],
  frame: number,
  timing: AttentionTiming,
  treatment: DrawingTreatment,
): ReadonlyMap<string, Emphasis> | undefined {
  const claims = attentionClaims(scene, (index) => elements[index] !== undefined);
  const attention = attentionAt(claims, frame, timing);
  if (attention === undefined) return undefined;

  // How much of the attention each *addressable* element holds: all of it once a handover has
  // finished, and shared with the one being left while it has not. The two shares sum to one at
  // every frame, which is what keeps the picture from momentarily having no subject.
  const share = new Map<string, number>();
  for (const [index, name] of elements.entries()) {
    share.set(
      name,
      index === attention.index
        ? attention.travel
        : index === attention.from
          ? 1 - attention.travel
          : 0,
    );
  }

  // Over everything the program named, not only over what this deck can reach. A bar nobody
  // mentions is still part of the picture being talked *around*, and leaving it at full strength
  // makes the frame say that it matters as much as the one the sentence named.
  const emphasis = new Map<string, Emphasis>();
  for (const name of new Set([...tagged, ...elements])) {
    const held = share.get(name) ?? 0;
    emphasis.set(name, {
      opacity: 1 - attention.strength * treatment.recede * (1 - held),
      brightness: 1 + attention.strength * treatment.lift * held,
    });
  }
  return emphasis;
}
