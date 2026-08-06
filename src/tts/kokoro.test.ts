import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { test } from "node:test";

import { parseModelPin, readModelPin } from "./model.ts";
import {
  MAX_SPEED,
  MAX_TEXT_LENGTH,
  MIN_SPEED,
  normalizeRequest,
  SynthesisError,
  leadingSilence,
} from "./kokoro.ts";
import { DEFAULT_VOICE, isKokoroVoice, KOKORO_VOICES } from "./voices.ts";

/**
 * Everything here runs without the model installed. Synthesis that actually loads Kokoro
 * lives in kokoro.live-test.ts, which `npm test`'s glob deliberately does not match.
 */

const VALID = { text: "Good evening.", output: "tmp/hello.wav" };

test("a minimal request is defaulted, trimmed, and resolved", () => {
  const normalized = normalizeRequest({
    text: "  Good evening.  ",
    output: "tmp/hello.wav",
  });

  assert.equal(normalized.text, "Good evening.");
  assert.equal(normalized.voice, DEFAULT_VOICE);
  assert.equal(normalized.speed, 1);
  // Resolved eagerly so the caller's working directory cannot change where audio lands
  // between validation and the write.
  assert.ok(isAbsolute(normalized.output));
});

test("empty or whitespace-only text is rejected", () => {
  for (const text of ["", "   ", "\n\t"]) {
    assert.throws(() => normalizeRequest({ ...VALID, text }), SynthesisError);
  }
});

test("text beyond the truncation guard is rejected rather than silently cut", () => {
  const atLimit = "a".repeat(MAX_TEXT_LENGTH);
  assert.equal(
    normalizeRequest({ ...VALID, text: atLimit }).text.length,
    MAX_TEXT_LENGTH,
  );

  assert.throws(
    () => normalizeRequest({ ...VALID, text: "a".repeat(MAX_TEXT_LENGTH + 1) }),
    (error: unknown) =>
      error instanceof SynthesisError &&
      /truncates beyond 512 tokens/.test(error.message),
  );
});

test("an empty output path is rejected", () => {
  assert.throws(() => normalizeRequest({ ...VALID, output: "   " }), SynthesisError);
});

test("unknown voices are rejected and the error lists the real ones", () => {
  assert.throws(
    () => normalizeRequest({ ...VALID, voice: "af_nonexistent" }),
    (error: unknown) =>
      error instanceof SynthesisError && error.message.includes(DEFAULT_VOICE),
  );
});

test("every advertised voice is accepted", () => {
  for (const voice of KOKORO_VOICES) {
    assert.equal(normalizeRequest({ ...VALID, voice }).voice, voice);
  }
});

test("voice names are recognised only when they match exactly", () => {
  assert.ok(isKokoroVoice("af_heart"));
  assert.ok(!isKokoroVoice("AF_HEART"));
  assert.ok(!isKokoroVoice("heart"));
  assert.ok(!isKokoroVoice(""));
});

test("speed is bounded, and non-numeric speeds do not slip through", () => {
  assert.equal(normalizeRequest({ ...VALID, speed: MIN_SPEED }).speed, MIN_SPEED);
  assert.equal(normalizeRequest({ ...VALID, speed: MAX_SPEED }).speed, MAX_SPEED);

  for (const speed of [MIN_SPEED - 0.01, MAX_SPEED + 0.01, 0, -1, Number.NaN, Infinity]) {
    assert.throws(() => normalizeRequest({ ...VALID, speed }), SynthesisError);
  }
});

test("the committed model pin parses and names an immutable revision", () => {
  const pin = readModelPin();

  assert.equal(pin.modelId, "onnx-community/Kokoro-82M-v1.0-ONNX");
  assert.match(pin.revision, /^[0-9a-f]{40}$/);
  assert.equal(pin.sampleRate, 24000);
  assert.equal(pin.channels, 1);
  assert.ok(pin.files.some((file) => file.path === "onnx/model.onnx"));
});

test("a pin on a mutable ref is rejected", () => {
  const base = {
    modelId: "onnx-community/Kokoro-82M-v1.0-ONNX",
    dtype: "fp32",
    sampleRate: 24000,
    channels: 1,
    files: [{ path: "config.json", bytes: 44, sha256: "0".repeat(64) }],
  };

  for (const revision of ["main", "v1.0", "1939ad2", ""]) {
    assert.throws(
      () => parseModelPin({ ...base, revision }, "test"),
      /revision|non-empty/,
    );
  }
  assert.doesNotThrow(() => parseModelPin({ ...base, revision: "a".repeat(40) }, "test"));
});

test("a malformed artifact checksum is rejected", () => {
  const pin = {
    modelId: "m",
    revision: "a".repeat(40),
    dtype: "fp32",
    sampleRate: 24000,
    channels: 1,
    files: [{ path: "config.json", bytes: 44, sha256: "not-a-hash" }],
  };
  assert.throws(() => parseModelPin(pin, "test"), /sha256/);
});

test("leading silence is measured against the clip's own peak", () => {
  const rate = 100;
  // 30 samples of silence, then a quiet-but-real signal.
  const samples = new Float32Array(100);
  for (let i = 30; i < 100; i += 1) samples[i] = 0.2 * Math.sin(i);
  assert.ok(Math.abs(leadingSilence(samples, rate) - 0.3) < 0.02);
});

test("a loud clip and a quiet one report the same onset", () => {
  const rate = 100;
  const build = (peak: number): Float32Array => {
    const s = new Float32Array(100);
    for (let i = 20; i < 100; i += 1) s[i] = peak * Math.sin(i);
    return s;
  };
  // Kokoro's output level varies by roughly a factor of two between utterances, so an
  // absolute floor would report different onsets for the same speech at different levels.
  assert.equal(leadingSilence(build(0.85), rate), leadingSilence(build(0.42), rate));
});

test("silence has no onset to find", () => {
  assert.equal(leadingSilence(new Float32Array(240), 24000), 0.01);
});

test("a clip that starts immediately has no leading silence", () => {
  const samples = new Float32Array(100).fill(0.5);
  assert.equal(leadingSilence(samples, 100), 0);
});
