import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { renderIdFor, stampFor, STAMP_TAG } from "../compile/provenance.ts";
import type { Timeline } from "../compile/timeline.ts";
import { repositoryRoot } from "../tts/model.ts";
import { describeMissingFaces } from "./faces.ts";

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
  /** Stamped into the film's own metadata, and into the symbol table beside it (decision:67). */
  readonly renderId: string;
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

  // Before anything expensive, and before anything that could succeed while being wrong.
  //
  // A deck that asked for the hyperlegible profile and does not have the faces installed would
  // otherwise bundle for a minute, render for several more, and produce a film set in whatever the
  // host happens to have — which is a *silent* failure of the only thing that deck asked for. So it
  // fails here, by name, with the one command that fixes it. Costs eight `existsSync` calls, and
  // nothing at all for a deck in the default profile (`./faces.ts`).
  const missing = describeMissingFaces(timeline.typography);
  if (missing !== undefined) throw new RenderError(missing);

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

  // The film's half of the birth certificate (decision:67). Computed from the same timeline the
  // symbol table is computed from, a few lines from now, so the two cannot disagree about which
  // render they came from — there is one function and one input.
  //
  // Remotion prepends its own comment to whatever it is given, so what lands in the container is
  // `Made with Remotion 4.0.506; cuecraft renderId=sha256:…`. That is why `renderIdIn` searches the
  // tag rather than matching it whole.
  const renderId = renderIdFor(timeline);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: options.output,
    inputProps,
    logLevel: "error",
    metadata: { [STAMP_TAG]: stampFor(renderId) },
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
    renderId,
  };
}
