import assert from "node:assert/strict";
import { test } from "node:test";

import type { AttentionScene, AttentionTiming } from "./attention.ts";
import { drawingEmphasis, GROUND, type DrawingTreatment } from "./drawing.ts";

/**
 * The ground -> active -> ground round trip, asserted as an identity rather than as a restoration.
 *
 * The invariant sprint:28 was asked to establish is that a named element which has been emphasized
 * can return to *exactly* the state it was imported in. The tests below are deliberately written to
 * fail if that ever becomes a matter of putting something back: what they check is that outside a
 * run there is **no emphasis at all** to put back, and that inside one every value is a
 * multiplicative term that is identity at zero strength.
 */

const TIMING: AttentionTiming = { rise: 10, fall: 20, move: 10 };
const TREATMENT: DrawingTreatment = { recede: 0.6, lift: 0.3 };
const ELEMENTS = ["west", "east", "north"];

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

const ONE = scene([{ element: 0, from: 100, length: 60 }]);

test("a drawing nobody talks about has no emphasis on any frame", () => {
  for (let frame = 0; frame <= 300; frame += 1) {
    assert.equal(
      drawingEmphasis(scene([]), ELEMENTS, ELEMENTS, frame, TIMING, TREATMENT),
      undefined,
    );
  }
});

test("before the sentence, and after the settle, there is nothing to apply", () => {
  assert.equal(
    drawingEmphasis(ONE, ELEMENTS, ELEMENTS, 99, TIMING, TREATMENT),
    undefined,
  );
  assert.equal(
    drawingEmphasis(ONE, ELEMENTS, ELEMENTS, 160 + TIMING.fall, TIMING, TREATMENT),
    undefined,
  );
});

test("the element named is lifted and the other named ones recede", () => {
  const emphasis = drawingEmphasis(ONE, ELEMENTS, ELEMENTS, 120, TIMING, TREATMENT);
  assert.deepEqual(emphasis?.get("west"), { opacity: 1, brightness: 1.3 });
  assert.deepEqual(emphasis?.get("east"), { opacity: 0.4, brightness: 1 });
  assert.deepEqual(emphasis?.get("north"), { opacity: 0.4, brightness: 1 });
});

test("a receded element stays legible rather than being switched off", () => {
  // `anchor.ts`'s rule: recessive, never hidden. The chart's other bars still have to be readable,
  // because a comparison the viewer cannot make is the reason the chart is on screen at all.
  const emphasis = drawingEmphasis(ONE, ELEMENTS, ELEMENTS, 120, TIMING, TREATMENT);
  assert.ok((emphasis?.get("east")?.opacity ?? 0) > 0.25);
});

test("the settle runs all the way down, and the last frame is ground itself", () => {
  // Monotone towards ground rather than merely small at the end: a treatment that decayed to two
  // percent and then stopped would look identical on a still and wrong across a cut.
  let previous = 0;
  for (let frame = 160 + TIMING.fall - 1; frame >= 160; frame -= 1) {
    const east = drawingEmphasis(ONE, ELEMENTS, ELEMENTS, frame, TIMING, TREATMENT)?.get(
      "east",
    );
    const applied = 1 - (east?.opacity ?? 1);
    assert.ok(applied >= previous, `the settle reversed at frame ${frame}`);
    previous = applied;
  }
  // And the frame after the settle has no rule at all, which is what "exactly ground" means here.
  assert.equal(
    drawingEmphasis(ONE, ELEMENTS, ELEMENTS, 160 + TIMING.fall, TIMING, TREATMENT),
    undefined,
  );
});

test("the round trip is exact: the state after equals the state before", () => {
  const before = drawingEmphasis(ONE, ELEMENTS, ELEMENTS, 50, TIMING, TREATMENT);
  const during = drawingEmphasis(ONE, ELEMENTS, ELEMENTS, 130, TIMING, TREATMENT);
  const after = drawingEmphasis(ONE, ELEMENTS, ELEMENTS, 400, TIMING, TREATMENT);

  assert.equal(before, undefined);
  assert.notEqual(during, undefined);
  assert.equal(after, before);
});

test("GROUND is what an element with no rule is, stated once", () => {
  assert.deepEqual(GROUND, { opacity: 1, brightness: 1 });
});

/**
 * The overlapping case, which is the one that can go wrong invisibly.
 *
 * Sentences reach west, then east, then north. What must not happen is east dropping to ground on
 * any frame between the sentence that named it and the one that names north — a flash, at exactly
 * the moment attention is moving, which reads as the picture resetting.
 */
const THREE = scene([
  { element: 0, from: 100, length: 50 },
  { element: 1, from: 150, length: 50 },
  { element: 2, from: 200, length: 50 },
]);

test("an element handed over to does not flash through ground on the way in", () => {
  for (let frame = 150; frame <= 200; frame += 1) {
    const east = drawingEmphasis(
      THREE,
      ELEMENTS,
      ELEMENTS,
      frame,
      TIMING,
      TREATMENT,
    )?.get("east");
    assert.ok(east !== undefined, `no emphasis at all at frame ${frame}`);
    // Either lifted or receding, but never both at identity — which is what ground would look
    // like in the middle of a continuous run.
    const atGround = east.opacity > 0.999 && east.brightness < 1.001;
    assert.ok(!atGround, `east was at ground mid-handover, frame ${frame}`);
  }
});

test("the two elements in a handover share the attention, and it always sums to one", () => {
  // At the midpoint of a handover both are half lifted, so neither is the subject and neither is
  // dismissed. The alternative — cutting — puts a full-strength change on one frame.
  const mid = drawingEmphasis(THREE, ELEMENTS, ELEMENTS, 155, TIMING, TREATMENT);
  const west = mid?.get("west");
  const east = mid?.get("east");
  assert.equal(west?.brightness, east?.brightness);
  assert.equal(west?.opacity, east?.opacity);
  // And the one nobody has mentioned is fully receded.
  assert.ok((mid?.get("north")?.opacity ?? 1) < (west?.opacity ?? 0));
});

test("a whole sequence ends at ground, however many elements it visited", () => {
  assert.equal(
    drawingEmphasis(THREE, ELEMENTS, ELEMENTS, 250 + TIMING.fall, TIMING, TREATMENT),
    undefined,
  );
});

test("an element the drawing does not have is not a claim on it", () => {
  const stray = scene([{ element: 7, from: 100, length: 40 }]);
  assert.equal(
    drawingEmphasis(stray, ELEMENTS, ELEMENTS, 120, TIMING, TREATMENT),
    undefined,
  );
});

test("opacity and brightness stay in a sane range on every frame", () => {
  for (let frame = 0; frame <= 400; frame += 1) {
    const emphasis = drawingEmphasis(THREE, ELEMENTS, ELEMENTS, frame, TIMING, TREATMENT);
    if (emphasis === undefined) continue;
    for (const [name, state] of emphasis) {
      assert.ok(state.opacity > 0 && state.opacity <= 1, `${name} at ${frame}`);
      assert.ok(state.brightness >= 1 && state.brightness <= 1.3, `${name} at ${frame}`);
    }
  }
});
