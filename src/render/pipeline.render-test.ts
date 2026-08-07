import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";

import { narrativeStack, stackProblem } from "../compile/timeline.ts";
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
        - id: one
          text: One
        - Two
    say:
      - "This is the first slide."
      - pause: 600ms
      - speech: "It has two clips."
        activates: one

  - slide:
      title: "Second"
    say: And this is the second.
`;

/**
 * The same slice, descending.
 *
 * A root world with a child module and a grandchild module, narrated so that both resumptions
 * happen: something is said in the child before it enters the grandchild, and something after
 * it returns. Small enough to synthesize in a few seconds, and it exercises everything the
 * pure tests cannot — that Remotion can actually draw a world inside a world inside a world.
 */
const NESTED_ROOT = `
title: "Nested render test"

defaults:
  pre_say: 400ms
  post_say: 900ms

slides:
  - slide:
      title: "Outside"
      world:
        entities:
          before: Before
          middle:
            label: The middle
            child: ./nested-child.yaml
          after: After
        relations:
          - before -> middle
          - middle -> after
    say:
      - speech: "This happens first."
        activates: before
      - enter: middle
      - speech: "And this happens last."
        activates: after
`;

const NESTED_CHILD = `
world:
  entities:
    one: Step one
    two:
      label: Step two
      child: ./nested-grandchild.yaml
    three: Step three
  relations:
    - one -> two
    - two -> three
say:
  - speech: "Inside, there are three steps."
    activates: one
  - speech: "The second one has an inside of its own."
    activates: two
  - enter: two
  - speech: "And then the third step."
    activates: three
`;

const NESTED_GRANDCHILD = `
world:
  entities:
    deep: Deep inside
    out: On the way out
  relations:
    - deep -> out
say:
  - speech: "This is as deep as it goes."
    activates: deep
  - speech: "And now back up."
    activates: out
`;

/**
 * A bounded population, with nothing cryptographic anywhere near it.
 *
 * The counts are deliberately awkward — a prime, a two-group split, and the degenerate one — so
 * that a `series` which only worked for sixty-four would fail here rather than in the artifact
 * it was built for.
 */
const SERIES_FIXTURE = `
title: "Counting things"

defaults:
  pre_say: 300ms
  post_say: 600ms

slides:
  - slide:
      title: "Seven"
      series:
        - id: seven
          count: 7
          text: prime, so the field cannot be square
    say:
      - speech: "Seven of them, filling in reading order."
        fills: seven

  - slide:
      title: "Sixteen and forty-eight"
      series:
        - count: 16
          text: already here
        - id: later
          count: 48
          text: arriving while this is spoken
    say:
      - speech: "Sixteen are present, and forty-eight more arrive across this sentence."
        fills: later
`;

let workspace: string;
/** A second workspace *inside* the checkout: a module is contained by it, like a quoted file. */
let nested: string;

before(async () => {
  const problem = describeMissingArtifacts();
  if (problem !== undefined) {
    throw new Error(`${problem}\n\nThis test requires the local model.`);
  }
  workspace = await mkdtemp(join(tmpdir(), "cuecraft-render-"));
  nested = await mkdtemp(join(repositoryRoot(), ".cuecraft", "render-nested-"));
});

after(() =>
  Promise.all(
    [workspace, nested].map((path) => rm(path, { recursive: true, force: true })),
  ),
);

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

test(
  "a deck that descends two levels renders as one continuous video",
  { timeout: 900_000 },
  async () => {
    const input = join(nested, "root.yaml");
    const output = join(nested, "nested.mp4");
    await writeFile(input, NESTED_ROOT, "utf8");
    await writeFile(join(nested, "nested-child.yaml"), NESTED_CHILD, "utf8");
    await writeFile(join(nested, "nested-grandchild.yaml"), NESTED_GRANDCHILD, "utf8");

    const summary = await renderPresentationFile(input, output);

    // One scene, whatever the depth. That is the claim: a descent is not a cut.
    assert.equal(summary.timeline.scenes.length, 1);
    const [scene] = summary.timeline.scenes;
    assert.ok(scene !== undefined);
    assert.equal(scene.layout, "atlas");

    // The compiled stack descends two levels and unwinds through the same scopes.
    assert.equal(stackProblem(scene), undefined);
    assert.deepEqual(
      narrativeStack(scene)
        .filter((event) => event.kind !== "narrate")
        .map((event) => `${event.kind} ${event.into}`),
      [
        "enter root/middle",
        "enter root/middle/two",
        "exit root/middle/two",
        "exit root/middle",
      ],
    );

    // Nothing overlaps, and the child really did speak between its own two thresholds.
    let cursor = scene.narrationFrom;
    for (const event of narrativeStack(scene)) {
      assert.ok(event.frame >= cursor, `${event.kind} at ${event.frame} begins early`);
      cursor = event.frame + event.durationInFrames;
    }

    const written = await stat(output);
    assert.ok(written.size > 10_000, `the MP4 is only ${written.size} bytes`);

    const probed = await probe(output);
    const video = probed.streams.find((stream) => stream.codec_type === "video");
    const audio = probed.streams.find((stream) => stream.codec_type === "audio");
    assert.ok(video !== undefined && audio !== undefined);
    assert.equal(video.width, 1920);

    const expectedSeconds = summary.timeline.totalFrames / summary.timeline.fps;
    assert.ok(Math.abs(Number(probed.format.duration) - expectedSeconds) < 0.15);

    await rm(summary.workspace, { recursive: true, force: true });
  },
);

test(
  "a bounded population fills over measured narration, on the real rendering path",
  { timeout: 900_000 },
  async () => {
    const input = join(workspace, "series.yaml");
    const output = join(workspace, "series.mp4");
    await writeFile(input, SERIES_FIXTURE, "utf8");

    const summary = await renderPresentationFile(input, output);
    const [seven, split] = summary.timeline.scenes;
    assert.ok(seven !== undefined && split !== undefined);

    // Both compositions came from the role, not from anything about the counts.
    assert.equal(seven.layout, "series");
    assert.equal(split.layout, "series");

    // One span per slide, and it is the *measured* clip that gave it its length.
    for (const scene of [seven, split]) {
      assert.equal(scene.spans.length, 1);
      const span = scene.spans[0];
      const clip = scene.clips[scene.spans[0]?.clipIndex ?? 0];
      assert.ok(span !== undefined && clip !== undefined);
      assert.ok(span.durationInFrames > 1, "a fill with no duration is a cut");
      assert.ok(span.from >= clip.from, "a fill must not begin before its clip");
      assert.ok(
        span.from + span.durationInFrames <= clip.from + clip.durationInFrames,
        "a fill must not outlast its clip",
      );
    }

    // Fifty-five members between them, and two clips: a population costs no narration.
    assert.equal(seven.clips.length + split.clips.length, 2);
    // The second slide's group that is *not* filled has no span and no anchor — it is simply
    // there, which is what an element the narration never reaches has always been.
    assert.equal(split.spans[0]?.id, "later");

    const written = await stat(output);
    assert.ok(written.size > 10_000, `the MP4 is only ${written.size} bytes`);
    const probed = await probe(output);
    assert.ok(probed.streams.some((stream) => stream.codec_type === "video"));

    await rm(summary.workspace, { recursive: true, force: true });
  },
);
