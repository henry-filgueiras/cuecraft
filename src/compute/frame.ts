import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

/**
 * Taking one frame out of a rendered film.
 *
 * The other half of decision:66. A symbol table says *which* frame is worth looking at; this is
 * what turns that number into something an eye — or a model — can look at. It is deliberately the
 * smallest thing that can be: resolve a frame, ask ffmpeg for it, write a PNG. Nothing here
 * decodes, compares, hashes, or judges a picture, and the moment something wants to, it needs a
 * different module and probably a different decision.
 *
 * ## Why ffmpeg, and why from the PATH
 *
 * decision:5 delegates media primitives to mature libraries, and this is as plainly a media
 * primitive as they come. Remotion's renderer carries a compositor that can do it, behind an
 * unexported internal payload; reaching into that would trade a documented tool for a private API
 * on a dependency cuecraft already pins tightly.
 *
 * So it spawns `ffmpeg`, and `scripts/compress-for-upload.sh` is the precedent — cuecraft has
 * already decided that a projection of a rendered film may be produced by the tool everybody has.
 * It is not required to *render*: a machine with no ffmpeg still compiles films and still writes
 * symbol tables. Only `cuecraft snapshot` needs it, and a missing binary is reported in a sentence
 * with the command that fixes it rather than as a spawn error.
 *
 * ## Why the seek is half a frame early
 *
 * dragon:38 says a moment that lands exactly on a frame boundary is a rounding hazard, and asking
 * for `frame / fps` seconds asks for exactly such a moment: the boundary between frame N-1 and
 * frame N, where a container whose timestamps are a microsecond either side of the arithmetic can
 * hand back either one. So the seek is offset by half a frame — and **which way** is the whole of
 * this comment, because the obvious direction is wrong and wrong quietly.
 *
 *     seek = max(0, frame - 0.5) / fps
 *
 * `-ss` before `-i` is an *accurate* seek: ffmpeg lands on the keyframe at or before the timestamp,
 * decodes forward, and discards every frame whose presentation time is **less than** the target. So
 * it yields the first frame at or after the instant asked for, and aiming at the middle of frame N's
 * own interval — `(N + 0.5) / fps`, which reads like the safest possible choice — discards frame N
 * and returns frame N+1. Every extracted snapshot would have been one frame late, and the last frame
 * of a film would have produced no image at all, because nothing follows it.
 *
 * Half a frame *early* puts the target inside frame N-1's interval, strictly after its start, so the
 * first frame at or after it is frame N exactly. Verified against ground truth for the first frame,
 * the last frame, and frames in between, by decoding a film to a numbered PNG sequence and comparing
 * the seeked extraction to the sequence.
 */

const run = promisify(execFile);

export class FrameError extends Error {}

export interface FrameRequest {
  readonly video: string;
  /** Absolute frame, in the film's own frames. The number a symbol carries. */
  readonly frame: number;
  readonly fps: number;
  readonly output: string;
}

/** Where in the film to seek for a given frame: half a frame before it starts. */
export function seekSecondsFor(frame: number, fps: number): number {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new FrameError(`frame must be a whole number of frames, got ${frame}`);
  }
  if (!Number.isInteger(fps) || fps <= 0) {
    throw new FrameError(`fps must be a positive integer, got ${fps}`);
  }
  return Math.max(0, frame - 0.5) / fps;
}

/**
 * Write one frame of a film to a PNG.
 *
 * Input seeking rather than output seeking, so a long film costs a keyframe scan rather than a full
 * decode; ffmpeg decodes forward from the keyframe to the requested instant, which is exact.
 */
export async function extractFrame(request: FrameRequest): Promise<string> {
  const seek = seekSecondsFor(request.frame, request.fps);
  await mkdir(dirname(request.output), { recursive: true });
  try {
    await run("ffmpeg", [
      "-nostdin",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      seek.toFixed(6),
      "-i",
      request.video,
      "-frames:v",
      "1",
      // `-update 1` says this single image is the whole output, rather than the first of a numbered
      // sequence ffmpeg would otherwise warn about writing to a name with no pattern in it.
      "-update",
      "1",
      request.output,
    ]);
  } catch (error) {
    throw new FrameError(describe(error, request));
  }

  // ffmpeg exits 0 having written nothing when the seek lands past the end of the film — there was
  // no frame at or after the timestamp, so there was nothing to encode and nothing went wrong from
  // its point of view. A silent success with no image is the worst available outcome for a caller
  // that is about to report a snapshot, so the file is what settles it.
  if (!existsSync(request.output)) {
    throw new FrameError(
      `${request.video} has no frame ${request.frame}; the film may be shorter than the ` +
        `symbol table describes, which means they came from different renders`,
    );
  }
  return request.output;
}

function describe(error: unknown, request: FrameRequest): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  ) {
    return (
      "ffmpeg is not on the PATH, and extracting a frame needs it. " +
      "Install it (`brew install ffmpeg`); rendering and symbol tables do not need it."
    );
  }
  const stderr =
    typeof error === "object" && error !== null && "stderr" in error
      ? String(error.stderr).trim()
      : "";
  return (
    `ffmpeg could not take frame ${request.frame} out of ${request.video}` +
    (stderr === "" ? "" : `: ${stderr.split("\n").at(-1)}`)
  );
}
