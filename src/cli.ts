#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { compilePresentation } from "./compile/compile.ts";
import {
  hasExhibits,
  materializePresentation,
  MaterializeError,
  type MaterializedExhibit,
} from "./compile/materialize.ts";
import {
  parseSymbolTable,
  SYMBOL_KINDS,
  symbolsPathFor,
  SymbolsError,
  type SymbolKind,
  type SymbolTable,
} from "./compile/symbols.ts";
import {
  buildTimeline,
  narrativeStack,
  stackProblem,
  type Timeline,
} from "./compile/timeline.ts";
import { extractFrame, FrameError } from "./compute/frame.ts";
import { formatTimecode } from "./presentation/duration.ts";
import type { ExhibitResource } from "./presentation/exhibit.ts";
import { parsePresentation, PresentationError } from "./presentation/parse.ts";
import {
  renderPresentationFile,
  StageError,
  workspaceFor,
  type RenderSummary,
} from "./pipeline.ts";
import { formatAudition } from "./render/audition.ts";
import { auditionSheet } from "./render/auditionsheet.ts";
import { explainMachines, formatExplanation } from "./render/explain.ts";
import { readFontPin } from "./render/faces.ts";
import { protocolOf } from "./render/protocol.ts";
import { allocateLanes } from "./render/tenancy.ts";
import { typographyOf } from "./render/typography.ts";
import { SynthesisError, synthesize } from "./tts/kokoro.ts";
import { KOKORO_VOICES } from "./tts/voices.ts";

/**
 * The CLI surface. Everything cuecraft can do is reachable from here and works headless
 * (decision:2) — the command line is the product, not a wrapper around one.
 *
 * See archaeology/decisions/0001-*.md for the compiler thesis and
 * archaeology/dragons/0001-*.md for the ordering constraint that shapes `render`.
 */

export type Invocation =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "render"; input: string; output: string; quiet: boolean }
  | { kind: "explain"; input: string; audition: boolean; sheet?: string }
  | { kind: "inspect"; symbols: string; only?: SymbolKind }
  | { kind: "snapshot"; video: string; symbol: string; symbols?: string; output?: string }
  | { kind: "snapshots"; video: string; symbols?: string; only?: SymbolKind; dir: string }
  | { kind: "speak"; text: string; output: string; voice?: string; speed?: number }
  | { kind: "voices" };

export class UsageError extends Error {}

export const USAGE = `cuecraft — compile narrated slide presentations into video

Usage:
  cuecraft render <presentation.yaml> [-o <output.mp4>]
  cuecraft explain <presentation.yaml> [--audition]
  cuecraft inspect <presentation.symbols.json> [--kind <kind>]
  cuecraft snapshot <video.mp4> --symbol <key> [-o <frame.png>]
  cuecraft snapshots <video.mp4> [--kind <kind>] [-d <dir>]
  cuecraft speak <text> [-o <output.wav>] [--voice <name>] [--speed <rate>]
  cuecraft voices
  cuecraft --help
  cuecraft --version

Options:
  -o, --output <path>  Output path (render: presentation.mp4, speak: speech.wav)
      --voice <name>   Kokoro voice for speak (default: af_heart)
      --speed <rate>   Speaking rate for speak, 0.5–2.0 (default: 1)
      --quiet          Suppress progress; print only the completion summary
      --audition       explain: also score every layout candidate that was considered
      --sheet <path>   explain: write the layout audition as a labelled SVG contact sheet
      --kind <kind>    Show or extract one kind: ${SYMBOL_KINDS.join(", ")}
      --symbol <key>   snapshot: the semantic key to extract, e.g. slide:architecture
      --symbols <path> Symbol table to read (default: the one beside the video)
  -d, --dir <path>     snapshots: where the images go (default: snapshots)

Status: experimental.

Rendering also writes a symbol table beside the MP4 — timed semantic markers for the
compiled presentation. Use it to find slides and semantic events instead of sampling the
video blindly:

  cuecraft render deck.yaml -o out/deck.mp4     # writes out/deck.symbols.json too
  cuecraft inspect out/deck.symbols.json
  cuecraft snapshots out/deck.mp4 --kind slide -d out/frames

Narration is synthesized locally and needs no credentials. Run
./scripts/bootstrap-local-tts.sh once to install the model. The first render also
downloads a headless Chrome for Remotion into its own cache.`;

export function parseInvocation(argv: readonly string[]): Invocation {
  const { values, positionals } = parseArgs({
    args: [...argv],
    options: {
      output: { type: "string", short: "o" },
      voice: { type: "string" },
      speed: { type: "string" },
      quiet: { type: "boolean", short: "q" },
      audition: { type: "boolean" },
      sheet: { type: "string" },
      kind: { type: "string" },
      symbol: { type: "string" },
      symbols: { type: "string" },
      dir: { type: "string", short: "d" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "V" },
    },
    allowPositionals: true,
  });

  if (values.help) return { kind: "help" };
  if (values.version) return { kind: "version" };

  const [command, ...rest] = positionals;
  if (command === undefined) return { kind: "help" };

  switch (command) {
    case "render": {
      const input = rest[0];
      if (input === undefined) {
        throw new UsageError("render requires a presentation file");
      }
      if (rest.length > 1) {
        throw new UsageError(`render takes one presentation file, got ${rest.length}`);
      }
      return {
        kind: "render",
        input,
        output: values.output ?? "presentation.mp4",
        quiet: values.quiet ?? false,
      };
    }

    case "explain": {
      const input = rest[0];
      if (input === undefined) {
        throw new UsageError("explain requires a presentation file");
      }
      if (rest.length > 1) {
        throw new UsageError(`explain takes one presentation file, got ${rest.length}`);
      }
      return {
        kind: "explain",
        input,
        audition: values.audition ?? false,
        ...(values.sheet === undefined ? {} : { sheet: values.sheet }),
      };
    }

    case "inspect": {
      const symbols = rest[0];
      if (symbols === undefined) {
        throw new UsageError("inspect requires a symbols file");
      }
      if (rest.length > 1) {
        throw new UsageError(`inspect takes one symbols file, got ${rest.length}`);
      }
      return {
        kind: "inspect",
        symbols,
        ...(values.kind === undefined ? {} : { only: parseKind(values.kind) }),
      };
    }

    case "snapshot": {
      const video = rest[0];
      if (video === undefined) {
        throw new UsageError("snapshot requires a video file");
      }
      if (rest.length > 1) {
        throw new UsageError(`snapshot takes one video file, got ${rest.length}`);
      }
      if (values.symbol === undefined) {
        throw new UsageError(
          "snapshot requires --symbol <key>, e.g. --symbol slide:intro",
        );
      }
      return {
        kind: "snapshot",
        video,
        symbol: values.symbol,
        ...(values.symbols === undefined ? {} : { symbols: values.symbols }),
        ...(values.output === undefined ? {} : { output: values.output }),
      };
    }

    case "snapshots": {
      const video = rest[0];
      if (video === undefined) {
        throw new UsageError("snapshots requires a video file");
      }
      if (rest.length > 1) {
        throw new UsageError(`snapshots takes one video file, got ${rest.length}`);
      }
      return {
        kind: "snapshots",
        video,
        dir: values.dir ?? "snapshots",
        ...(values.symbols === undefined ? {} : { symbols: values.symbols }),
        ...(values.kind === undefined ? {} : { only: parseKind(values.kind) }),
      };
    }

    case "speak": {
      const text = rest[0];
      if (text === undefined) {
        throw new UsageError("speak requires some text");
      }
      if (rest.length > 1) {
        throw new UsageError(
          `speak takes one quoted string, got ${rest.length}. Did you forget the quotes?`,
        );
      }
      return {
        kind: "speak",
        text,
        output: values.output ?? "speech.wav",
        // Left as strings and numbers here; the synthesis seam owns validating them, so
        // the CLI and a programmatic caller reject the same inputs for the same reasons.
        ...(values.voice === undefined ? {} : { voice: values.voice }),
        ...(values.speed === undefined ? {} : { speed: parseSpeed(values.speed) }),
      };
    }

    case "voices":
      if (rest.length > 0) {
        throw new UsageError(`voices takes no arguments, got ${rest.length}`);
      }
      return { kind: "voices" };

    default:
      throw new UsageError(`unknown command: ${command}`);
  }
}

const STAGE_LABELS: Record<string, string> = {
  read: "reading source",
  parse: "validating presentation",
  materialize: "running exhibits",
  synthesize: "synthesizing narration",
  time: "deriving timing",
  browser: "preparing headless browser",
  bundle: "bundling composition",
  compose: "resolving composition",
  render: "rendering video",
  publish: "writing symbols",
};

async function runRender(
  invocation: Extract<Invocation, { kind: "render" }>,
): Promise<number> {
  const note = (line: string): void => {
    if (!invocation.quiet) process.stderr.write(`${line}\n`);
  };

  try {
    const summary = await renderPresentationFile(invocation.input, invocation.output, {
      onStage: (stage) => {
        note(`  ${STAGE_LABELS[stage] ?? stage}...`);
      },
      onWarning: (message) => {
        process.stderr.write(`cuecraft: warning: ${message}\n`);
      },
      onExhibit: (exhibit) => {
        note(
          `    slide ${exhibit.ordinal}: ${exhibit.program} -> ` +
            `${describeResource(exhibit.resource)}, ` +
            `${(exhibit.resource.bytes / 1024).toFixed(0)} kB ` +
            `in ${exhibit.elapsedSeconds.toFixed(1)}s`,
        );
      },
      onNarration: (slide, narration) => {
        const clips = narration.clips.length;
        note(
          `    slide ${slide.ordinal}: ${narration.durationSeconds.toFixed(1)}s ` +
            `in ${clips} clip${clips === 1 ? "" : "s"} ` +
            `(${describeVoices(narration)} at ${narration.speed}x)`,
        );
      },
    });

    const { timeline, report } = summary;
    // Which composition each slide was given. Layout is chosen from content and never
    // authored, so this is the only place an author can see what the renderer decided.
    const layouts = timeline.scenes
      .map((scene) => `${scene.ordinal}:${scene.layout}`)
      .join("  ");

    process.stdout.write(
      `Rendered ${invocation.output}\n` +
        describeSymbols(summary, invocation.output) +
        `  ${timeline.scenes.length} slide${timeline.scenes.length === 1 ? "" : "s"}\n` +
        `  ${formatTimecode((report.totalFrames / report.fps) * 1000)}\n` +
        `  ${report.width}x${report.height} @ ${report.fps}fps, ` +
        `${report.codec}/${report.audioCodec}\n` +
        `  layouts ${layouts}\n` +
        `  narration ${summary.synthesisSeconds.toFixed(1)}s, ` +
        `render ${summary.renderSeconds.toFixed(1)}s\n` +
        `  narration kept in ${summary.workspace}\n` +
        describeExhibits(summary.exhibits) +
        describeTypography(timeline) +
        describeSubtitles(timeline) +
        describeLanes(timeline) +
        describeRecalls(timeline) +
        describeDescent(timeline),
    );
    return 0;
  } catch (error) {
    if (error instanceof PresentationError) {
      process.stderr.write(`cuecraft: ${error.report()}\n`);
      return 1;
    }
    if (error instanceof StageError) {
      process.stderr.write(`cuecraft: ${error.stage} failed: ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

/**
 * What the renderer decided, without rendering.
 *
 * A developer's instrument and deliberately not an authoring aid. Every policy `circuit` runs is a
 * claim about perception — a shot holds, an arrival registers, a pull-back settles — and until this
 * existed none of those claims could be checked except by watching a minute of video and trusting a
 * memory of the last one. It prints the phase budget of every occurrence, the reason for every
 * camera decision, and what the type comes out at in every shot.
 *
 * It still synthesizes, because it must: dragon:1's ordering means narration durations are the
 * clock, and a timing report that guessed at them would be reporting on a film nobody will see.
 * The cache makes the second run instant.
 *
 * And it materializes, for the same reason one step further out. Two things a deck's exhibits
 * decide are things this report is about: which composition a slide gets — a program that hands
 * back a table selects `register` and one that hands back a picture selects `exhibit` — and, since
 * decision:64, how long the slide *is*, because a `play:` borrows a length measured out of a file
 * that only exists once the program has run. Reporting either without running R would be reporting
 * on a different film. Skipped on every deck with no exhibit in it, which is all of them but three.
 *
 * Nothing it prints is reachable from the grammar, and nothing in the grammar changes it.
 */
async function runExplain(
  invocation: Extract<Invocation, { kind: "explain" }>,
): Promise<number> {
  try {
    const text = await readFile(invocation.input, "utf8");
    const parsed = parsePresentation(text, invocation.input);
    const workspace = workspaceFor(resolve(invocation.input));
    const presentation = hasExhibits(parsed)
      ? (await materializePresentation(parsed, { workspace })).presentation
      : parsed;
    const compiled = await compilePresentation(presentation, {
      workspace,
      synthesize,
    });
    const timeline = buildTimeline(compiled);
    const explanations = explainMachines(timeline);

    if (explanations.length === 0) {
      process.stderr.write(`cuecraft: ${invocation.input} contains no machine\n`);
      return 1;
    }

    const blocks = explanations.flatMap((explanation) => [
      formatExplanation(explanation),
      ...(invocation.audition ? [formatAudition(explanation.audition)] : []),
    ]);
    process.stdout.write(`${blocks.join("\n\n")}\n`);

    const first = explanations[0];
    if (invocation.sheet !== undefined && first !== undefined) {
      await writeFile(
        invocation.sheet,
        auditionSheet(first.audition, first.title),
        "utf8",
      );
      process.stderr.write(`  audition sheet written to ${invocation.sheet}\n`);
    }
    return 0;
  } catch (error) {
    if (error instanceof PresentationError) {
      process.stderr.write(`cuecraft: ${error.report()}\n`);
      return 1;
    }
    if (error instanceof MaterializeError) {
      process.stderr.write(`cuecraft: ${error.report()}\n`);
      return 1;
    }
    if (error instanceof SynthesisError) {
      process.stderr.write(`cuecraft: ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

/**
 * Where the symbol table went, what is in it, and the two commands that read it.
 *
 * Printed on every render rather than only when something unusual happened, which is the opposite
 * of the rule every other line here follows — and deliberately so. The others report a *decision*
 * the compiler took, and a line that says "nothing unusual" on every run is a line people stop
 * reading. This reports an *artifact that exists on disk*, and the failure it exists to prevent is
 * somebody not knowing it is there. An agent that has to be told about the sidecar by a human has
 * exactly the problem decision:66 was written to remove.
 */
function describeSymbols(summary: RenderSummary, output: string): string {
  const counted = new Map<SymbolKind, number>();
  for (const symbol of summary.symbols.symbols) {
    counted.set(symbol.kind, (counted.get(symbol.kind) ?? 0) + 1);
  }
  const tally = SYMBOL_KINDS.filter((kind) => counted.has(kind))
    .map((kind) => `${counted.get(kind) as number} ${kind}`)
    .join(", ");
  // Spelled the way the author spelled the output rather than resolved, so that the two commands
  // below are commands they can paste. A resolved path is correct and unusable.
  const sidecar = symbolsPathFor(output);
  return (
    `Symbols ${sidecar}\n` +
    `  ${summary.symbols.symbols.length} timed marker` +
    `${summary.symbols.symbols.length === 1 ? "" : "s"}: ${tally}\n` +
    `  cuecraft inspect ${sidecar}\n` +
    `  cuecraft snapshots ${output} --kind slide -d snapshots\n`
  );
}

/**
 * Every semantic landmark in a rendered film, read from the sidecar and nothing else.
 *
 * The first consumer of decision:66, and the shape of it is the argument: this command cannot see
 * the presentation, cannot synthesize, and cannot open the video. It knows where every slide lives
 * because the compiler wrote it down. That is the whole claim, and a version of this that fell back
 * to reading the YAML when the sidecar was thin would have quietly disproved it.
 */
async function runInspect(
  invocation: Extract<Invocation, { kind: "inspect" }>,
): Promise<number> {
  let table: SymbolTable;
  try {
    table = parseSymbolTable(
      await readFile(invocation.symbols, "utf8"),
      invocation.symbols,
    );
  } catch (error) {
    process.stderr.write(
      `cuecraft: ${error instanceof SymbolsError ? error.message : describeRead(error, invocation.symbols)}\n`,
    );
    return 1;
  }

  const shown = table.symbols.filter(
    (symbol) => invocation.only === undefined || symbol.kind === invocation.only,
  );
  if (shown.length === 0) {
    process.stderr.write(
      `cuecraft: ${invocation.symbols} holds no ${invocation.only ?? "symbol"} symbols\n`,
    );
    return 1;
  }

  // Padded to the widest key so the frames line up, because the thing a reader is actually doing
  // with this output is scanning down the numbers.
  const width = Math.max(...shown.map((symbol) => symbol.key.length));
  const lines = shown.map(
    (symbol) =>
      `${symbol.key.padEnd(width)}  ` +
      `frame ${String(symbol.snapshotFrame).padStart(6)}  ` +
      `${formatTimecode(symbol.snapshotSeconds * 1000)}  ` +
      `[${symbol.fromFrame}, ${symbol.toFrame})`,
  );

  process.stdout.write(
    `${table.presentation.title} — ${table.media.file}, ` +
      `${table.media.durationFrames} frames at ${table.media.fps}fps ` +
      `(${formatTimecode(table.media.durationSeconds * 1000)})\n` +
      `${lines.join("\n")}\n`,
  );
  return 0;
}

/**
 * One frame, or one per symbol, taken out of the film by name.
 *
 * Deterministic lookup plus one ffmpeg invocation (`./compute/frame.ts`). Nothing here looks at a
 * pixel to decide anything, which is the line decision:66 drew: the compiler already knows where to
 * look, so a tool that had to *find* the interesting frame would be solving a problem cuecraft
 * created by throwing the answer away.
 */
async function runSnapshot(
  invocation: Extract<Invocation, { kind: "snapshot" | "snapshots" }>,
): Promise<number> {
  const path = invocation.symbols ?? symbolsPathFor(invocation.video);
  let table: SymbolTable;
  try {
    table = parseSymbolTable(await readFile(path, "utf8"), path);
  } catch (error) {
    process.stderr.write(
      `cuecraft: ${error instanceof SymbolsError ? error.message : describeRead(error, path)}\n`,
    );
    return 1;
  }

  const wanted =
    invocation.kind === "snapshot"
      ? table.symbols.filter((symbol) => symbol.key === invocation.symbol)
      : table.symbols.filter(
          (symbol) => invocation.only === undefined || symbol.kind === invocation.only,
        );

  if (wanted.length === 0) {
    process.stderr.write(
      invocation.kind === "snapshot"
        ? `cuecraft: ${path} has no symbol ${JSON.stringify(invocation.symbol)}; ` +
            `run cuecraft inspect ${path} to see what it does have\n`
        : `cuecraft: ${path} holds no ${invocation.only ?? "symbol"} symbols\n`,
    );
    return 1;
  }

  try {
    for (const symbol of wanted) {
      const output =
        invocation.kind === "snapshot"
          ? (invocation.output ?? `${fileNameFor(symbol.key)}.png`)
          : join(invocation.dir, `${fileNameFor(symbol.key)}.png`);
      await extractFrame({
        video: invocation.video,
        frame: symbol.snapshotFrame,
        fps: table.media.fps,
        output,
      });
      process.stdout.write(
        `${output}  ${symbol.key}  frame ${symbol.snapshotFrame}  ` +
          `${formatTimecode(symbol.snapshotSeconds * 1000)}\n`,
      );
    }
  } catch (error) {
    process.stderr.write(
      `cuecraft: ${error instanceof FrameError ? error.message : String(error)}\n`,
    );
    return 1;
  }
  return 0;
}

/**
 * A key as a filename: `slide:architecture` -> `slide-architecture`.
 *
 * The whole key rather than its last segment, so a directory of snapshots taken across kinds cannot
 * have an anchor and the slide it sits on fight over one name. Keys are already restricted to the
 * identity alphabet plus `:` and `/`, so replacing those two is the whole of the escaping.
 */
export function fileNameFor(key: string): string {
  return key.replace(/[:/]/g, "-");
}

function describeRead(error: unknown, path: string): string {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
    ? `cannot read ${path}; render the presentation first and it will be written beside the video`
    : `cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`;
}

function parseKind(raw: string): SymbolKind {
  const found = SYMBOL_KINDS.find((kind) => kind === raw);
  if (found === undefined) {
    throw new UsageError(
      `--kind must be one of ${SYMBOL_KINDS.join(", ")}, got ${JSON.stringify(raw)}`,
    );
  }
  return found;
}

/**
 * Which voices a slide was actually spoken in, in the order they were first heard.
 *
 * One name on every deck that names no narrator, which is the line this always printed. A slide
 * that changes narrator prints both, because "who is speaking" is the only thing about a narrator
 * an author can check without listening.
 */
function describeVoices(narration: { clips: readonly { voice: string }[] }): string {
  const voices = [...new Set(narration.clips.map((clip) => clip.voice))];
  return voices.length === 0 ? "no speech" : voices.join(", ");
}

/**
 * Every picture a foreign program computed for this render, and how long it took.
 *
 * Printed for the reason the layouts are: it is the only place an author can see that the thing on
 * the slide was *made* rather than fetched. Two numbers say it — the program that ran, and the
 * seconds it ran for — and neither exists for a checked-in image.
 *
 * Silent on every deck with no exhibit in it, which is all of them but one.
 */
function describeExhibits(exhibits: readonly MaterializedExhibit[]): string {
  if (exhibits.length === 0) return "";
  const lines = exhibits.map(
    (exhibit) =>
      `    slide ${exhibit.ordinal}: ${exhibit.program} computed ` +
      `${exhibit.resource.name} in ${exhibit.elapsedSeconds.toFixed(1)}s` +
      // What the artifact can be talked about, and therefore what a `shows:` was checked against.
      (addressable(exhibit.resource).length === 0
        ? ""
        : `, showing ${addressable(exhibit.resource).join(", ")}`),
  );
  return `  exhibits\n${lines.join("\n")}\n`;
}

/** What a program handed back, in one phrase, because the three kinds are not interchangeable. */
function describeResource(resource: ExhibitResource): string {
  switch (resource.kind) {
    case "picture":
      return `${resource.width}x${resource.height} png`;
    case "drawing":
      return `${resource.width}x${resource.height} svg, ${resource.elements.length} named`;
    case "table":
      return `csv, ${resource.table.rows.length} rows x ${resource.table.columns.length} columns`;
    case "footage":
      return (
        `${resource.width}x${resource.height} mp4, ` +
        `${resource.durationSeconds.toFixed(1)}s of film`
      );
  }
}

/**
 * Every identity narration could reach on this exhibit.
 *
 * A picture and a drawing publish exactly what the slide declared; a table publishes what its data
 * generated, which is frequently more than any deck talks about, so the summary reports the whole
 * address space rather than the part that was used.
 */
function addressable(resource: ExhibitResource): readonly string[] {
  switch (resource.kind) {
    case "picture":
      return resource.regions.map((region) => region.name);
    case "drawing":
      return resource.elements;
    case "table":
      return [...resource.table.rowIds, ...resource.table.columnIds];
    // Nothing, and for the picture's reason rather than the table's: cuecraft has never looked
    // inside a film either. What a temporal exhibit publishes is a clock, and a clock is not an
    // address.
    case "footage":
      return [];
  }
}

/**
 * The subtitle track, when the deck asked for one.
 *
 * Silent otherwise, like every other line here that reports something a deck did not do. What is
 * worth printing is the count and the cast, because both are *derived*: the cues are one per
 * synthesized clip, and whether a speaker is labelled at all depends on whether the film changes
 * hands rather than on what the deck declared. An author who expected a label and got none should
 * be able to see why without opening a video.
 */
/**
 * Which faces the film was set in, when that is not the deck's ordinary answer.
 *
 * Printed only for a deck that asked, for the reason `describeSubtitles` prints nothing for a deck
 * that did not: a summary line that appears on every render in order to say "nothing unusual" is a
 * line people stop reading.
 *
 * The pinned version is here rather than in a provenance subsystem, which cuecraft does not have
 * and this round is not the reason to build one. A film's typography is now a function of two
 * things — the profile the deck selected and the bytes of the face it names — and this is where
 * cuecraft already reports what it decided.
 */
function describeTypography(timeline: Timeline): string {
  if (timeline.typography === "default") return "";
  const type = typographyOf(timeline.typography);
  const pinned = readFontPin()
    .families.map((family) => `${family.family} ${family.version}`)
    .join(", ");
  return `  typography ${type.id} (${pinned})\n`;
}

function describeSubtitles(timeline: Timeline): string {
  const cues = timeline.subtitles;
  if (cues.length === 0) return "";
  const speakers = [...new Set(cues.map((cue) => cue.speaker?.name).filter(Boolean))];
  return (
    `  subtitles ${cues.length} cue${cues.length === 1 ? "" : "s"}` +
    (speakers.length === 0 ? ", unlabelled" : `, labelled ${speakers.join(", ")}`) +
    "\n"
  );
}

/**
 * Every earlier sentence a deck said again, and which frames of which slide came back with it.
 *
 * Printed for the reason the descent is: a recall is a *scheduled* thing with a frame, a borrowed
 * duration and a source interval, and none of that should need a test runner to be visible. The two
 * timecodes are the whole of the mapping — where the replay happens now, and where it is replaying
 * from — so an author who thinks the film cut to the wrong moment can check it without watching.
 *
 * Silent on every deck that never recalls.
 */
export function describeRecalls(timeline: Timeline): string {
  const lines: string[] = [];
  for (const scene of timeline.scenes) {
    for (const recall of scene.recalls) {
      const at = formatTimecode((recall.from / timeline.fps) * 1000);
      const source = formatTimecode((recall.sourceFrom / timeline.fps) * 1000);
      lines.push(
        `    slide ${scene.ordinal} recalls "${recall.id}" from slide ${recall.sourceOrdinal}: ` +
          `${at} replays ${source} for ${(recall.durationInFrames / timeline.fps).toFixed(1)}s`,
      );
    }
  }
  return lines.length === 0 ? "" : `  recalls\n${lines.join("\n")}\n`;
}

/**
 * The call stack a deck descended through, if it descended at all.
 *
 * Printed rather than only tested, because a compiled timeline that "visibly and testably
 * descends" should not need a test runner to be visible. It is also the fastest way to see that
 * a child's narration really did land between its own two thresholds — the indentation is the
 * stack, and the timecodes are the proof that nothing overlaps.
 *
 * Silent on every deck that never descends, which is all of them so far.
 */
function describeDescent(timeline: Timeline): string {
  const lines: string[] = [];
  for (const scene of timeline.scenes) {
    if (scene.calls.length === 0) continue;
    const problem = stackProblem(scene);
    lines.push(
      `  slide ${scene.ordinal} descends` +
        (problem === undefined ? "" : ` (${problem})`),
    );

    let depth = 0;
    let spoken = 0;
    const flush = (): void => {
      if (spoken === 0) return;
      lines.push(`  ${"  ".repeat(depth + 1)}${spoken} cue${spoken === 1 ? "" : "s"}`);
      spoken = 0;
    };
    for (const event of narrativeStack(scene)) {
      const at = formatTimecode((event.frame / timeline.fps) * 1000);
      if (event.kind === "narrate") {
        spoken += 1;
        continue;
      }
      flush();
      if (event.kind === "exit") depth -= 1;
      lines.push(
        `  ${"  ".repeat(depth + 1)}${event.kind === "enter" ? "→" : "←"} ` +
          `${event.kind === "enter" ? event.into : event.scope} at ${at}`,
      );
      if (event.kind === "enter") depth += 1;
    }
    flush();
  }
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

/**
 * How much width each protocol actually cost, and why.
 *
 * Printed for the same reason the layouts are: the allocation is derived, an author cannot reach
 * it, and a derived decision nobody can see is a decision nobody can argue with. Four numbers say
 * the whole thing — how many parties there are, how many columns they came to, how many were ever
 * live at once (the floor no allocation can beat), and how many times a column changed hands.
 *
 * The distance between `peak` and `slots` is the price of `COOLING_ROWS`: columns that were
 * semantically free and were left alone anyway, because reclaiming them would have let the film
 * imply that one party continued another. That price is meant to be visible.
 *
 * Silent on every deck with no protocol in it, which is most of them.
 */
function describeLanes(timeline: Timeline): string {
  const lines: string[] = [];
  for (const scene of timeline.scenes) {
    const protocol = protocolOf(scene.body);
    if (protocol === undefined) continue;
    const { slots, peak, reuses } = allocateLanes(protocol.actors, protocol.steps);
    lines.push(
      `  slide ${scene.ordinal}: ${protocol.actors.length} actors in ${slots} ` +
        `lane${slots === 1 ? "" : "s"} ` +
        `(${peak} live at once, ${reuses} reuse${reuses === 1 ? "" : "s"})`,
    );
  }
  return lines.length === 0 ? "" : `  lanes\n${lines.join("\n")}\n`;
}

function parseSpeed(raw: string): number {
  const speed = Number(raw);
  if (!Number.isFinite(speed)) {
    throw new UsageError(`--speed must be a number, got ${JSON.stringify(raw)}`);
  }
  return speed;
}

export function readVersion(): string {
  const manifestPath = join(import.meta.dirname, "..", "package.json");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (
    typeof manifest === "object" &&
    manifest !== null &&
    "version" in manifest &&
    typeof manifest.version === "string"
  ) {
    return manifest.version;
  }
  throw new Error(`no version field in ${manifestPath}`);
}

async function main(argv: readonly string[]): Promise<number> {
  let invocation: Invocation;
  try {
    invocation = parseInvocation(argv);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`cuecraft: ${error.message}\n\n${USAGE}\n`);
      return 2;
    }
    throw error;
  }

  switch (invocation.kind) {
    case "help":
      process.stdout.write(`${USAGE}\n`);
      return 0;

    case "version":
      process.stdout.write(`${readVersion()}\n`);
      return 0;

    case "render":
      return runRender(invocation);

    case "explain":
      return runExplain(invocation);

    case "inspect":
      return runInspect(invocation);

    case "snapshot":
    case "snapshots":
      return runSnapshot(invocation);

    case "voices":
      for (const voice of KOKORO_VOICES) {
        process.stdout.write(`${voice}\n`);
      }
      return 0;

    case "speak":
      try {
        const started = performance.now();
        const result = await synthesize({
          text: invocation.text,
          output: invocation.output,
          ...(invocation.voice === undefined ? {} : { voice: invocation.voice }),
          ...(invocation.speed === undefined ? {} : { speed: invocation.speed }),
        });
        const elapsed = (performance.now() - started) / 1000;

        process.stderr.write(
          `${result.output}\n` +
            `  ${result.durationSeconds.toFixed(2)}s of audio, ` +
            `${result.sampleRate} Hz mono, voice ${result.voice}, speed ${result.speed}\n` +
            `  synthesized in ${elapsed.toFixed(2)}s ` +
            `(${(elapsed / result.durationSeconds).toFixed(2)}x real time)\n`,
        );
        return 0;
      } catch (error) {
        if (error instanceof SynthesisError) {
          process.stderr.write(`cuecraft: ${error.message}\n`);
          return 1;
        }
        throw error;
      }
  }
}

if (process.argv[1] === import.meta.filename) {
  process.exitCode = await main(process.argv.slice(2));
}
