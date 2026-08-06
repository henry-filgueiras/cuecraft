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

export interface Scene {
  readonly ordinal: number;
  readonly title: string;
  readonly bullets: readonly string[];
  /** Public-directory-relative path to this scene's narration. */
  readonly narrationSrc: string;
  /** Absolute frame at which the slide appears. */
  readonly from: number;
  readonly durationInFrames: number;
  /** Absolute frame at which narration starts: `from + pre_say`. */
  readonly narrationFrom: number;
  readonly narrationDurationInFrames: number;
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
    const narrationFrames = framesFor(slide.narration.durationSeconds, fps);
    const postSayFrames = framesFor(slide.postSayMs / 1000, fps);
    const minimumFrames = framesFor(slide.minSlideMs / 1000, fps);

    const durationInFrames = Math.max(
      minimumFrames,
      preSayFrames + narrationFrames + postSayFrames,
    );

    const scene: Scene = {
      ordinal: slide.ordinal,
      title: slide.title,
      bullets: slide.bullets,
      narrationSrc: slide.narration.src,
      from,
      durationInFrames,
      narrationFrom: from + preSayFrames,
      narrationDurationInFrames: narrationFrames,
    };

    from += durationInFrames;
    return scene;
  });

  return { title: compiled.title, fps, width, height, totalFrames: from, scenes };
}
