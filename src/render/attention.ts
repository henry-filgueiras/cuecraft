/**
 * What narration is currently talking about, and how strongly — for exhibits.
 *
 * decision:58 settled this for one archetype and one shape of content: a chart region is
 * **persistent, exclusive, and released**, held for as long as the sentence that named it, handed
 * over rather than released when the next sentence names another. That was decision:47's occupancy
 * applied to a picture, and it was written inside `./exhibit.ts` because one caller is not evidence
 * of a shared concept — which is exactly what idea:20 says, and why promoting occupancy into
 * `./anchor.ts` stayed parked.
 *
 * sprint:28 produced the second and third callers. A named element of an R-drawn SVG and a row of a
 * computed table both want the same four sentences: one thing at a time, from when its sentence
 * starts until narration has moved on, merged when a release is interrupted, travelling rather than
 * cutting. So the shape can now be *measured* rather than guessed, and what it turned out to be is
 * this module: an interval model over claims, with no idea what it is claiming.
 *
 * ## What is shared, and what deliberately is not
 *
 * Shared: when attention starts, when it ends, whether two claims are one, and how far a handover
 * has got. All of that is arithmetic over frame numbers.
 *
 * **Not** shared: what being attended to *looks like*. A chart veils everything else because a
 * raster cannot recolour part of itself; a drawing recedes its other named elements because it can;
 * a table lights a row and goes and finds it. Those are three different treatments of one signal,
 * which is decision:17's "one vocabulary, four dialects" with the nouns changed.
 *
 * And still not shared with `./anchor.ts`. This is not a fourth number beside `degree`, `heat` and
 * `sweep`; it is derived where it is consumed, by the archetypes that have a *current* one. Eleven
 * other archetypes ask only "has narration reached this yet", and giving them a fourth quantity to
 * ignore would be claiming the activation model has a defect it does not have.
 *
 * ## Tracks
 *
 * A table can be talking about a row and a column at once, and the intersection is the answer to
 * both. That is two independent occupancies, not one occupancy over a set — within a track it is
 * still exclusive, because "which row are we on" has one answer.
 *
 * Two tracks rather than a selection algebra is the whole of what makes row-and-column expressible
 * without `activates:` learning a list, a predicate, or a pair.
 *
 * Plain TypeScript and no Remotion import, like `./anchor.ts` and `./layout.ts`, so the model is
 * unit-testable without a browser.
 */

/** How attention moves. Frames at 30fps; unreachable from any source. */
export interface AttentionTiming {
  /** Long enough to read as a change of state rather than a cut. */
  readonly rise: number;
  /** Slower than the rise, so the frame settles back rather than snapping. */
  readonly fall: number;
  /** How long a handover takes to travel when one sentence gives way to the next. */
  readonly move: number;
}

/** One sentence's claim on one element, over the interval that sentence occupies. */
export interface AttentionClaim {
  /** Which element, as an index into whatever list the archetype is addressing. */
  readonly index: number;
  /** Absolute frame the sentence's first sound lands on — the anchor's own frame. */
  readonly from: number;
  /** Absolute frame the sentence ends on. Measured, never estimated. */
  readonly until: number;
}

export interface Attention {
  /** What is attended now. During a handover this is still the *arriving* element. */
  readonly index: number;
  /** What was attended before it, when a handover is in progress. */
  readonly from: number | undefined;
  /** How far the handover has got, 0 to 1. Exactly 1 whenever nothing is travelling. */
  readonly travel: number;
  /** How strongly, 0 to 1. Exactly 0 at ground, and ground is every frame outside a run. */
  readonly strength: number;
}

/** The shape a scene has to have to be read. Structural, so a test needs no timeline. */
export interface AttentionScene {
  readonly anchors: readonly {
    readonly elementIndex: number;
    readonly clipIndex: number;
    readonly frame: number;
  }[];
  readonly clips: readonly { readonly from: number; readonly durationInFrames: number }[];
}

/**
 * Every sentence that reached an element of one track, as an interval.
 *
 * Per-sentence rather than per-element: an interval ends when its own clip ends. An element named
 * twice on one slide is therefore two claims rather than one long one, which is right — what is
 * being modelled is *when narration was talking about it*, not that it ever did.
 *
 * `track` is what makes a second axis possible. It is a predicate over the element index rather
 * than a field on the anchor, because an anchor does not know what it addresses and should not: the
 * archetype laying the content out is the only thing that knows a row index from a column index.
 */
export function attentionClaims(
  scene: AttentionScene,
  track: (elementIndex: number) => boolean = () => true,
): readonly AttentionClaim[] {
  const claims: AttentionClaim[] = [];
  for (const anchor of scene.anchors) {
    if (!track(anchor.elementIndex)) continue;
    const clip = scene.clips[anchor.clipIndex];
    // A clip is always present for a resolved anchor. If one ever is not, the sentence's length is
    // unknown and the honest fallback is a claim with no duration rather than an invented one.
    const until = clip === undefined ? anchor.frame : clip.from + clip.durationInFrames;
    claims.push({
      index: anchor.elementIndex,
      from: anchor.frame,
      until: Math.max(until, anchor.frame),
    });
  }
  return claims.sort((a, b) => a.from - b.from);
}

/**
 * Consecutive claims that never let go, merged into one.
 *
 * Overlapping each claim's own ramps was tried first (sprint:27) and pulses: a fall crossing a rise
 * dips to two thirds at the handover, which is a lighten-and-back at exactly the moment attention
 * is moving. So the rule is stated directly rather than hoped for: **an interrupted release is not
 * a release.** Two sentences join when the second begins before the frame would have finished
 * settling, and the threshold is `fall` itself, because that is the definition rather than an
 * approximation of one.
 */
export function attentionRuns(
  claims: readonly AttentionClaim[],
  timing: AttentionTiming,
): readonly { from: number; until: number }[] {
  const runs: { from: number; until: number }[] = [];
  for (const claim of claims) {
    const open = runs.at(-1);
    if (open !== undefined && claim.from <= open.until + timing.fall) {
      open.until = Math.max(open.until, claim.until);
      continue;
    }
    runs.push({ from: claim.from, until: claim.until });
  }
  return runs;
}

/**
 * What one track is doing on one frame, or nothing at all — which is ground.
 *
 * Strength comes from the **run**, so a handover has no envelope of its own to go wrong. Which
 * element, and how far it has travelled from the last one, comes from the **claim**. Separating
 * those two is the whole of why the veil does not dip when attention moves.
 *
 * The undefined return is the ground-state guarantee, and it is exact rather than asymptotic: every
 * frame before the first claim and every frame more than `fall` after the last one returns nothing,
 * so an archetype that draws nothing when there is no attention is *by construction* identical to
 * the frame it started on.
 */
export function attentionAt(
  claims: readonly AttentionClaim[],
  frame: number,
  timing: AttentionTiming,
): Attention | undefined {
  let strength = 0;
  for (const run of attentionRuns(claims, timing)) {
    strength = Math.max(strength, envelope(run, frame, timing));
  }
  if (strength <= 0) return undefined;

  let current: AttentionClaim | undefined;
  let previous: AttentionClaim | undefined;
  for (const claim of claims) {
    if (claim.from > frame) break;
    previous = current;
    current = claim;
  }
  if (current === undefined) return undefined;

  const travel =
    previous === undefined || timing.move <= 0
      ? 1
      : clampUnit((frame - current.from) / timing.move);

  return {
    index: current.index,
    // Only while it is actually going somewhere. A settled handover reporting where it came from
    // would make every consumer write the `travel >= 1` check this one writes once.
    from: travel >= 1 || previous === undefined ? undefined : previous.index,
    travel,
    strength,
  };
}

/**
 * One run's envelope: up over `rise`, held until the last sentence in it ends, down over `fall`.
 *
 * The rise is clamped to the run so a very short one still reaches full strength at its own end
 * rather than being cut off partway up.
 */
function envelope(
  run: { from: number; until: number },
  frame: number,
  timing: AttentionTiming,
): number {
  if (frame < run.from) return 0;
  if (frame > run.until + timing.fall) return 0;
  if (frame <= run.until) {
    const rise = Math.max(1, Math.min(timing.rise, run.until - run.from));
    return clampUnit((frame - run.from) / rise);
  }
  return clampUnit(1 - (frame - run.until) / Math.max(1, timing.fall));
}

export function clampUnit(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
