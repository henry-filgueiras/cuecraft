#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { SynthesisError, synthesize } from "./tts/kokoro.ts";
import { KOKORO_VOICES } from "./tts/voices.ts";

/**
 * The bootstrap CLI surface. Only argument parsing is real; `render` is not
 * implemented yet — see archaeology/decisions/0001-*.md for the intended
 * pipeline and archaeology/dragons/0001-*.md for the ordering constraint that
 * shapes it.
 */

export type Invocation =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "render"; input: string; output: string }
  | { kind: "speak"; text: string; output: string; voice?: string; speed?: number }
  | { kind: "voices" };

export class UsageError extends Error {}

export const USAGE = `cuecraft — compile narrated slide presentations into video

Usage:
  cuecraft render <presentation.yaml> [-o <output.mp4>]
  cuecraft speak <text> [-o <output.wav>] [--voice <name>] [--speed <rate>]
  cuecraft voices
  cuecraft --help
  cuecraft --version

Options:
  -o, --output <path>  Output path (render: presentation.mp4, speak: speech.wav)
      --voice <name>   Kokoro voice for speak (default: af_heart)
      --speed <rate>   Speaking rate for speak, 0.5–2.0 (default: 1)

Status: experimental. \`render\` is not implemented yet.

\`speak\` synthesizes locally and needs no credentials. Run
./scripts/bootstrap-local-tts.sh once to install the model.`;

export function parseInvocation(argv: readonly string[]): Invocation {
  const { values, positionals } = parseArgs({
    args: [...argv],
    options: {
      output: { type: "string", short: "o" },
      voice: { type: "string" },
      speed: { type: "string" },
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
      return { kind: "render", input, output: values.output ?? "presentation.mp4" };
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
      process.stderr.write(
        "cuecraft: render is not implemented yet.\n" +
          "This repository is currently a bootstrap; see archaeology/ for the " +
          "decisions that define v0.\n",
      );
      return 1;

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
