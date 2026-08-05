#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

/**
 * The bootstrap CLI surface. Only argument parsing is real; `render` is not
 * implemented yet — see archaeology/decisions/0001-*.md for the intended
 * pipeline and archaeology/dragons/0001-*.md for the ordering constraint that
 * shapes it.
 */

export type Invocation =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "render"; input: string; output: string };

export class UsageError extends Error {}

export const USAGE = `cuecraft — compile narrated slide presentations into video

Usage:
  cuecraft render <presentation.yaml> [-o <output.mp4>]
  cuecraft --help
  cuecraft --version

Options:
  -o, --output <path>  Output MP4 path (default: presentation.mp4)

Status: experimental. \`render\` is not implemented yet.`;

export function parseInvocation(argv: readonly string[]): Invocation {
  const { values, positionals } = parseArgs({
    args: [...argv],
    options: {
      output: { type: "string", short: "o" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "V" },
    },
    allowPositionals: true,
  });

  if (values.help) return { kind: "help" };
  if (values.version) return { kind: "version" };

  const [command, ...rest] = positionals;
  if (command === undefined) return { kind: "help" };

  if (command !== "render") {
    throw new UsageError(`unknown command: ${command}`);
  }

  const input = rest[0];
  if (input === undefined) {
    throw new UsageError("render requires a presentation file");
  }
  if (rest.length > 1) {
    throw new UsageError(`render takes one presentation file, got ${rest.length}`);
  }

  return { kind: "render", input, output: values.output ?? "presentation.mp4" };
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

function main(argv: readonly string[]): number {
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
  }
}

if (process.argv[1] === import.meta.filename) {
  process.exitCode = main(process.argv.slice(2));
}
