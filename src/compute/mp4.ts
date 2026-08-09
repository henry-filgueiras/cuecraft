import { open, type FileHandle } from "node:fs/promises";

/**
 * Reading a film a foreign program encoded, and finding out how long it runs.
 *
 * The fourth thing a program may hand back (decision:56), and the first with a time axis. What
 * cuecraft needs from it is exactly three facts — **how long, how large, and whether it makes a
 * sound** — and the reason it reads them itself rather than being told is `pngSize`'s reason with
 * a much sharper edge on it. A picture whose program lied about its width is a picture in the
 * wrong box. A *film* whose program lied about its length is a hole in the timeline: the medium's
 * duration is what `../compile/compile.ts` advances the narration cursor by, so an eight-second
 * declaration over a seven-second file would put a second of frozen last frame into the film and
 * nothing anywhere would know it was there.
 *
 * So the file settles it, and the file is the only thing that may.
 *
 * ## Why there is no ffprobe here, and no decoder
 *
 * decision:5 says delegate media primitives to mature libraries, and this looks at first like the
 * place to spend that. It is not, and the reason is proportion: an ISO base media file states its
 * own duration in a header near one end of the file, in two integers, and reaching them is a walk
 * over a sized box tree. `pngSize` reads twenty-four bytes to answer the same question for a still.
 * Spawning a second process, or taking a dependency that carries one, to read two integers would
 * be a build-time dependency of every render in exchange for arithmetic.
 *
 * The line is the same one `./svg.ts` draws: this reads a **header**, never a payload. The moment
 * anything here wants to know what is *in* a frame, it needs a decoder and should get one rather
 * than a longer parser. Remotion already carries that decoder for the half of the problem that
 * genuinely needs it — drawing the thing — and this half never touches a pixel.
 *
 * ## The walk
 *
 *     [size:u32][type:4]  ... payload ...
 *
 * with `size == 1` meaning a 64-bit size follows the type, and `size == 0` meaning the box runs to
 * the end of the file. Top-level boxes are walked from their sizes with a file handle, so a
 * two-hundred-megabyte `mdat` costs one seek; only `moov` is read into memory, and only up to a
 * ceiling, because a `moov` is metadata and a metadata box the size of a film is not one.
 *
 * `moov/mvhd` carries the movie timescale and duration. Each `moov/trak` carries a `tkhd` with the
 * track's display size as 16.16 fixed point, and an `mdia/hdlr` naming what kind of track it is —
 * `vide` or `soun`. That is the whole of what is read.
 */

export interface Mp4Artifact {
  /** From `mvhd`: duration divided by timescale. The number the timeline borrows. */
  readonly durationSeconds: number;
  /** The video track's display size, from `tkhd`. Only the ratio survives being fitted. */
  readonly width: number;
  readonly height: number;
  /** Whether any track's handler is `soun`. cuecraft has one producer of sound; see decision:64. */
  readonly hasAudio: boolean;
}

/**
 * How large a `moov` may be before this stops reading it.
 *
 * Sixty-four megabytes, which is far past any honest one — the k-means animation's is under
 * forty kilobytes — and the point of the ceiling is the same as `MAX_TEXT_OUTPUT_BYTES`': to
 * refuse in a sentence rather than to fail in an allocator.
 */
export const MAX_MOOV_BYTES = 64_000_000;

/** The first eight bytes of every box: a 32-bit size and a four-character type. */
const HEADER_BYTES = 8;

/**
 * A film's duration, size and soundedness, or why the file is not one cuecraft can take.
 *
 * Every refusal below is a program that ran to completion and wrote something cuecraft would
 * otherwise put on a slide *and give presentation time to*, which is the failure this whole
 * mechanism exists to prevent. None of them has a fallback.
 */
export async function readMp4(
  path: string,
): Promise<{ artifact?: Mp4Artifact; problem?: string }> {
  let handle: FileHandle;
  try {
    handle = await open(path, "r");
  } catch {
    return { problem: "it cannot be opened" };
  }
  try {
    const { size } = await handle.stat();
    return await read(handle, size);
  } finally {
    await handle.close();
  }
}

async function read(
  handle: FileHandle,
  size: number,
): Promise<{ artifact?: Mp4Artifact; problem?: string }> {
  let offset = 0;
  let first: string | undefined;
  let moov: Buffer | undefined;

  while (offset + HEADER_BYTES <= size) {
    const header = Buffer.alloc(16);
    const { bytesRead } = await handle.read(header, 0, header.length, offset);
    if (bytesRead < HEADER_BYTES) break;

    const type = header.subarray(4, 8).toString("latin1");
    // Checked on the first box rather than after the walk, so a file that is not an MP4 at all is
    // told that plainly instead of being told which of its bytes failed to be a box header.
    if (first === undefined && (!isBoxType(type) || type !== "ftyp")) break;
    if (!isBoxType(type)) {
      return { problem: `there is no box where one was expected, ${offset} bytes in` };
    }
    first ??= type;

    let length = header.readUInt32BE(0);
    let contentStart = offset + HEADER_BYTES;
    if (length === 1) {
      if (bytesRead < 16) break;
      // A 64-bit size. Node reads it as a BigInt; a box larger than 2^53 bytes is not a thing
      // that fits on a disk, so narrowing it here loses nothing and keeps the arithmetic ordinary.
      length = Number(header.readBigUInt64BE(8));
      contentStart += 8;
    } else if (length === 0) {
      length = size - offset;
    }
    if (length < contentStart - offset || offset + length > size) {
      return { problem: `the ${type} box claims a length the file does not have` };
    }

    if (type === "moov") {
      const bytes = offset + length - contentStart;
      if (bytes > MAX_MOOV_BYTES) {
        return {
          problem:
            `its header is ${(bytes / 1_000_000).toFixed(1)}MB, and cuecraft reads a moov box ` +
            `up to ${MAX_MOOV_BYTES / 1_000_000}MB`,
        };
      }
      moov = Buffer.alloc(bytes);
      await handle.read(moov, 0, bytes, contentStart);
      break;
    }

    offset += length;
  }

  if (first !== "ftyp") {
    return {
      problem:
        "it does not begin with an ftyp box; a video output is an MP4, and ffmpeg writes one " +
        "for `-f mp4`",
    };
  }
  if (moov === undefined) {
    return {
      problem:
        "it has no moov box, so it carries no duration; an interrupted encode produces this",
    };
  }
  return interpret(moov);
}

function interpret(moov: Buffer): { artifact?: Mp4Artifact; problem?: string } {
  const header = child(moov, 0, moov.length, "mvhd");
  if (header === undefined) return { problem: "its moov box carries no mvhd" };

  const timing = movieTiming(moov, header);
  if (timing === undefined) return { problem: "its mvhd is truncated" };
  if (timing.timescale === 0) return { problem: "its mvhd declares a zero timescale" };
  // 0xFFFFFFFF is how the format says "unknown", and a fragmented MP4 written without a final
  // rewrite says it. cuecraft cannot allocate frames to a film of unknown length.
  if (timing.duration === 0 || timing.duration === 0xff_ff_ff_ff) {
    return {
      problem:
        "its mvhd declares no duration; cuecraft needs a length before it can give the medium " +
        "any of the film's time",
    };
  }

  let width = 0;
  let height = 0;
  let hasAudio = false;
  for (const trak of children(moov, 0, moov.length, "trak")) {
    const kind = handlerOf(moov, trak);
    if (kind === "soun") hasAudio = true;
    if (kind !== "vide" || width > 0) continue;
    const size = trackSize(moov, trak);
    if (size !== undefined) {
      width = size.width;
      height = size.height;
    }
  }

  if (width <= 0 || height <= 0) {
    return {
      problem:
        "it has no video track with a display size; cuecraft places a medium by its own aspect " +
        "ratio and has nothing to place this by",
    };
  }

  return {
    artifact: {
      durationSeconds: timing.duration / timing.timescale,
      width,
      height,
      hasAudio,
    },
  };
}

/** `mvhd`'s timescale and duration, at whichever offsets its version puts them. */
function movieTiming(
  buffer: Buffer,
  box: Span,
): { timescale: number; duration: number } | undefined {
  const version = buffer[box.start];
  const at = box.start + 4;
  if (version === 1) {
    if (at + 28 > box.end) return undefined;
    return {
      timescale: buffer.readUInt32BE(at + 16),
      duration: Number(buffer.readBigUInt64BE(at + 20)),
    };
  }
  if (at + 16 > box.end) return undefined;
  return {
    timescale: buffer.readUInt32BE(at + 8),
    duration: buffer.readUInt32BE(at + 12),
  };
}

/** What kind of track this is, from `trak/mdia/hdlr`. `vide`, `soun`, or something cuecraft ignores. */
function handlerOf(buffer: Buffer, trak: Span): string | undefined {
  const mdia = child(buffer, trak.start, trak.end, "mdia");
  if (mdia === undefined) return undefined;
  const hdlr = child(buffer, mdia.start, mdia.end, "hdlr");
  if (hdlr === undefined || hdlr.start + 12 > hdlr.end) return undefined;
  return buffer.subarray(hdlr.start + 8, hdlr.start + 12).toString("latin1");
}

/**
 * A track's display size, from `tkhd`'s last two fields.
 *
 * 16.16 fixed point, and rounded here rather than carried as a fraction: the composition uses this
 * as an aspect ratio and a browser will not lay out a third of a pixel. A rotated track states its
 * rotation in the matrix and its *display* size in these fields, so this is the number a player
 * would show and therefore the number the room should be shaped like.
 */
function trackSize(
  buffer: Buffer,
  trak: Span,
): { width: number; height: number } | undefined {
  const tkhd = child(buffer, trak.start, trak.end, "tkhd");
  if (tkhd === undefined) return undefined;
  if (tkhd.end - tkhd.start < 8) return undefined;
  const version = buffer[tkhd.start];
  // version 0: 4 header + 4 + 4 + 4 + 4 + 4 ; version 1: 4 header + 8 + 8 + 4 + 4 + 8
  const afterTiming = tkhd.start + (version === 1 ? 36 : 24);
  // reserved(8) layer(2) alternate(2) volume(2) reserved(2) matrix(36)
  const at = afterTiming + 52;
  if (at + 8 > tkhd.end) return undefined;
  return {
    width: Math.round(buffer.readUInt32BE(at) / 65_536),
    height: Math.round(buffer.readUInt32BE(at + 4) / 65_536),
  };
}

/** Where one box's payload begins and ends, in the buffer that holds it. */
interface Span {
  readonly start: number;
  readonly end: number;
}

function child(
  buffer: Buffer,
  start: number,
  end: number,
  type: string,
): Span | undefined {
  for (const span of children(buffer, start, end, type)) return span;
  return undefined;
}

/**
 * Every direct child of this range with the given type, walked by their own sizes.
 *
 * Sized rather than searched, deliberately. Scanning a buffer for the four bytes `moov` would find
 * them inside a compressed frame as readily as at the head of a box, and a parser that can be
 * fooled by its own input is a parser that reports somebody else's duration.
 */
function* children(
  buffer: Buffer,
  start: number,
  end: number,
  type: string,
): Generator<Span> {
  let offset = start;
  while (offset + HEADER_BYTES <= end) {
    let length = buffer.readUInt32BE(offset);
    const found = buffer.subarray(offset + 4, offset + 8).toString("latin1");
    let contentStart = offset + HEADER_BYTES;
    if (length === 1) {
      if (contentStart + 8 > end) return;
      length = Number(buffer.readBigUInt64BE(contentStart));
      contentStart += 8;
    } else if (length === 0) {
      length = end - offset;
    }
    if (length < contentStart - offset || offset + length > end) return;
    if (found === type) yield { start: contentStart, end: offset + length };
    offset += length;
  }
}

/** A box type is four printable characters. Anything else means the walk has lost the tree. */
function isBoxType(type: string): boolean {
  return /^[\x20-\x7e]{4}$/.test(type);
}
