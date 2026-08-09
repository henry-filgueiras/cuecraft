import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { Timeline } from "../compile/timeline.ts";
import { repositoryRoot } from "../tts/model.ts";

/**
 * Driving Remotion from Node.
 *
 * decision:5 delegates composition, encoding and muxing to Remotion and ffmpeg. This file
 * is therefore deliberately thin: it locates the entry point, bundles it, asks Remotion
 * what the composition's metadata is given our timeline, and renders. There is no manual
 * ffmpeg invocation here, because Remotion already owns that layer — including placing
 * each narration clip at its frame and mixing the result into the MP4's audio track.
 *
 * Remotion is imported lazily. It pulls in a webpack toolchain and a Chromium binding that
 * cost real time to load, and `cuecraft --help` should not pay for them.
 */

export const COMPOSITION_ID = "presentation";

/**
 * The diagnostic composition registered beside the film (`./entry.tsx`).
 *
 * Mirrored here for the reason `COMPOSITION_ID` is: `entry.tsx` is TSX handed to Remotion's own
 * toolchain and is never imported by Node, so anything Node needs to name has to be named twice.
 * Nothing in the render path uses this — it exists so the recall byte-equivalence proof has a
 * surface to be asserted against now that the film itself frames a quotation.
 */
export const CANVAS_ID = "recalled-canvas";

export class RenderError extends Error {}

/** The parts of a render worth telling a waiting human about. */
export type RenderStage = "browser" | "bundle" | "compose" | "render";

export interface RenderOptions {
  readonly timeline: Timeline;
  /** Served to the composition as its static file root; holds `narration/`. */
  readonly publicDir: string;
  /** Where the webpack bundle is written. Disposable. */
  readonly bundleDir: string;
  readonly output: string;
  readonly onStage?: (stage: RenderStage) => void;
  /** 0..1, reported during encoding only. */
  readonly onProgress?: (progress: number) => void;
}

export interface RenderReport {
  readonly output: string;
  readonly codec: string;
  readonly audioCodec: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly totalFrames: number;
}

/**
 * The composition source, resolved from the repository rather than from `import.meta`.
 *
 * Remotion compiles TSX itself, so it is pointed at the TypeScript source in both a
 * from-source run and a `dist/` run — `tsc` never emits these files, and a JSX-free copy
 * of them would be a second thing to keep in step.
 */
export function entryPoint(): string {
  return join(repositoryRoot(), "src", "render", "entry.tsx");
}

export async function renderPresentation(options: RenderOptions): Promise<RenderReport> {
  const { timeline } = options;

  const [{ bundle }, { ensureBrowser, renderMedia, selectComposition }] =
    await Promise.all([import("@remotion/bundler"), import("@remotion/renderer")]);

  // Remotion's documented bootstrap: fetches a pinned Chrome Headless Shell into its own
  // cache directory on first use, and is a no-op afterwards. Nothing lands in the repo.
  options.onStage?.("browser");
  await ensureBrowser();

  options.onStage?.("bundle");
  await mkdir(options.bundleDir, { recursive: true });
  const serveUrl = await bundle({
    entryPoint: entryPoint(),
    publicDir: options.publicDir,
    outDir: options.bundleDir,
  });

  const inputProps = { timeline };

  options.onStage?.("compose");
  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps,
    logLevel: "error",
  });

  if (composition.durationInFrames !== timeline.totalFrames) {
    throw new RenderError(
      `composition resolved to ${composition.durationInFrames} frames but the timeline ` +
        `derived ${timeline.totalFrames}; narration would be clipped`,
    );
  }

  options.onStage?.("render");
  await mkdir(dirname(options.output), { recursive: true });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: options.output,
    inputProps,
    logLevel: "error",
    ...(options.onProgress === undefined
      ? {}
      : {
          onProgress: ({ progress }: { progress: number }) => {
            options.onProgress?.(progress);
          },
        }),
  });

  return {
    output: options.output,
    codec: "h264",
    audioCodec: "aac",
    width: composition.width,
    height: composition.height,
    fps: composition.fps,
    totalFrames: composition.durationInFrames,
  };
}
