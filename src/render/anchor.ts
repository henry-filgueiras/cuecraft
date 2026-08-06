/**
 * What an anchored element is doing at a given frame.
 *
 * decision:14 gave activation one state and one ramp: contrast rose over ten frames when the
 * narration reached an element, and stayed up. Watching the canonical deck while actually
 * *listening* showed the problem with that. The change is real but it is monotone and slow, so
 * by the time a viewer notices the row is brighter, the sentence that brightened it has moved
 * on. The causal link — that sentence lit that row — never lands.
 *
 * What was missing is a transient. An element passes through three states:
 *
 *     future  ->  hot  ->  established
 *
 * **future** is recessive but fully legible, so the slide still reads as a still from its first
 * frame and the narration builds emphasis rather than revealing information.
 *
 * **hot** is a brief accent at the moment of arrival, gone inside a second. It is what makes the
 * activation perceptible, and it is deliberately short: this fires eight times in the self-demo,
 * and a treatment that outstays its cue becomes a tic by the third repetition.
 *
 * **established** is present and unemphatic, and stays. An element that has been reached must
 * keep its accumulated emphasis, or a slide's structure would flicker apart as narration moves.
 *
 * Three numbers, all pure, all derived from two frame numbers. This is not an animation system
 * and must not become one: archetypes consume the envelope and decide what it means for their
 * own vocabulary, and nothing here is reachable from the source (decision:10).
 *
 * Plain TypeScript rather than TSX, and no Remotion import, so the whole model is unit-testable
 * without a browser — the same reason `layout.ts` is plain.
 */

/**
 * Frames at 30fps. The heat window totals 24 frames — eight tenths of a second — which is short
 * enough to sit inside one narration cue and long enough to be seen.
 */
export const ANCHOR_TIMING = {
  /** How long an element takes to reach `established`. */
  establish: 10,
  /** Heat's attack. Fast: this is the part that has to be noticed. */
  heatRise: 3,
  /** Heat's plateau. */
  heatHold: 5,
  /** Heat's decay. Slow relative to the attack, so it reads as a settle rather than a blink. */
  heatFall: 16,
  /** How long a wipe takes to cross whatever it is wiping across. */
  sweep: 14,
} as const;

export const HEAT_FRAMES =
  ANCHOR_TIMING.heatRise + ANCHOR_TIMING.heatHold + ANCHOR_TIMING.heatFall;

export type AnchorTiming = { readonly [K in keyof typeof ANCHOR_TIMING]: number };

/**
 * The same envelope, stretched for a composition whose elements are not all on screen.
 *
 * Every other archetype activates something the viewer is already looking at, so eight tenths of
 * a second is generous. The atlas activates something the camera is still travelling towards:
 * a plate ignites, and the shot arrives about a second later. With the deck's envelope the flare
 * would have burned out before the frame got there, and the causal link — that sentence lit that
 * concept — is exactly what the transient exists to carry.
 *
 * So heat rises where the word lands, holds while the camera flies, and settles once it arrives.
 * Same three numbers, same shape, different duration; nothing else about activation changes.
 */
export const WORLD_TIMING: AnchorTiming = {
  establish: 26,
  heatRise: 6,
  heatHold: 30,
  heatFall: 34,
  sweep: 40,
} as const;

export interface AnchorState {
  /**
   * How established the element is, 0 to 1. Monotonically rises once and stays. Drives the
   * things that must persist: contrast, opacity, colour.
   */
  readonly degree: number;
  /**
   * The transient, 0 to 1 to 0, peaking at activation. Drives the things that must not persist:
   * the flare, the overshoot, the momentary brightness.
   */
  readonly heat: number;
  /**
   * A one-way wipe, 0 to 1. Separate from `degree` because a mark that draws itself across an
   * element wants its own rate, and separate from `heat` because a wipe that retreated would be
   * absurd.
   */
  readonly sweep: number;
}

/** An element the narration never reaches: established from its first frame, and never hot. */
export const ESTABLISHED: AnchorState = { degree: 1, heat: 0, sweep: 1 };

/**
 * Resolve an element's state at an absolute frame.
 *
 * `anchorFrame` is absolute because it comes from measured audio on the deck's clock
 * (decision:13), and re-deriving it against a sequence-local origin is how synchronization
 * quietly goes wrong. `undefined` means the element carries no identity, which is most elements
 * in most decks, and gets `ESTABLISHED` so nothing changes for them.
 */
export function anchorState(
  absoluteFrame: number,
  anchorFrame: number | undefined,
  timing: AnchorTiming = ANCHOR_TIMING,
): AnchorState {
  if (anchorFrame === undefined) return ESTABLISHED;

  const since = absoluteFrame - anchorFrame;
  return {
    degree: easeOut(ramp(since, timing.establish)),
    heat: heatAt(since, timing),
    sweep: easeOut(ramp(since, timing.sweep)),
  };
}

/**
 * The transient envelope: rise, hold, fall, and nothing before or after.
 *
 * Eased on both flanks. A linear attack on a colour change reads as a hard cut at this
 * duration, and a linear decay reads as the accent being switched off rather than settling.
 */
function heatAt(since: number, timing: AnchorTiming): number {
  const { heatRise, heatHold, heatFall } = timing;
  if (since <= 0 || since >= heatRise + heatHold + heatFall) return 0;
  if (since < heatRise) return easeOut(since / heatRise);
  if (since < heatRise + heatHold) return 1;
  return 1 - easeOut((since - heatRise - heatHold) / heatFall);
}

/** Linear 0..1 over `frames`, clamped at both ends. A zero-length ramp is instantaneous. */
function ramp(since: number, frames: number): number {
  if (since <= 0) return 0;
  if (frames <= 0 || since >= frames) return 1;
  return since / frames;
}

function easeOut(t: number): number {
  const remaining = 1 - t;
  return 1 - remaining * remaining * remaining;
}
