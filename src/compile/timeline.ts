import { bodyElements, type SlideBody } from "../presentation/body.ts";
import { chooseLayout, type LayoutArchetype } from "../render/layout.ts";
import type { CompiledPresentation } from "./compile.ts";
import { freezeFacts, type CompilationFacts } from "./facts.ts";

/**
 * The rendering boundary: the only place in cuecraft where a duration becomes frames.
 *
 * dragon:1 asks for exactly one rounding rule, in one place, because a rule applied twice
 * differently is how audio drifts against slides over a long deck. The rule is here and
 * it is one line: **a duration occupies every frame it touches, and never fewer**.
 *
 * Rounding up rather than to nearest costs at most a frame of padding per component and
 * buys a guarantee that is otherwise fiddly to argue: narration is always fully contained
 * by its scene, and the next slide can never begin over the tail of the previous one.
 * Because every scene length is an integer computed independently, scene starts are exact
 * prefix sums — there is no accumulating fractional error to drift.
 *
 * The same reasoning applies within a slide's narration. Clip positions accumulate in whole
 * frames rather than being converted from seconds independently, because `ceil(a) + ceil(b)`
 * can exceed `ceil(a + b)` — which would let one clip start a frame before the previous one
 * finished.
 *
 * This also carries the chosen layout. Selection is deterministic and derived from content
 * (see `../render/layout.ts`), so resolving it here keeps the React components free of
 * decisions and lets the CLI report what each slide was given without launching a browser.
 */

export const DEFAULT_FPS = 30;
export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;

/** The one rounding rule. Nothing else in cuecraft may convert seconds to frames. */
export function framesFor(seconds: number, fps: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError(`cannot convert ${seconds}s to frames`);
  }
  if (!Number.isInteger(fps) || fps <= 0) {
    throw new RangeError(`fps must be a positive integer, got ${fps}`);
  }
  return Math.ceil(seconds * fps);
}

export interface Clip {
  /** Public-directory-relative path to this clip's audio. */
  readonly src: string;
  /** Absolute frame at which the clip starts. */
  readonly from: number;
  readonly durationInFrames: number;
}

/**
 * A resolved link between a moment in the narration and an element on the slide.
 *
 * Deliberately a record of the *relationship* rather than a field on the element saying when
 * to light up. Both endpoints stay addressable, so the same structure answers "when does
 * this element become established?" and "which narration reaches this element?" — and a later
 * caption, seek or debugger would read it in the other direction without this having to be
 * rebuilt (decision:14). Nothing today reads it backwards; the point is that it could.
 */
export interface Anchor {
  readonly id: string;
  /** Index into `bodyElements(Scene.body)` — a list item, or a mark on a code specimen. */
  readonly elementIndex: number;
  /** Index into `Scene.clips`. */
  readonly clipIndex: number;
  /**
   * Absolute frame at which the relationship activates: the clip's start plus its measured
   * leading silence, so the visual lands with the first spoken sound rather than with the
   * clip boundary about nine frames earlier.
   */
  readonly frame: number;
}

export interface Scene {
  readonly ordinal: number;
  readonly title: string;
  /** Carried through verbatim: the renderer needs what the content *means*, not a flattening. */
  readonly body: SlideBody;
  readonly layout: LayoutArchetype;
  /** Empty on a slide that names no identities, which is most of them. */
  readonly anchors: readonly Anchor[];
  /** Absolute frame at which the slide appears. */
  readonly from: number;
  readonly durationInFrames: number;
  /** Absolute frame at which narration starts: `from + pre_say`. */
  readonly narrationFrom: number;
  /** Speech plus authored pauses, end to end. */
  readonly narrationDurationInFrames: number;
  readonly clips: readonly Clip[];
}

export interface Timeline {
  readonly title: string;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly totalFrames: number;
  readonly scenes: readonly Scene[];
  /**
   * What the compilation derived, frozen, for a presentation that wants to show it.
   *
   * Computed last, from scenes that are already final, and read-only from here on — see
   * `./facts.ts` for why that ordering is the whole of the acyclicity argument.
   */
  readonly facts: CompilationFacts;
}

export interface TimelineOptions {
  readonly fps?: number;
  readonly width?: number;
  readonly height?: number;
}

/**
 * Lay the compiled presentation onto a frame timeline.
 *
 * Pure: given the same compiled presentation it always produces the same timeline, which
 * is what makes visual iteration free of synthesis.
 */
export function buildTimeline(
  compiled: CompiledPresentation,
  options: TimelineOptions = {},
): Timeline {
  const fps = options.fps ?? DEFAULT_FPS;
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

  let from = 0;
  const scenes = compiled.slides.map((slide): Scene => {
    const preSayFrames = framesFor(slide.preSayMs / 1000, fps);
    const postSayFrames = framesFor(slide.postSayMs / 1000, fps);
    const minimumFrames = framesFor(slide.minSlideMs / 1000, fps);
    const narrationFrom = from + preSayFrames;

    // Walk the clips in frames. Each clip is pushed to at least where its measured offset
    // lands, and never before the previous clip has finished.
    let cursor = 0;
    const clips = slide.narration.clips.map((clip): Clip => {
      cursor = Math.max(cursor, framesFor(clip.offsetSeconds, fps));
      const placed: Clip = {
        src: clip.src,
        from: narrationFrom + cursor,
        durationInFrames: framesFor(clip.durationSeconds, fps),
      };
      cursor += placed.durationInFrames;
      return placed;
    });

    // Both ends of every relationship, resolved to a frame. Validation already guaranteed
    // that each `activates` names an element on this slide, so a miss here is a compiler bug
    // rather than an authoring error, and dropping it silently is not an option.
    //
    // Resolution goes through `bodyElements`, so this is identical whether the identity was
    // declared on a bullet, a step, or a mark on a code specimen.
    const elements = bodyElements(slide.body);
    const anchors: Anchor[] = [];
    slide.narration.clips.forEach((clip, clipIndex) => {
      if (clip.activates === undefined) return;
      const elementIndex = elements.findIndex((element) => element.id === clip.activates);
      if (elementIndex === -1) {
        throw new Error(
          `slide ${slide.ordinal}: narration activates "${clip.activates}" but nothing on the slide declares it`,
        );
      }
      const placed = clips[clipIndex];
      if (placed === undefined) return;
      anchors.push({
        id: clip.activates,
        elementIndex,
        clipIndex,
        frame: placed.from + framesFor(clip.leadingSilenceSeconds, fps),
      });
    });

    // The track runs to whichever is later: the last clip's end, or a trailing pause.
    const narrationDurationInFrames = Math.max(
      cursor,
      framesFor(slide.narration.durationSeconds, fps),
    );

    const durationInFrames = Math.max(
      minimumFrames,
      preSayFrames + narrationDurationInFrames + postSayFrames,
    );

    const scene: Scene = {
      ordinal: slide.ordinal,
      title: slide.title,
      body: slide.body,
      layout: chooseLayout(slide),
      anchors,
      from,
      durationInFrames,
      narrationFrom,
      narrationDurationInFrames,
      clips,
    };

    from += durationInFrames;
    return scene;
  });

  // The last statement, deliberately: everything above is settled, and nothing below may write
  // to what it produced. This is the freeze boundary (`./facts.ts`).
  return {
    title: compiled.title,
    fps,
    width,
    height,
    totalFrames: from,
    scenes,
    facts: freezeFacts(compiled, scenes, fps, from),
  };
}
