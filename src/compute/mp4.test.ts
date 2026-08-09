import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import { readMp4 } from "./mp4.ts";

/**
 * The container reader, against files built byte by byte in this file.
 *
 * Hand-built rather than encoded by ffmpeg, and that is the point rather than a compromise. The
 * whole claim of `./mp4.ts` is that it walks a **sized box tree** and never scans, and the only way
 * to test that is to hand it trees that a scanner would get wrong: a `moov` after the payload, a
 * `mdat` whose bytes spell `moov`, a box whose declared length runs off the end. ffmpeg produces
 * none of those, which makes it a fine smoke test and a poor adversary — the real files are
 * exercised by `./r.live-test.ts`, where a program actually encodes one.
 *
 * The builders below are a test fixture: not exported, and no part of what cuecraft ships.
 */

let workspace: string;

before(async () => {
  workspace = await mkdtemp(join(tmpdir(), "cuecraft-mp4-"));
});

after(async () => {
  if (workspace !== undefined) await rm(workspace, { recursive: true, force: true });
});

/** One box: a 32-bit length, four characters, and the payload. */
function box(type: string, ...payload: readonly Buffer[]): Buffer {
  const body = Buffer.concat([...payload]);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(body.length + 8, 0);
  header.write(type, 4, "latin1");
  return Buffer.concat([header, body]);
}

function u32(...values: readonly number[]): Buffer {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeUInt32BE(value, index * 4));
  return buffer;
}

function zeros(bytes: number): Buffer {
  return Buffer.alloc(bytes);
}

const FTYP = box(
  "ftyp",
  Buffer.from("isom", "latin1"),
  u32(512),
  Buffer.from("isom", "latin1"),
);

/** `mvhd` version 0: version+flags, created, modified, timescale, duration, then the tail. */
function mvhd(timescale: number, duration: number): Buffer {
  return box("mvhd", u32(0, 0, 0, timescale, duration), zeros(80));
}

/** `tkhd` version 0, whose last two fields are the display size in 16.16 fixed point. */
function tkhd(width: number, height: number): Buffer {
  return box(
    "tkhd",
    u32(0, 0, 0, 1, 0, 0),
    zeros(8),
    zeros(8),
    zeros(36),
    u32(width * 65_536, height * 65_536),
  );
}

function hdlr(kind: string): Buffer {
  return box("hdlr", u32(0, 0), Buffer.from(kind, "latin1"), zeros(12));
}

function trak(kind: string, size?: { width: number; height: number }): Buffer {
  return box(
    "trak",
    size === undefined ? Buffer.alloc(0) : tkhd(size.width, size.height),
    box("mdia", hdlr(kind)),
  );
}

const VIDEO = trak("vide", { width: 1656, height: 552 });
const AUDIO = trak("soun");

async function write(name: string, ...parts: readonly Buffer[]): Promise<string> {
  const path = join(workspace, name);
  await writeFile(path, Buffer.concat([...parts]));
  return path;
}

test("a film's duration, size and silence are read out of its header", async () => {
  const path = await write("silent.mp4", FTYP, box("moov", mvhd(600, 4800), VIDEO));

  const { artifact, problem } = await readMp4(path);

  assert.equal(problem, undefined);
  assert.deepEqual(artifact, {
    durationSeconds: 8,
    width: 1656,
    height: 552,
    hasAudio: false,
  });
});

test("a sound track anywhere in the file is reported", async () => {
  const path = await write("loud.mp4", FTYP, box("moov", mvhd(1000, 2500), VIDEO, AUDIO));

  const { artifact } = await readMp4(path);

  assert.equal(artifact?.hasAudio, true);
  assert.equal(artifact?.durationSeconds, 2.5);
});

test("a header after the payload is found, because the walk follows sizes", async () => {
  // How ffmpeg writes an MP4 without `-movflags +faststart`, which is the common case.
  const payload = box("mdat", zeros(4096));
  const path = await write(
    "trailing.mp4",
    FTYP,
    payload,
    box("moov", mvhd(90_000, 90_000), VIDEO),
  );

  const { artifact } = await readMp4(path);

  assert.equal(artifact?.durationSeconds, 1);
});

test("bytes inside the payload that spell a box type are not mistaken for one", async () => {
  // A scanner would find this `moov` and read a duration out of whatever followed it. The sized
  // walk steps straight over the whole `mdat`, which is the property under test.
  const decoy = Buffer.concat([
    u32(0x0000_0100),
    Buffer.from("moov", "latin1"),
    u32(0, 0, 0, 1, 999_999),
  ]);
  const path = await write(
    "decoy.mp4",
    FTYP,
    box("mdat", decoy, zeros(512)),
    box("moov", mvhd(30, 150), VIDEO),
  );

  const { artifact } = await readMp4(path);

  assert.equal(artifact?.durationSeconds, 5);
});

test("a 64-bit box length is followed", async () => {
  const body = Buffer.concat([box("moov", mvhd(100, 250), VIDEO)]);
  const header = Buffer.alloc(16);
  header.writeUInt32BE(1, 0);
  header.write("mdat", 4, "latin1");
  header.writeBigUInt64BE(BigInt(16 + 32), 8);
  const path = await write("large.mp4", FTYP, header, zeros(32), body);

  const { artifact } = await readMp4(path);

  assert.equal(artifact?.durationSeconds, 2.5);
});

test("a file that is not an MP4 is refused as one, not as a broken box", async () => {
  const path = join(workspace, "notes.txt");
  await writeFile(path, "this is a perfectly good text file\n");

  const { artifact, problem } = await readMp4(path);

  assert.equal(artifact, undefined);
  assert.match(problem ?? "", /ftyp/);
});

test("a file with no moov is refused as carrying no duration", async () => {
  const path = await write("truncated.mp4", FTYP, box("mdat", zeros(64)));

  const { problem } = await readMp4(path);

  assert.match(problem ?? "", /no moov/);
});

test("a zero duration is refused, because the timeline cannot allocate to it", async () => {
  const path = await write("empty.mp4", FTYP, box("moov", mvhd(600, 0), VIDEO));

  const { problem } = await readMp4(path);

  assert.match(problem ?? "", /no duration/);
});

test("an unknown duration is refused the same way a zero one is", async () => {
  const path = await write(
    "live.mp4",
    FTYP,
    box("moov", mvhd(600, 0xff_ff_ff_ff), VIDEO),
  );

  const { problem } = await readMp4(path);

  assert.match(problem ?? "", /no duration/);
});

test("a film with no video track has nothing to shape a room by", async () => {
  const path = await write("sound.mp4", FTYP, box("moov", mvhd(600, 4800), AUDIO));

  const { problem } = await readMp4(path);

  assert.match(problem ?? "", /no video track/);
});

test("a box that claims more length than the file has is refused", async () => {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(4096, 0);
  header.write("moov", 4, "latin1");
  const path = await write("lying.mp4", FTYP, header, zeros(16));

  const { problem } = await readMp4(path);

  assert.match(problem ?? "", /length the file does not have/);
});

test("a file that does not exist is refused rather than thrown", async () => {
  const { artifact, problem } = await readMp4(join(workspace, "absent.mp4"));

  assert.equal(artifact, undefined);
  assert.match(problem ?? "", /cannot be opened/);
});
