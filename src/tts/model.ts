import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Where the local Kokoro model lives, and what exactly it is pinned to.
 *
 * The pin is a plain JSON file at the repository root rather than a TypeScript constant
 * so that the bootstrap script and the runtime read the same bytes. A shell script and a
 * compiled module drifting apart is precisely the failure this file exists to prevent.
 */

export interface PinnedArtifact {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface ModelPin {
  readonly modelId: string;
  readonly revision: string;
  readonly dtype: "fp32" | "fp16" | "q8" | "q4" | "q4f16";
  readonly sampleRate: number;
  readonly channels: number;
  readonly files: readonly PinnedArtifact[];
}

export const LOCK_FILE = "kokoro-model.lock.json";

/**
 * Both `src/tts/` and the compiled `dist/tts/` sit two levels below the repository root,
 * so this resolves correctly whether cuecraft runs from source or from a build.
 */
export function repositoryRoot(): string {
  return join(import.meta.dirname, "..", "..");
}

/**
 * The directory handed to Transformers.js as its local model root. Everything below it is
 * a projection: downloadable, deletable, never committed, never hand-edited.
 */
export function modelCacheRoot(): string {
  return join(repositoryRoot(), ".cuecraft", "models");
}

let cachedPin: ModelPin | undefined;

export function readModelPin(): ModelPin {
  if (cachedPin !== undefined) return cachedPin;

  const path = join(repositoryRoot(), LOCK_FILE);
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  cachedPin = parseModelPin(parsed, path);
  return cachedPin;
}

export function parseModelPin(value: unknown, source: string): ModelPin {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${source}: expected a JSON object`);
  }
  const raw = value as Record<string, unknown>;

  const modelId = requireString(raw, "modelId", source);
  const revision = requireString(raw, "revision", source);
  const dtype = requireString(raw, "dtype", source);
  const sampleRate = requireNumber(raw, "sampleRate", source);
  const channels = requireNumber(raw, "channels", source);

  // A 40-character hex string is a Git commit. A branch name is not, and pinning to one
  // would quietly reintroduce the irreproducibility this file exists to remove.
  if (!/^[0-9a-f]{40}$/.test(revision)) {
    throw new Error(
      `${source}: revision must be a full 40-character commit hash, got ${JSON.stringify(revision)}`,
    );
  }

  if (!isDtype(dtype)) {
    throw new Error(`${source}: unsupported dtype ${JSON.stringify(dtype)}`);
  }

  const files = raw["files"];
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error(`${source}: files must be a non-empty array`);
  }

  return {
    modelId,
    revision,
    dtype,
    sampleRate,
    channels,
    files: files.map((entry, index) =>
      parseArtifact(entry, `${source}: files[${index}]`),
    ),
  };
}

function parseArtifact(value: unknown, source: string): PinnedArtifact {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${source}: expected an object`);
  }
  const raw = value as Record<string, unknown>;
  const sha256 = requireString(raw, "sha256", source);

  if (!/^[0-9a-f]{64}$/.test(sha256)) {
    throw new Error(`${source}: sha256 must be 64 hex characters`);
  }

  return {
    path: requireString(raw, "path", source),
    bytes: requireNumber(raw, "bytes", source),
    sha256,
  };
}

function isDtype(value: string): value is ModelPin["dtype"] {
  return ["fp32", "fp16", "q8", "q4", "q4f16"].includes(value);
}

function requireString(
  raw: Record<string, unknown>,
  key: string,
  source: string,
): string {
  const value = raw[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${source}: ${key} must be a non-empty string`);
  }
  return value;
}

function requireNumber(
  raw: Record<string, unknown>,
  key: string,
  source: string,
): number {
  const value = raw[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${source}: ${key} must be a finite number`);
  }
  return value;
}

/**
 * Pinned artifacts that bootstrap should have produced but did not.
 *
 * Existence only — the bootstrap script owns checksum verification, and re-hashing 325 MB
 * before every synthesis would cost more than it catches.
 */
export function missingArtifacts(pin: ModelPin = readModelPin()): string[] {
  const root = join(modelCacheRoot(), pin.modelId);
  return pin.files
    .map((file) => file.path)
    .filter((path) => !existsSync(join(root, path)));
}
