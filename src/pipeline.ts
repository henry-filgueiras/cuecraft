import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

import {
  compilePresentation,
  type CompiledPresentation,
  type Narration,
} from "./compile/compile.ts";
import {
  hasExhibits,
  materializePresentation,
  MaterializeError,
  type MaterializedExhibit,
} from "./compile/materialize.ts";
import { symbolsPathFor, symbolTable, type SymbolTable } from "./compile/symbols.ts";
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
 *     read -> parse -> materialize -> synthesize -> time -> render -> publish
 *
 * `materialize` is the one stage whose position was *chosen* rather than forced. An exhibit's
 * picture has no bearing on how long a sentence takes, so it could run anywhere before the render —
 * and it runs first because a broken R program should be found in a second rather than after a
 * minute of narration nobody will hear (`./compile/materialize.ts`). It is skipped entirely, and
 * not even announced, on every deck that declares no exhibit, which is all of them but one.
 *
 * `publish` is the one stage that comes *after* the artifact it describes, and that ordering is
 * deliberate rather than incidental. The symbol table (decision:66) says where the compilation's
 * meaning landed in the film, so writing it before the film existed would be publishing a claim
 * about a file that might never appear. It reads a timeline that has already been frozen and cannot
 * change anything: a failed render leaves no sidecar, and a sidecar always describes a film that is
 * on disk.
 *
 * Naming the stage on every failure is the difference between "cuecraft crashed" and "your
 * fourth slide's narration is too long for one Kokoro window".
 */

export type Stage =
  "read" | "parse" | "materialize" | "synthesize" | "time" | RenderStage | "publish";

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
  readonly onNarration?: (slide: AuthoredSlide, narration: Narration) => void;
  readonly onExhibit?: (exhibit: MaterializedExhibit) => void;
  readonly onProgress?: (progress: number) => void;
}

export interface RenderSummary {
  readonly title: string;
  readonly input: string;
  readonly timeline: Timeline;
  readonly report: RenderReport;
  /** Where the symbol table was written, and what went into it (decision:66). */
  readonly symbolsPath: string;
  readonly symbols: SymbolTable;
  readonly workspace: string;
  /** Every exhibit a foreign program computed for this render. Empty on almost every deck. */
  readonly exhibits: readonly MaterializedExhibit[];
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
  const parsed = parsePresentation(text, input);
  for (const warning of parsed.warnings) events.onWarning?.(warning);

  const workspace = workspaceFor(inputPath);

  // Silent on a deck with nothing to compute, which is every deck but one. A stage that announces
  // itself in order to do nothing teaches a reader that the stages are ceremony.
  let presentation = parsed;
  let exhibits: readonly MaterializedExhibit[] = [];
  if (hasExhibits(parsed)) {
    events.onStage?.("materialize");
    try {
      const materialized = await materializePresentation(parsed, {
        workspace,
        ...(events.onExhibit === undefined ? {} : { onExhibit: events.onExhibit }),
      });
      presentation = materialized.presentation;
      exhibits = materialized.exhibits;
    } catch (error) {
      throw new StageError(
        "materialize",
        error instanceof MaterializeError
          ? error.report()
          : describe(error, "an exhibit failed"),
      );
    }
  }

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

  // The film exists; now say where its meaning landed. Beside it, under its own name, from the
  // frozen timeline (decision:66). Nothing here can reach back into anything above.
  events.onStage?.("publish");
  const symbolsPath = symbolsPathFor(outputPath);
  const symbols = symbolTable(compiled, timeline, { file: basename(outputPath) });
  try {
    await writeFile(symbolsPath, `${JSON.stringify(symbols, null, 2)}\n`, "utf8");
  } catch (error) {
    throw new StageError("publish", describe(error, `cannot write ${symbolsPath}`));
  }

  return {
    title: presentation.title,
    input: inputPath,
    timeline,
    report,
    symbolsPath,
    symbols,
    workspace,
    exhibits,
    synthesisSeconds,
    renderSeconds,
  };
}

function describe(error: unknown, fallback: string): string {
  if (error instanceof PresentationError) return error.report();
  if (error instanceof Error) return error.message;
  return `${fallback}: ${String(error)}`;
}
