import assert from "node:assert/strict";
import { test } from "node:test";

import { FrameError, seekSecondsFor } from "./frame.ts";

/**
 * The arithmetic, without ffmpeg.
 *
 * The round-trip against a real film lives in `./frame.live-test.ts`, because it needs a binary the
 * ordinary suite is careful not to require. What is asserted here is the rule that round trip
 * *discovered*, so that a future change to the offset fails in a second rather than in a render.
 */

test("a frame is sought half a frame before it starts, never after", () => {
  assert.equal(seekSecondsFor(30, 30), 29.5 / 30);
  assert.equal(seekSecondsFor(1, 30), 0.5 / 30);

  // The direction is the whole point. `-ss` yields the first frame at or after the timestamp, so
  // aiming at the middle of frame N's own interval returns frame N+1 — which is what the obvious
  // rule does, and it is silently one frame late everywhere.
  for (const frame of [1, 42, 1427]) {
    assert.ok(
      seekSecondsFor(frame, 30) < frame / 30,
      "the target must fall inside the previous frame's interval",
    );
    assert.ok(
      seekSecondsFor(frame, 30) > (frame - 1) / 30,
      "and strictly after that frame's own start",
    );
  }
});

test("the first frame is sought at the start of the film, not before it", () => {
  assert.equal(
    seekSecondsFor(0, 30),
    0,
    "a negative seek is not a thing to ask ffmpeg for",
  );
  assert.equal(seekSecondsFor(0, 60), 0);
});

test("nonsense coordinates are refused rather than rounded", () => {
  for (const frame of [-1, 1.5, Number.NaN]) {
    assert.throws(() => seekSecondsFor(frame, 30), FrameError);
  }
  for (const fps of [0, -30, 29.97]) {
    assert.throws(() => seekSecondsFor(30, fps), FrameError);
  }
});
