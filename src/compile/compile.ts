import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { AuthoredSlide, Presentation } from "../presentation/parse.ts";

/**
 * The compilation boundary: authored intent plus measured narration.
 *
 * This is deliberately not the presentation IR parked in idea:3. It is the smallest thing
 * that falls out of needing narration measured before a frame can exist (dragon:1): the
 * authored slide, the audio that was actually produced for it, and the derived scene
 * length. It carries no frames, no pixels, and no React — those belong downstream, so that
 * iterating on visual design never re-synthesizes anything.
 */

export interface NarrationArtifact {
  /** Absolute path to the WAV on disk. */
  readonly path: string;
  /** Path relative to the render workspace's public directory, for `staticFile()`. */
  readonly src: string;
  /** Measured from the returned samples, never estimated. */
  readonly durationSeconds: number;
  readonly voice: string;
  readonly speed: number;
}

export interface CompiledSlide extends AuthoredSlide {
  readonly narration: NarrationArtifact;
  /** `max(minimum, pre_say + narration + post_say)`, in milliseconds. */
  readonly sceneMs: number;
}

export interface CompiledPresentation {
  readonly title: string;
  readonly slides: readonly CompiledSlide[];
  /** Handed to Remotion as its public directory; every `src` above is relative to it. */
  readonly publicDir: string;
}

/**
 * The narration seam, narrowed to what compilation needs.
 *
 * decision:8 was explicit that `synthesize()` is not the provider interface from
 * decision:4. This is not that interface either — it is the one function signature the
 * compiler depends on, which is what lets the whole pipeline be tested without a 325 MB
 * model load.
 */
export interface SynthesizeNarration {
  (request: {
    text: string;
    output: string;
    voice?: string;
    speed?: number;
  }): Promise<{ durationSeconds: number; voice: string; speed: number }>;
}

export interface CompileOptions {
  /** Disposable directory for this presentation's narration and bundle. */
  readonly workspace: string;
  readonly synthesize: SynthesizeNarration;
  readonly onProgress?: (slide: AuthoredSlide, narration: NarrationArtifact) => void;
}

/** `max(minimum slide duration, pre_say + narration + post_say)` — decision:1. */
export function deriveSceneMs(input: {
  minSlideMs: number;
  preSayMs: number;
  narrationMs: number;
  postSayMs: number;
}): number {
  return Math.max(input.minSlideMs, input.preSayMs + input.narrationMs + input.postSayMs);
}

export function narrationFileName(slide: { ordinal: number }): string {
  return `slide-${String(slide.ordinal).padStart(2, "0")}.wav`;
}

/**
 * Synthesize every slide's narration and derive its scene length.
 *
 * Sequential on purpose: one Kokoro graph is resident per process (decision:8) and this
 * round is not optimizing throughput. Each `say` is synthesized exactly once per
 * invocation — the content-addressed cache of decision:3 is still deliberately absent.
 */
export async function compilePresentation(
  presentation: Presentation,
  options: CompileOptions,
): Promise<CompiledPresentation> {
  const publicDir = join(options.workspace, "public");
  const narrationDir = join(publicDir, "narration");

  // Stale audio from a previous render of an edited deck is worse than a slow render:
  // without the cache's content addressing there is nothing to tell the two apart.
  await rm(narrationDir, { recursive: true, force: true });
  await mkdir(narrationDir, { recursive: true });

  const slides: CompiledSlide[] = [];
  for (const slide of presentation.slides) {
    const fileName = narrationFileName(slide);
    const spoken = await options.synthesize({
      text: slide.say,
      output: join(narrationDir, fileName),
      ...(presentation.voice === undefined ? {} : { voice: presentation.voice }),
      speed: presentation.speed,
    });

    const narration: NarrationArtifact = {
      path: join(narrationDir, fileName),
      src: `narration/${fileName}`,
      durationSeconds: spoken.durationSeconds,
      voice: spoken.voice,
      speed: spoken.speed,
    };

    options.onProgress?.(slide, narration);

    slides.push({
      ...slide,
      narration,
      sceneMs: deriveSceneMs({
        minSlideMs: slide.minSlideMs,
        preSayMs: slide.preSayMs,
        narrationMs: narration.durationSeconds * 1000,
        postSayMs: slide.postSayMs,
      }),
    });
  }

  return { title: presentation.title, slides, publicDir };
}
