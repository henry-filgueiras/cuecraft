import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import { describeMissingArtifacts, loadRuntime, synthesize } from "./kokoro.ts";
import { readModelPin } from "./model.ts";
import { KOKORO_VOICES } from "./voices.ts";

/**
 * Real synthesis against the installed model.
 *
 * Named `*.live-test.ts` rather than `*.test.ts` so that `npm test`'s glob cannot pick it
 * up: the ordinary suite must stay runnable on a machine that has never downloaded 325 MB
 * of weights. Run these with `npm run test:tts` after ./scripts/bootstrap-local-tts.sh.
 */

const workspace = join(tmpdir(), `cuecraft-tts-${process.pid}`);

before(() => {
  const problem = describeMissingArtifacts();
  if (problem !== undefined) {
    throw new Error(`${problem}\n\nThese tests require the local model.`);
  }
});

after(() => rm(workspace, { recursive: true, force: true }));

test("TypeScript drives local synthesis and gets a real WAV back", async () => {
  const output = join(workspace, "hello.wav");
  const result = await synthesize({
    text: "Good evening. Your laptop is now doing the talking.",
    output,
  });

  const pin = readModelPin();
  assert.equal(result.sampleRate, pin.sampleRate);
  assert.equal(result.channels, pin.channels);
  assert.ok(
    result.durationSeconds > 1,
    `expected speech, got ${result.durationSeconds}s`,
  );
  assert.equal(
    result.sampleCount,
    Math.round(result.durationSeconds * result.sampleRate),
  );

  // Parse the container rather than trusting the extension: a zero-length or truncated
  // file would still satisfy "the path exists".
  const wav = await readFile(output);
  assert.equal(wav.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(wav.subarray(8, 12).toString("ascii"), "WAVE");
  assert.equal(wav.readUInt16LE(22), 1, "expected mono");
  assert.equal(wav.readUInt32LE(24), pin.sampleRate);
  assert.equal(wav.byteLength, result.bytes);

  // Silence would also be "valid audio". Confirm the waveform actually carries signal.
  const samples = new Float32Array(
    wav.buffer.slice(wav.byteOffset + 44, wav.byteOffset + wav.byteLength),
  );
  const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  assert.ok(peak > 0.05, `expected audible output, peak amplitude was ${peak}`);
});

test("speed changes the duration of the same sentence", async () => {
  const text = "Good evening. Your laptop is now doing the talking.";
  const slow = await synthesize({
    text,
    output: join(workspace, "slow.wav"),
    speed: 0.8,
  });
  const fast = await synthesize({
    text,
    output: join(workspace, "fast.wav"),
    speed: 1.4,
  });

  assert.ok(
    slow.durationSeconds > fast.durationSeconds * 1.2,
    `speed had no effect: ${slow.durationSeconds}s at 0.8 vs ${fast.durationSeconds}s at 1.4`,
  );
});

test("a different voice produces different audio", async () => {
  const text = "Good evening.";
  const a = await synthesize({
    text,
    output: join(workspace, "a.wav"),
    voice: "af_heart",
  });
  const b = await synthesize({
    text,
    output: join(workspace, "b.wav"),
    voice: "bm_george",
  });

  const [left, right] = await Promise.all([readFile(a.output), readFile(b.output)]);
  assert.ok(!left.equals(right), "two different voices produced byte-identical audio");
});

test("our voice list still matches the runtime's own", async () => {
  const runtime = await loadRuntime();
  assert.deepEqual(
    [...KOKORO_VOICES].sort(),
    Object.keys(runtime.voices).sort(),
    "src/tts/voices.ts has drifted from the pinned kokoro-js package",
  );
});
