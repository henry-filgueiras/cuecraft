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

export interface SceneBullet {
  readonly text: string;
  /** The semantic identity this element carries, if the author gave it one. */
  readonly id?: string;
}

/**
 * A resolved link between a moment in the narration and an element on the slide.
 *
 * Deliberately a record of the *relationship* rather than a field on the bullet saying when
 * to light up. Both endpoints stay addressable, so the same structure answers "when does
 * this bullet become established?" and "which narration reaches this bullet?" — and a later
 * caption, seek or debugger would read it in the other direction without this having to be
 * rebuilt (decision:14). Nothing today reads it backwards; the point is that it could.
 */
export interface Anchor {
  readonly id: string;
  /** Index into `Scene.bullets`. */
  readonly bulletIndex: number;
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
  readonly bullets: readonly SceneBullet[];
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
    // that each `activates` names a bullet on this slide, so a miss here is a compiler bug
    // rather than an authoring error, and dropping it silently is not an option.
    const anchors: Anchor[] = [];
    slide.narration.clips.forEach((clip, clipIndex) => {
      if (clip.activates === undefined) return;
      const bulletIndex = slide.bullets.findIndex(
        (bullet) => bullet.id === clip.activates,
      );
      if (bulletIndex === -1) {
        throw new Error(
          `slide ${slide.ordinal}: narration activates "${clip.activates}" but no bullet declares it`,
        );
      }
      const placed = clips[clipIndex];
      if (placed === undefined) return;
      anchors.push({
        id: clip.activates,
        bulletIndex,
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
      bullets: slide.bullets.map((bullet): SceneBullet =>
        bullet.id === undefined
          ? { text: bullet.text }
          : { text: bullet.text, id: bullet.id },
      ),
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

  return { title: compiled.title, fps, width, height, totalFrames: from, scenes };
}
