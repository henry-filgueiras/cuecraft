import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";

import { extractFrame, FrameError } from "./frame.ts";

/**
 * Frame extraction against a real film, with a real decoder.
 *
 * Named `*.live-test.ts` so `npm test` cannot pick it up: it needs ffmpeg, which the ordinary suite
 * is arranged not to require. Run it with `npm run test:ffmpeg`.
 *
 * **The claim being tested is frame identity, and it is tested against ground truth rather than
 * against a colour.** The fixture is a film whose every frame is a distinct flat grey — luma equal
 * to twice the frame index — and the ground truth is that same film decoded end to end into a
 * numbered PNG sequence. A seeked extraction is correct when its bytes equal the sequence's Nth
 * image, which is a comparison of two outputs of the *same* decoder and so is unaffected by codec
 * loss, colour range or pixel format.
 *
 * That distinction matters here more than it usually would. The project's own note about this says
 * never to hash the output MP4's pixels to prove two frames are the same, because H.264 is lossy and
 * GOP-dependent — and that is exactly right for the claim it was written about, which is *are these
 * two source frames identical*. The claim here is the different one: *did the seek land on the frame
 * I asked for*. Decoding the same encoded frame twice is deterministic, so comparing a seeked
 * decode against a sequential decode of the same film answers it exactly.
 *
 * The first rule this file was written against was wrong, and the test is the reason that is known:
 * seeking to the middle of a frame's interval returns the *next* frame, because `-ss` yields the
 * first frame at or after the timestamp. Every extraction would have been one frame late, and the
 * last frame of every film would have produced nothing at all.
 */

const run = promisify(execFile);

const FPS = 30;
const FRAMES = 60;

let workspace: string;
let film: string;
/** The film decoded end to end, indexed by frame: the ground truth every assertion is against. */
const truth: string[] = [];

before(async () => {
  workspace = await mkdtemp(join(tmpdir(), "cuecraft-frame-"));
  film = join(workspace, "ladder.mp4");

  // A flat grey per frame, climbing by three from twenty. Lossless — but H.264 carries luma in the
  // limited 16-235 range, so the ladder has to live inside that range and step widely enough that
  // the expansion back to 0-255 cannot land two frames on the same value. A ladder from zero in
  // steps of two clipped at both ends and collided on eight pairs of frames.
  await run("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=64x64:r=${FPS}:d=${FRAMES / FPS}`,
    "-vf",
    "geq=lum='20+3*N':cb=128:cr=128",
    "-c:v",
    "libx264",
    "-crf",
    "0",
    "-pix_fmt",
    "yuv420p",
    film,
  ]);

  const sequence = join(workspace, "truth");
  await mkdir(sequence, { recursive: true });
  await run("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    film,
    join(sequence, "%04d.png"),
  ]);
  const written = (await readdir(sequence)).sort();
  for (const name of written) {
    truth.push(
      createHash("sha256")
        .update(await readFile(join(sequence, name)))
        .digest("hex"),
    );
  }
});

after(async () => {
  if (workspace !== undefined) await rm(workspace, { recursive: true, force: true });
});

async function digest(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

test("the fixture is the film the assertions assume", () => {
  assert.equal(truth.length, FRAMES, "the ladder should decode to one image per frame");
  assert.equal(new Set(truth).size, FRAMES, "and every frame should be distinguishable");
});

test("an extracted frame is the frame that was asked for", async () => {
  for (const frame of [0, 1, 2, 17, 44, 45, 58]) {
    const output = join(workspace, `at-${frame}.png`);
    await extractFrame({ video: film, frame, fps: FPS, output });
    assert.equal(
      await digest(output),
      truth[frame],
      `frame ${frame} came back as some other frame`,
    );
  }
});

/**
 * The two ends, which are the two the arithmetic can lose.
 *
 * The last frame is the one that the half-a-frame-late rule dropped entirely — nothing follows it,
 * so "the first frame at or after" had nothing to return — and it is also the end of the film a
 * short final slide lives at, which is the failure this whole round exists to prevent.
 */
test("the first and last frames of the film are both reachable", async () => {
  for (const frame of [0, FRAMES - 1]) {
    const output = join(workspace, `edge-${frame}.png`);
    await extractFrame({ video: film, frame, fps: FPS, output });
    assert.equal(await digest(output), truth[frame]);
  }
});

test("every frame of a short film is extractable, one at a time", async () => {
  for (let frame = 0; frame < FRAMES; frame += 1) {
    const output = join(workspace, "sweep.png");
    await extractFrame({ video: film, frame, fps: FPS, output });
    assert.equal(await digest(output), truth[frame], `frame ${frame}`);
  }
});

test("a frame past the end of the film is refused, not silently empty", async () => {
  await assert.rejects(
    () =>
      extractFrame({
        video: film,
        frame: FRAMES + 30,
        fps: FPS,
        output: join(workspace, "past.png"),
      }),
    FrameError,
  );
});
