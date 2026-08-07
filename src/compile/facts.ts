import type { CompiledPresentation } from "./compile.ts";
import type { Scene } from "./timeline.ts";

/**
 * What the compiler worked out, frozen, and offered back to the presentation.
 *
 * Every other thing cuecraft puts on screen came from the author: their prose, their structure,
 * their quoted source. This is the one thing that came from the *compilation* — the measured
 * length of a synthesized sentence, the frame an anchor resolved to, the boundaries of a track
 * nobody typed. idea:12 parked "derive a figure from the presentation's own compilation" as
 * speculative; this is that idea with a shape.
 *
 * ## The freeze boundary
 *
 * These facts are computed by the **last statement of `buildTimeline`**, from scenes that are
 * already finished, and nothing downstream may write to them. That placement is the whole of the
 * safety argument, and it is worth stating as a phase order:
 *
 *     author -> synthesize -> measure -> lay out the timeline -> FREEZE -> project -> render
 *                                                                   ^
 *                                        everything to the left is closed by the time
 *                                        anything to the right can read it
 *
 * ## Why this cannot become a cycle
 *
 * The obvious disaster is a figure that changes what it measures:
 *
 *     narration duration -> figure content -> narration duration -> ...
 *
 * Three things make that unreachable, and only the third is a rule anybody has to remember:
 *
 * 1. **A figure contributes no elements and no text.** `bodyElements` returns nothing for one, so
 *    no anchor can point into it, and it adds no words to be spoken. Scene durations are computed
 *    from narration alone and are already final when this runs.
 * 2. **Facts are derived from finished scenes, not from anything a figure did.** `freezeFacts`
 *    takes the completed timeline and reads it; it has no way to reach back.
 * 3. **The format cannot interpolate a derived value into narration.** There is no binding syntax
 *    in `say:`, deliberately. An author who *types* "three point eight seconds" into a sentence
 *    has hard-coded a number the same way anyone hard-codes a number, and the figure beside it
 *    will visibly disagree — which is a much better failure than a compiler that will not settle.
 *
 * ## What is deliberately absent
 *
 * This is not reflection. There is no way to ask for an arbitrary field, no expression language,
 * no path syntax, and no route from the source to anything not listed below. A figure names a
 * *kind*, and this module decides what that kind means. Widening it is a decision, not a knob.
 */

/** One synthesized sentence, as it actually came out. */
export interface ClipFact {
  /** 1-based across the whole deck, which is the order they are heard in. */
  readonly ordinal: number;
  /** What was spoken. The author's own words, carried through for labelling. */
  readonly text: string;
  /** Absolute frame the clip begins on. */
  readonly from: number;
  readonly durationInFrames: number;
  /** Measured from the returned samples, never estimated (decision:13). */
  readonly seconds: number;
  /** Seconds of silence before the first audible sample. */
  readonly onsetSeconds: number;
}

/** One resolved relationship between a moment in the narration and a thing on the slide. */
export interface AnchorFact {
  /** The identity the author wrote in two places. */
  readonly id: string;
  /** Which spoken sentence reached it, by deck-wide ordinal. */
  readonly clipOrdinal: number;
  /** The sentence itself. Authored. */
  readonly text: string;
  /** Absolute frame it becomes true. Derived — this is the number nobody typed. */
  readonly frame: number;
  readonly seconds: number;
}

export interface CompilationFacts {
  readonly fps: number;
  readonly totalFrames: number;
  readonly totalSeconds: number;
  /** Every sentence that was synthesized, in the order they are heard. */
  readonly clips: readonly ClipFact[];
  /** Every relationship that resolved, in the order they become true. */
  readonly anchors: readonly AnchorFact[];
}

/**
 * Freeze what the timeline derived.
 *
 * Deck-wide rather than per-scene, because "which sentence am I hearing" is a question about the
 * video and not about a slide. Ordinals are assigned in playback order for the same reason.
 */
export function freezeFacts(
  compiled: CompiledPresentation,
  scenes: readonly Scene[],
  fps: number,
  totalFrames: number,
): CompilationFacts {
  const clips: ClipFact[] = [];
  const anchors: AnchorFact[] = [];
  /** Where each scene's clips landed in the deck-wide numbering. */
  const ordinalOf = new Map<string, number>();

  scenes.forEach((scene, index) => {
    const spoken = compiled.slides[index]?.narration.clips ?? [];
    scene.clips.forEach((clip, clipIndex) => {
      const source = spoken[clipIndex];
      const ordinal = clips.length + 1;
      ordinalOf.set(`${index}:${clipIndex}`, ordinal);
      clips.push({
        ordinal,
        text: source?.text ?? "",
        from: clip.from,
        durationInFrames: clip.durationInFrames,
        seconds: source?.durationSeconds ?? clip.durationInFrames / fps,
        onsetSeconds: source?.leadingSilenceSeconds ?? 0,
      });
    });
  });

  scenes.forEach((scene, index) => {
    for (const anchor of scene.anchors) {
      const ordinal = ordinalOf.get(`${index}:${anchor.clipIndex}`) ?? 0;
      anchors.push({
        id: anchor.id,
        clipOrdinal: ordinal,
        text: clips[ordinal - 1]?.text ?? "",
        frame: anchor.frame,
        seconds: anchor.frame / fps,
      });
    }
  });
  anchors.sort((a, b) => a.frame - b.frame);

  return Object.freeze({
    fps,
    totalFrames,
    totalSeconds: totalFrames / fps,
    clips: Object.freeze(clips),
    anchors: Object.freeze(anchors),
  });
}

/**
 * The clip being heard on a given frame, or the one most recently heard.
 *
 * "Most recently" rather than "none" during a pause, because a marker that vanished in the silence
 * between two sentences would read as a bug rather than as a gap.
 */
export function clipAt(facts: CompilationFacts, frame: number): ClipFact | undefined {
  let current: ClipFact | undefined;
  for (const clip of facts.clips) {
    if (clip.from > frame) break;
    current = clip;
  }
  return current;
}

/** The relationship that most recently became true. */
export function anchorAt(facts: CompilationFacts, frame: number): AnchorFact | undefined {
  let current: AnchorFact | undefined;
  for (const anchor of facts.anchors) {
    if (anchor.frame > frame) break;
    current = anchor;
  }
  return current;
}

/**
 * The neighbourhood of a moment, rather than all of it.
 *
 * Raw compiler state is not automatically good presentation content: a deck with thirty resolved
 * anchors put on screen at once is a debugger, and reading it is work. So the projection selects —
 * truthfully, and by a rule the viewer can infer — the few nearest what is happening now, keeping
 * the current one where it is in the list rather than re-centring it every time.
 */
export function around<T>(
  items: readonly T[],
  index: number,
  span: number,
): { readonly items: readonly T[]; readonly offset: number } {
  if (items.length <= span) return { items, offset: 0 };
  const half = Math.floor(span / 2);
  const offset = Math.min(Math.max(index - half, 0), items.length - span);
  return { items: items.slice(offset, offset + span), offset };
}
