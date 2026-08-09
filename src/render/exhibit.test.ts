import assert from "node:assert/strict";
import { test } from "node:test";

import type { ExhibitRegion } from "../presentation/exhibit.ts";
import { attentionClaims } from "./attention.ts";
import { focusAt, type FocusTiming } from "./exhibit.ts";

/**
 * The veil's occupancy model, without a browser.
 *
 * What is being asserted is the thing watching the film complained about: that the emphasis lasts
 * as long as the sentence, that two sentences in a row hand over rather than blinking, and that two
 * far apart do release in between.
 */

const TIMING: FocusTiming = { rise: 10, fall: 20, move: 10 };

const region = (name: string, left: number): ExhibitRegion => ({
  name,
  left,
  top: 0.1,
  right: left + 0.2,
  bottom: 0.9,
});

const REGIONS = [region("a", 0.0), region("b", 0.4), region("c", 0.8)];

/** A scene with anchors on given frames, each activating a clip of a given length. */
function scene(entries: readonly { element: number; from: number; length: number }[]): {
  anchors: { elementIndex: number; clipIndex: number; frame: number }[];
  clips: { from: number; durationInFrames: number }[];
} {
  return {
    anchors: entries.map((entry, index) => ({
      elementIndex: entry.element,
      clipIndex: index,
      frame: entry.from,
    })),
    clips: entries.map((entry) => ({ from: entry.from, durationInFrames: entry.length })),
  };
}

const onRegions = (index: number): boolean => REGIONS[index] !== undefined;

test("a claim lasts as long as the sentence that opened it", () => {
  const claims = attentionClaims(
    scene([{ element: 1, from: 100, length: 90 }]),
    onRegions,
  );
  assert.deepEqual(
    claims.map((claim) => [claim.index, claim.from, claim.until]),
    [[1, 100, 190]],
  );
});

test("only regions the picture actually has become claims", () => {
  // An anchor whose element index is past the regions is a slide whose body is not an exhibit, or
  // a compiler bug. Either way it is not a claim on a picture.
  assert.deepEqual(
    attentionClaims(scene([{ element: 9, from: 10, length: 10 }]), onRegions),
    [],
  );
});

test("claims come out in frame order however the anchors were listed", () => {
  const claims = attentionClaims(
    scene([
      { element: 2, from: 200, length: 30 },
      { element: 0, from: 100, length: 30 },
    ]),
    onRegions,
  );
  assert.deepEqual(
    claims.map((claim) => REGIONS[claim.index]?.name),
    ["a", "c"],
  );
});

test("nothing is veiled before the first sentence, or long after the last", () => {
  const spans = scene([{ element: 0, from: 100, length: 60 }]);
  assert.equal(focusAt(spans, REGIONS, 99, TIMING), undefined);
  assert.equal(focusAt(spans, REGIONS, 160 + TIMING.fall + 1, TIMING), undefined);
});

test("the veil rises, holds for the whole sentence, and settles", () => {
  const spans = scene([{ element: 0, from: 100, length: 60 }]);
  const veil = (frame: number): number =>
    focusAt(spans, REGIONS, frame, TIMING)?.veil ?? 0;

  assert.equal(veil(100), 0);
  assert.equal(veil(105), 0.5);
  assert.equal(veil(110), 1);
  // The whole sentence, which is the point: nobody wrote 60 frames, the clip was measured.
  assert.equal(veil(140), 1);
  assert.equal(veil(160), 1);
  assert.equal(veil(170), 0.5);
  assert.equal(veil(180), 0);

  // Asymmetric on purpose: three frames into the settle it is still most of the way up, where
  // three frames into the arrival it is barely started.
  assert.ok(veil(163) > veil(103), "the fall should be slower than the rise");
});

test("a sentence shorter than the rise still reaches full strength", () => {
  const spans = scene([{ element: 0, from: 100, length: 4 }]);
  assert.equal(focusAt(spans, REGIONS, 104, TIMING)?.veil, 1);
});

test("two sentences in a row hand over without the veil dropping", () => {
  const spans = scene([
    { element: 0, from: 100, length: 60 },
    { element: 1, from: 160, length: 60 },
  ]);

  // Every frame from the first full strength to the second's end: never dips. This is the defect
  // the round exists to remove, asserted directly rather than inferred from the constants.
  for (let frame = 110; frame <= 220; frame += 1) {
    assert.equal(
      focusAt(spans, REGIONS, frame, TIMING)?.veil,
      1,
      `the veil dropped at frame ${frame}`,
    );
  }
});

test("a pause between two chart sentences does not strobe", () => {
  // Short enough that the veil would not have finished settling: an interrupted release is not a
  // release, so the two are one hold rather than two.
  const spans = scene([
    { element: 0, from: 100, length: 40 },
    { element: 1, from: 150, length: 40 },
  ]);
  for (let frame = 110; frame <= 190; frame += 1) {
    assert.equal(
      focusAt(spans, REGIONS, frame, TIMING)?.veil,
      1,
      `dipped at frame ${frame}`,
    );
  }
});

test("two sentences far apart release in between, because the narration left", () => {
  const spans = scene([
    { element: 0, from: 100, length: 30 },
    { element: 2, from: 400, length: 30 },
  ]);
  assert.equal(focusAt(spans, REGIONS, 200, TIMING), undefined);
  assert.equal(focusAt(spans, REGIONS, 410, TIMING)?.veil, 1);
});

test("the opening travels to the next region rather than cutting to it", () => {
  const spans = scene([
    { element: 0, from: 100, length: 60 },
    { element: 2, from: 160, length: 60 },
  ]);

  assert.equal(focusAt(spans, REGIONS, 159, TIMING)?.region.left, 0.0);
  // Halfway through the handover, halfway between the two.
  assert.equal(focusAt(spans, REGIONS, 165, TIMING)?.region.left, 0.4);
  assert.equal(focusAt(spans, REGIONS, 170, TIMING)?.region.left, 0.8);
  assert.equal(focusAt(spans, REGIONS, 200, TIMING)?.region.left, 0.8);
  // It carries the name of where it is going, so a diagnostic never says it is somewhere it is not.
  assert.equal(focusAt(spans, REGIONS, 165, TIMING)?.region.name, "c");
});

test("the first opening does not travel from nowhere", () => {
  const spans = scene([{ element: 1, from: 100, length: 60 }]);
  assert.equal(focusAt(spans, REGIONS, 101, TIMING)?.region.left, 0.4);
});

test("a picture nobody talks about is never veiled", () => {
  assert.deepEqual(attentionClaims(scene([]), onRegions), []);
  assert.equal(focusAt(scene([]), REGIONS, 500, TIMING), undefined);
});
