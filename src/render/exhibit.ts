import type { ExhibitRegion } from "../presentation/exhibit.ts";

/**
 * Which part of a computed picture the narration is talking about, and how strongly.
 *
 * sprint:26 drove this from `heat`, the transient decision:17 introduced, and watching the film
 * showed why that was wrong. Every other use of `heat` changes the colour of a small thing — a
 * bullet, a term, a plate. This one changes the luminance of two thirds of the frame, and at that
 * magnitude an eight-tenths-of-a-second in-and-out does not read as emphasis. It reads as a blink:
 * the screen darkens, a box appears, and it is over before the eye has decided what happened.
 *
 * The right shape was already in the repository and it is not `heat`. decision:47 settled occupancy
 * for the machine — **persistent, exclusive, and released** — and "which part of the chart are we
 * talking about" is exactly that. One region at a time, from the moment its sentence starts until
 * the narration has moved on.
 *
 * **The hold is derived, not chosen.** An anchor knows which clip activated it and every clip was
 * measured, so the sentence's own length is what the emphasis lasts. Nobody writes a duration, and
 * rewording the narration changes how long the chart stays lit — which is decision:35's rule
 * ("derive what a silent step is worth") applied to a different silence-shaped question.
 *
 * Plain TypeScript and no Remotion import, like `./layout.ts` and `./anchor.ts`, so the whole model
 * is unit-testable without a browser.
 *
 * Deliberately **local**. A third global envelope beside `ANCHOR_TIMING` and `WORLD_TIMING` would be
 * claiming that "large-area veil" is a general problem this system has, and it is not: it is what
 * one archetype costs, because one archetype cannot recolour its content.
 */

/** How the veil moves. Frames at 30fps; unreachable from any source. */
export interface FocusTiming {
  /** Long enough to read as a fade rather than a cut. */
  readonly rise: number;
  /** Slower than the rise, so the picture settles back rather than snapping. */
  readonly fall: number;
  /** How long the opening takes to travel when one sentence hands over to the next. */
  readonly move: number;
}

/** One sentence's claim on one region, over the interval that sentence occupies. */
export interface FocusSpan {
  readonly region: ExhibitRegion;
  /** Absolute frame the sentence's first sound lands on — the anchor's own frame. */
  readonly from: number;
  /** Absolute frame the sentence ends on. Measured, never estimated. */
  readonly until: number;
}

export interface Focus {
  /** Where the opening is, which is a region except while one is handing over to the next. */
  readonly region: ExhibitRegion;
  /** How dark the rest of the picture is, 0 to 1, before the archetype's own depth is applied. */
  readonly veil: number;
}

/**
 * Every sentence that reached a region, as an interval.
 *
 * Per-sentence rather than per-region: an interval ends when its own clip ends. A region named
 * twice on one slide is therefore two claims rather than one long one, which is right — what is
 * being modelled is when the narration was talking about it, not that it ever did.
 *
 * Whether two claims release between them is `focusRuns`'s question, not this one's.
 */
export function focusSpans(
  scene: {
    readonly anchors: readonly {
      elementIndex: number;
      clipIndex: number;
      frame: number;
    }[];
    readonly clips: readonly { from: number; durationInFrames: number }[];
  },
  regions: readonly ExhibitRegion[],
): readonly FocusSpan[] {
  const spans: FocusSpan[] = [];
  for (const anchor of scene.anchors) {
    const region = regions[anchor.elementIndex];
    if (region === undefined) continue;
    const clip = scene.clips[anchor.clipIndex];
    // A clip is always present for a resolved anchor. If one ever is not, the sentence's length is
    // unknown and the honest fallback is a claim with no duration rather than an invented one.
    const until = clip === undefined ? anchor.frame : clip.from + clip.durationInFrames;
    spans.push({ region, from: anchor.frame, until: Math.max(until, anchor.frame) });
  }
  return spans.sort((a, b) => a.from - b.from);
}

/**
 * Consecutive claims that never let go of the picture, merged into one.
 *
 * Overlapping each span's own ramps was the first attempt and it pulsed: a fall and a rise crossing
 * leaves a dip to two thirds at the handover, which is a 33% lighten and back — smaller than the
 * blink this module removed and the same kind of artefact.
 *
 * So the rule is stated directly instead of hoped for: **an interrupted release is not a release.**
 * Two sentences join when the second begins before the veil would have finished settling, which
 * makes the demo's back-to-back pair one continuous hold, keeps a short authored `pause:` between
 * two chart sentences from strobing, and still lets a genuinely distant pair release — because by
 * then the picture really has been left alone.
 */
export function focusRuns(
  spans: readonly FocusSpan[],
  timing: FocusTiming,
): readonly { from: number; until: number }[] {
  const runs: { from: number; until: number }[] = [];
  for (const span of spans) {
    const open = runs.at(-1);
    if (open !== undefined && span.from <= open.until + timing.fall) {
      open.until = Math.max(open.until, span.until);
      continue;
    }
    runs.push({ from: span.from, until: span.until });
  }
  return runs;
}

/**
 * What the veil is doing on one frame.
 *
 * Strength comes from the *run*, so a handover has no envelope of its own to go wrong. The opening
 * comes from the *span*, and travels from the previous one over `move` frames — travelling rather
 * than cutting, because a cut at full veil is a second flash, and because attention moving across a
 * chart is what is actually happening.
 */
export function focusAt(
  spans: readonly FocusSpan[],
  frame: number,
  timing: FocusTiming,
): Focus | undefined {
  let veil = 0;
  for (const run of focusRuns(spans, timing)) {
    veil = Math.max(veil, strength(run, frame, timing));
  }
  if (veil <= 0) return undefined;

  let current: FocusSpan | undefined;
  let previous: FocusSpan | undefined;
  for (const span of spans) {
    if (span.from > frame) break;
    previous = current;
    current = span;
  }
  if (current === undefined) return undefined;

  if (previous === undefined || timing.move <= 0) return { veil, region: current.region };
  const travel = clampUnit((frame - current.from) / timing.move);
  return {
    veil,
    region:
      travel >= 1 ? current.region : between(previous.region, current.region, travel),
  };
}

/**
 * One run's envelope: up over `rise`, held until the last sentence in it ends, down over `fall`.
 *
 * The rise is clamped to the run so a very short one still reaches full strength at its own end
 * rather than being cut off partway up.
 */
function strength(
  run: { from: number; until: number },
  frame: number,
  timing: FocusTiming,
): number {
  if (frame < run.from) return 0;
  if (frame > run.until + timing.fall) return 0;
  if (frame <= run.until) {
    const rise = Math.max(1, Math.min(timing.rise, run.until - run.from));
    return clampUnit((frame - run.from) / rise);
  }
  return clampUnit(1 - (frame - run.until) / Math.max(1, timing.fall));
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

function clampUnit(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
