import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { missingArtifacts, modelCacheRoot, readModelPin } from "./model.ts";
import {
  DEFAULT_VOICE,
  isKokoroVoice,
  KOKORO_VOICES,
  type KokoroVoice,
} from "./voices.ts";

/**
 * The local speech synthesis seam.
 *
 * This is deliberately not the Narrator interface from decision:4 — it is the thinnest
 * thing that proves cuecraft's own process can drive local inference. Narration text,
 * caching, and duration bookkeeping belong to the compiler, not here.
 *
 * What actually runs: Kokoro's ONNX graph, executed by ONNX Runtime's native macOS
 * binding via Transformers.js, on weights this repository pinned and downloaded. Text
 * becomes IPA phonemes in-process (eSpeak NG compiled to WebAssembly), phonemes become
 * token ids, and the token ids plus a 256-float voice tensor become a waveform. Nothing
 * leaves the machine. See archaeology/decisions/0008-*.md.
 */

export class SynthesisError extends Error {}

/**
 * Kokoro's tokenizer truncates at 512 tokens and says nothing about it, which for a
 * narration compiler means silently dropping the end of a sentence. Observed English
 * prose runs about 1.09 tokens per character, and text with numbers or currency expands
 * further once normalized ("$1.50" becomes "one dollar and fifty cents").
 *
 * This ceiling is cuecraft's conservative guard, not Kokoro's limit — it trades some
 * usable range for the guarantee that audio is never quietly incomplete. Splitting long
 * narration into chunks is the real answer; see dragon:3.
 */
export const MAX_TEXT_LENGTH = 420;

/** Guard rails, not model limits: Kokoro accepts any float but degrades outside these. */
export const MIN_SPEED = 0.5;
export const MAX_SPEED = 2.0;

export interface SynthesisRequest {
  /** The words to speak. Plain prose — cuecraft has no speech markup (decision:6). */
  readonly text: string;
  /** Where to write the WAV. Parent directories are created. */
  readonly output: string;
  /** One of {@link KOKORO_VOICES}. Defaults to `af_heart`. */
  readonly voice?: string;
  /** Speaking rate multiplier between {@link MIN_SPEED} and {@link MAX_SPEED}. */
  readonly speed?: number;
}

export interface NormalizedRequest {
  readonly text: string;
  readonly output: string;
  readonly voice: KokoroVoice;
  readonly speed: number;
}

export interface SynthesisResult {
  readonly output: string;
  readonly voice: KokoroVoice;
  readonly speed: number;
  readonly sampleRate: number;
  readonly channels: number;
  readonly sampleCount: number;
  /** Measured from the returned samples, never assumed — decision:4 and dragon:1. */
  readonly durationSeconds: number;
  /**
   * Seconds of near-silence before the first audible sample.
   *
   * Kokoro puts about 310ms of it in front of every utterance, consistently enough to
   * measure but not consistently enough to assume. Anything that lines a visual event up
   * with a spoken word needs this: without it, "when the clip starts" is nine frames before
   * "when the words start" (decision:13).
   */
  readonly leadingSilenceSeconds: number;
  readonly bytes: number;
}

/**
 * Where the audible part of a waveform begins.
 *
 * Relative to the clip's own peak rather than an absolute floor, because Kokoro's output
 * level varies by roughly a factor of two between utterances. This is measurement, not
 * processing: no sample is altered and nothing is written differently (decision:5).
 */
export function leadingSilence(samples: Float32Array, sampleRate: number): number {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak === 0) return samples.length / sampleRate;

  const threshold = Math.max(peak * 0.02, 0.005);
  let index = 0;
  while (index < samples.length && Math.abs(samples[index] ?? 0) < threshold) index += 1;
  return index / sampleRate;
}

/**
 * Validate and default a request without touching the model.
 *
 * Kept pure and exported so that argument handling is testable on a machine that has
 * never run the bootstrap.
 */
export function normalizeRequest(request: SynthesisRequest): NormalizedRequest {
  const text = request.text.trim();
  if (text.length === 0) {
    throw new SynthesisError("text is empty; nothing to synthesize");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new SynthesisError(
      `text is ${text.length} characters; cuecraft caps a single synthesis at ${MAX_TEXT_LENGTH} ` +
        `because Kokoro truncates beyond 512 tokens without reporting it. Split the text and ` +
        `synthesize each part (see archaeology/dragons/0003-*.md).`,
    );
  }

  if (request.output.trim().length === 0) {
    throw new SynthesisError("output path is empty");
  }

  const voice = request.voice ?? DEFAULT_VOICE;
  if (!isKokoroVoice(voice)) {
    throw new SynthesisError(
      `unknown voice ${JSON.stringify(voice)}. Available voices: ${KOKORO_VOICES.join(", ")}`,
    );
  }

  const speed = request.speed ?? 1;
  if (!Number.isFinite(speed) || speed < MIN_SPEED || speed > MAX_SPEED) {
    throw new SynthesisError(
      `speed must be between ${MIN_SPEED} and ${MAX_SPEED}, got ${JSON.stringify(request.speed)}`,
    );
  }

  return { text, output: resolve(request.output), voice, speed };
}

/**
 * Human-readable explanation of what is missing, or `undefined` when ready to synthesize.
 */
export function describeMissingArtifacts(): string | undefined {
  const missing = missingArtifacts();
  if (missing.length === 0) return undefined;
  return (
    `the local Kokoro model is not installed (missing ${missing.join(", ")}).\n` +
    `Run ./scripts/bootstrap-local-tts.sh to download it.`
  );
}

// Loading the graph costs a few hundred milliseconds and 325 MB of resident memory.
// Holding it for the life of the process makes a batch of narration lines cheap, and is
// the reason this probe needs no inference daemon (idea:4).
let loading: Promise<KokoroRuntime> | undefined;

interface KokoroRuntime {
  generate(
    text: string,
    options: { voice: KokoroVoice; speed: number },
  ): Promise<{ audio: Float32Array; sampling_rate: number; toWav(): ArrayBuffer }>;
  readonly voices: Readonly<Record<string, unknown>>;
}

/**
 * Load Kokoro from the repository-local model directory, once per process.
 *
 * Exported so the integration test can assert against the runtime's own voice table.
 */
export function loadRuntime(): Promise<KokoroRuntime> {
  loading ??= (async (): Promise<KokoroRuntime> => {
    const problem = describeMissingArtifacts();
    if (problem !== undefined) throw new SynthesisError(problem);

    const pin = readModelPin();

    // Imported lazily: pulling in ONNX Runtime's native binding costs real time, and the
    // unit suite must stay runnable on a machine that never bootstrapped.
    const [{ env }, { KokoroTTS }] = await Promise.all([
      import("@huggingface/transformers"),
      import("kokoro-js"),
    ]);

    // This is what makes "local" a guarantee rather than a hope: with remote models
    // disallowed, a missing or misnamed artifact fails loudly instead of being fetched
    // from the network behind our back.
    env.localModelPath = modelCacheRoot();
    env.allowLocalModels = true;
    env.allowRemoteModels = false;

    return (await KokoroTTS.from_pretrained(pin.modelId, {
      dtype: pin.dtype,
      device: "cpu",
    })) as unknown as KokoroRuntime;
  })();

  return loading;
}

/**
 * Synthesize speech locally and write it to disk.
 *
 * Returns the measured properties of what was written, including duration derived from
 * the sample count rather than from anything the model claims.
 */
export async function synthesize(request: SynthesisRequest): Promise<SynthesisResult> {
  const normalized = normalizeRequest(request);
  const runtime = await loadRuntime();

  const audio = await runtime.generate(normalized.text, {
    voice: normalized.voice,
    speed: normalized.speed,
  });

  const wav = Buffer.from(audio.toWav());
  await mkdir(dirname(normalized.output), { recursive: true });
  await writeFile(normalized.output, wav);

  return {
    output: normalized.output,
    voice: normalized.voice,
    speed: normalized.speed,
    sampleRate: audio.sampling_rate,
    channels: 1,
    sampleCount: audio.audio.length,
    durationSeconds: audio.audio.length / audio.sampling_rate,
    leadingSilenceSeconds: leadingSilence(audio.audio, audio.sampling_rate),
    bytes: wav.byteLength,
  };
}
