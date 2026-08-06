import { chooseLayout, type LayoutArchetype } from "../render/layout.ts";
import type { CompiledPresentation } from "./compile.ts";

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

export interface Scene {
  readonly ordinal: number;
  readonly title: string;
  readonly bullets: readonly string[];
  readonly layout: LayoutArchetype;
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
      bullets: slide.bullets,
      layout: chooseLayout(slide),
      from,
      durationInFrames,
      narrationFrom,
      narrationDurationInFrames,
      clips,
    };

    from += durationInFrames;
    return scene;
  });

  return { title: compiled.title, fps, width, height, totalFrames: from, scenes };
}
