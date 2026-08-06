import { readFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

import {
  compilePresentation,
  type CompiledPresentation,
  type NarrationArtifact,
} from "./compile/compile.ts";
import { buildTimeline, type Timeline } from "./compile/timeline.ts";
import type { AuthoredSlide } from "./presentation/parse.ts";
import { parsePresentation, PresentationError } from "./presentation/parse.ts";
import {
  renderPresentation,
  type RenderReport,
  type RenderStage,
} from "./render/render.ts";
import { synthesize } from "./tts/kokoro.ts";
import { repositoryRoot } from "./tts/model.ts";

/**
 * YAML in, MP4 out — the whole of `cuecraft render`, with the stages named.
 *
 * The ordering is forced rather than chosen: Remotion needs a duration in frames before it
 * renders anything, and that duration comes from audio that does not exist yet (dragon:1).
 * So synthesis strictly precedes timing, and timing strictly precedes rendering.
 *
 *     read -> parse -> synthesize -> time -> render
 *
 * Naming the stage on every failure is the difference between "cuecraft crashed" and "your
 * fourth slide's narration is too long for one Kokoro window".
 */

export type Stage = "read" | "parse" | "synthesize" | "time" | RenderStage;

export class StageError extends Error {
  readonly stage: Stage;

  constructor(stage: Stage, message: string) {
    super(message);
    this.stage = stage;
  }
}

export interface RenderEvents {
  readonly onStage?: (stage: Stage) => void;
  readonly onWarning?: (message: string) => void;
  readonly onNarration?: (slide: AuthoredSlide, narration: NarrationArtifact) => void;
  readonly onProgress?: (progress: number) => void;
}

export interface RenderSummary {
  readonly title: string;
  readonly input: string;
  readonly timeline: Timeline;
  readonly report: RenderReport;
  readonly workspace: string;
  /** Wall-clock seconds, split by the two expensive stages. */
  readonly synthesisSeconds: number;
  readonly renderSeconds: number;
}

/**
 * Where a presentation's disposable render state lives.
 *
 * Under `.cuecraft/` with the model weights, because it is the same kind of thing: a
 * projection that is always safe to delete and never committed (decision:3, decision:8).
 * Keyed by the source file's name so that two decks do not overwrite each other, and
 * *retained* after a successful render — when narration sounds wrong, the WAV that
 * produced it is the first thing worth listening to.
 */
export function workspaceFor(input: string): string {
  const name = basename(input, extname(input)).replace(/[^A-Za-z0-9._-]+/g, "-");
  return join(repositoryRoot(), ".cuecraft", "renders", name === "" ? "unnamed" : name);
}

export async function renderPresentationFile(
  input: string,
  output: string,
  events: RenderEvents = {},
): Promise<RenderSummary> {
  const inputPath = resolve(input);
  const outputPath = resolve(output);

  events.onStage?.("read");
  let text: string;
  try {
    text = await readFile(inputPath, "utf8");
  } catch (error) {
    throw new StageError("read", describe(error, `cannot read ${input}`));
  }

  events.onStage?.("parse");
  const presentation = parsePresentation(text, input);
  for (const warning of presentation.warnings) events.onWarning?.(warning);

  const workspace = workspaceFor(inputPath);

  events.onStage?.("synthesize");
  const synthesisStarted = performance.now();
  let compiled: CompiledPresentation;
  try {
    compiled = await compilePresentation(presentation, {
      workspace,
      synthesize,
      ...(events.onNarration === undefined ? {} : { onProgress: events.onNarration }),
    });
  } catch (error) {
    throw new StageError("synthesize", describe(error, "narration failed"));
  }
  const synthesisSeconds = (performance.now() - synthesisStarted) / 1000;

  events.onStage?.("time");
  const timeline = buildTimeline(compiled);

  // The render stages announce themselves: browser, bundle, compose, render.
  const renderStarted = performance.now();
  let report: RenderReport;
  try {
    report = await renderPresentation({
      timeline,
      publicDir: compiled.publicDir,
      bundleDir: join(workspace, "bundle"),
      output: outputPath,
      ...(events.onStage === undefined ? {} : { onStage: events.onStage }),
      ...(events.onProgress === undefined ? {} : { onProgress: events.onProgress }),
    });
  } catch (error) {
    throw new StageError("render", describe(error, "rendering failed"));
  }
  const renderSeconds = (performance.now() - renderStarted) / 1000;

  return {
    title: presentation.title,
    input: inputPath,
    timeline,
    report,
    workspace,
    synthesisSeconds,
    renderSeconds,
  };
}

function describe(error: unknown, fallback: string): string {
  if (error instanceof PresentationError) return error.report();
  if (error instanceof Error) return error.message;
  return `${fallback}: ${String(error)}`;
}
