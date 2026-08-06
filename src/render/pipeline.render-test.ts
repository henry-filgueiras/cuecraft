import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";

import { renderPresentationFile } from "../pipeline.ts";
import { describeMissingArtifacts } from "../tts/kokoro.ts";
import { repositoryRoot } from "../tts/model.ts";

/**
 * The real vertical slice: YAML on disk to a playable MP4.
 *
 * Named `*.render-test.ts` so `npm test` cannot pick it up. This one synthesizes speech
 * with the local model *and* downloads and drives a headless Chromium, which is minutes of
 * work and hundreds of megabytes of prerequisites — everything the ordinary suite is
 * carefully arranged to avoid. Run it with `npm run test:render`.
 *
 * What it does not do is judge how the video looks. That test is a human watching it.
 */

const run = promisify(execFile);

/**
 * Two slides, two archetypes, and both narration forms: the first uses the cue grammar with
 * an explicit pause, the second the legacy scalar. Anything that breaks either one breaks
 * this fixture.
 */
const FIXTURE = `
title: "Render test"

defaults:
  pre_say: 500ms
  post_say: 800ms

slides:
  - slide:
      title: "First"
      bullets:
        - One
        - Two
    say:
      - "This is the first slide."
      - pause: 600ms
      - "It has two clips."

  - slide:
      title: "Second"
    say: And this is the second.
`;

let workspace: string;

before(async () => {
  const problem = describeMissingArtifacts();
  if (problem !== undefined) {
    throw new Error(`${problem}\n\nThis test requires the local model.`);
  }
  workspace = await mkdtemp(join(tmpdir(), "cuecraft-render-"));
});

after(() => rm(workspace, { recursive: true, force: true }));

interface Probe {
  format: { duration: string; format_name: string };
  streams: Array<{
    codec_name?: string;
    codec_type?: string;
    width?: number;
    height?: number;
    r_frame_rate?: string;
  }>;
}

/**
 * Ask ffprobe what actually landed on disk, rather than trusting our own report.
 *
 * JSON rather than the flat key/value form: an MP4 has two streams, and flattening them into
 * one namespace lets the audio stream's `r_frame_rate=0/0` overwrite the video's.
 */
async function probe(path: string): Promise<Probe> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration,format_name:stream=codec_name,codec_type,width,height,r_frame_rate",
    "-of",
    "json",
    path,
  ]);
  return JSON.parse(stdout) as Probe;
}

test(
  "a two-slide deck compiles to a playable narrated MP4",
  { timeout: 900_000 },
  async () => {
    const input = join(workspace, "fixture.yaml");
    const output = join(workspace, "fixture.mp4");
    await writeFile(input, FIXTURE, "utf8");

    const summary = await renderPresentationFile(input, output);

    assert.equal(summary.timeline.scenes.length, 2);
    assert.equal(summary.report.width, 1920);
    assert.equal(summary.report.height, 1080);
    assert.equal(summary.report.fps, 30);
    assert.equal(summary.report.totalFrames, summary.timeline.totalFrames);

    const written = await stat(output);
    assert.ok(written.size > 10_000, `the MP4 is only ${written.size} bytes`);

    const probed = await probe(output);
    assert.match(probed.format.format_name, /mp4/);

    // One video stream and one audio stream, in the codecs decision:5's toolchain promises.
    const video = probed.streams.find((stream) => stream.codec_type === "video");
    const audio = probed.streams.find((stream) => stream.codec_type === "audio");
    assert.ok(video !== undefined, "the MP4 has no video stream");
    assert.ok(audio !== undefined, "the MP4 has no audio stream — the deck is silent");
    assert.equal(video.codec_name, "h264");
    assert.equal(audio.codec_name, "aac");
    assert.equal(video.width, 1920);
    assert.equal(video.height, 1080);
    assert.equal(video.r_frame_rate, "30/1");

    // The container's duration must match the timeline we derived, or narration is being
    // clipped or padded somewhere between the compiler and ffmpeg (dragon:1).
    const expectedSeconds = summary.timeline.totalFrames / summary.timeline.fps;
    const actualSeconds = Number(probed.format.duration);
    assert.ok(
      Math.abs(actualSeconds - expectedSeconds) < 0.15,
      `expected about ${expectedSeconds.toFixed(2)}s, ffprobe says ${actualSeconds}s`,
    );

    // Narration is measured, so scene lengths must not be round numbers by accident.
    const [first] = summary.timeline.scenes;
    assert.ok(first !== undefined);
    assert.ok(
      first.narrationDurationInFrames > 15,
      "the first slide has no measurable narration",
    );
    assert.equal(
      first.narrationFrom,
      15,
      "narration should start after 500ms of pre_say",
    );
  },
);

test(
  "narration is kept where a failed render can be inspected",
  { timeout: 900_000 },
  async () => {
    const input = join(workspace, "kept.yaml");
    await writeFile(input, FIXTURE, "utf8");
    const summary = await renderPresentationFile(input, join(workspace, "kept.mp4"));

    const wav = await readFile(
      join(summary.workspace, "public", "narration", "slide-01-01.wav"),
    );
    assert.equal(wav.subarray(0, 4).toString("ascii"), "RIFF");
    assert.ok(summary.workspace.startsWith(join(repositoryRoot(), ".cuecraft")));

    await rm(summary.workspace, { recursive: true, force: true });
  },
);
