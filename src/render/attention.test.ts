import assert from "node:assert/strict";
import { test } from "node:test";

import {
  attentionAt,
  attentionClaims,
  attentionRuns,
  type AttentionScene,
  type AttentionTiming,
} from "./attention.ts";

/**
 * The occupancy model, shared, without a browser.
 *
 * `./exhibit.test.ts` already asserts these properties through the chart's veil, because that is
 * where they were discovered. What is asserted *here* is the part that is now shared and the part
 * that is new: that ground is exact rather than nearly zero, that a partially overlapping pair of
 * claims never passes through ground between them, and that two tracks do not see each other.
 *
 * Ground gets more attention than anything else below, because it is the invariant sprint:28 was
 * asked to establish and the one that is easy to believe without checking.
 */

const TIMING: AttentionTiming = { rise: 10, fall: 20, move: 10 };

function scene(
  entries: readonly { element: number; from: number; length: number }[],
): AttentionScene {
  return {
    anchors: entries.map((entry, index) => ({
      elementIndex: entry.element,
      clipIndex: index,
      frame: entry.from,
    })),
    clips: entries.map((entry) => ({ from: entry.from, durationInFrames: entry.length })),
  };
}

test("a claim runs from the anchor to the end of the sentence that made it", () => {
  const claims = attentionClaims(scene([{ element: 3, from: 100, length: 45 }]));
  assert.deepEqual(claims, [{ index: 3, from: 100, until: 145 }]);
});

test("ground is exactly nothing before the first claim and after the last", () => {
  const claims = attentionClaims(scene([{ element: 0, from: 100, length: 40 }]));
  assert.equal(attentionAt(claims, 0, TIMING), undefined);
  assert.equal(attentionAt(claims, 99, TIMING), undefined);
  // Zero strength *is* ground, and ground is reported as nothing rather than as a zero — so the
  // last frame of the settle is already the frame the picture started on.
  assert.ok((attentionAt(claims, 140 + TIMING.fall - 1, TIMING)?.strength ?? 0) > 0);
  assert.equal(attentionAt(claims, 140 + TIMING.fall, TIMING), undefined);
  assert.equal(attentionAt(claims, 140 + TIMING.fall + 1, TIMING), undefined);
  assert.equal(attentionAt(claims, 10_000, TIMING), undefined);
});

test("a track nobody reaches is at ground on every frame of the film", () => {
  const claims = attentionClaims(
    scene([{ element: 0, from: 100, length: 40 }]),
    () => false,
  );
  for (let frame = 0; frame <= 400; frame += 1) {
    assert.equal(attentionAt(claims, frame, TIMING), undefined, `frame ${frame}`);
  }
});

test("strength never leaves the unit interval, on any frame of any arrangement", () => {
  const claims = attentionClaims(
    scene([
      { element: 0, from: 100, length: 60 },
      { element: 1, from: 130, length: 5 },
      { element: 2, from: 400, length: 30 },
    ]),
  );
  for (let frame = 0; frame <= 600; frame += 1) {
    const strength = attentionAt(claims, frame, TIMING)?.strength ?? 0;
    assert.ok(strength >= 0 && strength <= 1, `frame ${frame} gave ${strength}`);
  }
});

test("an interrupted release is not a release: the two claims are one run", () => {
  const claims = attentionClaims(
    scene([
      { element: 0, from: 100, length: 40 },
      { element: 1, from: 150, length: 40 },
    ]),
  );
  assert.deepEqual(attentionRuns(claims, TIMING), [{ from: 100, until: 190 }]);
});

test("a genuinely distant pair does release, because the narration left", () => {
  const claims = attentionClaims(
    scene([
      { element: 0, from: 100, length: 30 },
      { element: 1, from: 400, length: 30 },
    ]),
  );
  assert.equal(attentionRuns(claims, TIMING).length, 2);
  assert.equal(attentionAt(claims, 250, TIMING), undefined);
});

/**
 * The case the round was asked about: previous {A,B}, next {B,C}.
 *
 * Written as it actually occurs — a sentence about A, then one about B, then one about C — because
 * `activates:` names one identity and a set is what *successive* sentences produce. What must hold
 * is that B is never at ground while it is between two sentences that both involve it, and that the
 * strength signal itself never dips, which is what would make B flash.
 */
test("attention moving A to B to C never passes through ground", () => {
  const claims = attentionClaims(
    scene([
      { element: 0, from: 100, length: 50 },
      { element: 1, from: 150, length: 50 },
      { element: 2, from: 200, length: 50 },
    ]),
  );
  for (let frame = 110; frame <= 250; frame += 1) {
    assert.equal(attentionAt(claims, frame, TIMING)?.strength, 1, `dipped at ${frame}`);
  }
  // And it does come back to ground once the narration has genuinely left.
  assert.equal(attentionAt(claims, 250 + TIMING.fall + 1, TIMING), undefined);
});

test("the leaving element is reported only while it is actually being left", () => {
  const claims = attentionClaims(
    scene([
      { element: 0, from: 100, length: 50 },
      { element: 4, from: 150, length: 50 },
    ]),
  );
  assert.equal(attentionAt(claims, 149, TIMING)?.from, undefined);
  assert.equal(attentionAt(claims, 155, TIMING)?.from, 0);
  assert.equal(attentionAt(claims, 155, TIMING)?.index, 4);
  assert.equal(attentionAt(claims, 155, TIMING)?.travel, 0.5);
  assert.equal(attentionAt(claims, 160, TIMING)?.from, undefined);
  assert.equal(attentionAt(claims, 160, TIMING)?.travel, 1);
});

test("the first claim does not travel from nowhere", () => {
  const claims = attentionClaims(scene([{ element: 2, from: 100, length: 50 }]));
  assert.equal(attentionAt(claims, 102, TIMING)?.travel, 1);
  assert.equal(attentionAt(claims, 102, TIMING)?.from, undefined);
});

test("a sentence shorter than the rise still reaches full strength by its end", () => {
  const claims = attentionClaims(scene([{ element: 0, from: 100, length: 4 }]));
  assert.equal(attentionAt(claims, 104, TIMING)?.strength, 1);
});

test("two tracks are independent, and neither sees the other's anchors", () => {
  const both = scene([
    { element: 0, from: 100, length: 40 },
    { element: 5, from: 300, length: 40 },
  ]);
  const rows = attentionClaims(both, (index) => index < 5);
  const columns = attentionClaims(both, (index) => index >= 5);

  assert.deepEqual(rows, [{ index: 0, from: 100, until: 140 }]);
  assert.deepEqual(columns, [{ index: 5, from: 300, until: 340 }]);

  // At frame 310 the column is being talked about and the row has long since released. Both
  // answers are available at once, which is what makes an intersection expressible.
  assert.equal(attentionAt(rows, 310, TIMING), undefined);
  assert.equal(attentionAt(columns, 310, TIMING)?.index, 5);
});

test("a row and a column held at the same time are both at full strength", () => {
  const both = scene([
    { element: 0, from: 100, length: 60 },
    { element: 5, from: 160, length: 60 },
  ]);
  const rows = attentionClaims(both, (index) => index < 5);
  const columns = attentionClaims(both, (index) => index >= 5);

  // The row's sentence has ended, the column's is being spoken, and the row has not yet released —
  // which is the frame where the cell they cross is the answer to both.
  assert.equal(attentionAt(rows, 170, TIMING)?.index, 0);
  assert.ok((attentionAt(rows, 170, TIMING)?.strength ?? 0) > 0.4);
  assert.equal(attentionAt(columns, 170, TIMING)?.index, 5);
});

test("claims come out in frame order however the anchors were listed", () => {
  const claims = attentionClaims(
    scene([
      { element: 2, from: 300, length: 10 },
      { element: 0, from: 100, length: 10 },
      { element: 1, from: 200, length: 10 },
    ]),
  );
  assert.deepEqual(
    claims.map((claim) => claim.index),
    [0, 1, 2],
  );
});
