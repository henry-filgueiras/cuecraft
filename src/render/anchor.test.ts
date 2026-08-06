import assert from "node:assert/strict";
import { test } from "node:test";

import { anchorState, ANCHOR_TIMING, ESTABLISHED, HEAT_FRAMES } from "./anchor.ts";

/**
 * The activation envelope is the only part of the anchor treatment that can be checked without
 * looking at a frame, so it is checked properly here: the shape of each curve, the invariants
 * that keep a slide from flickering, and the boundaries where a state begins or ends.
 *
 * What these tests cannot tell us is whether the result is *perceptible*, which is the whole
 * reason the envelope exists. That question belongs to task:19 and to a human watching.
 */

const ANCHOR = 100;

function at(frame: number) {
  return anchorState(frame, ANCHOR);
}

test("an element the narration never reaches is established from its first frame", () => {
  for (const frame of [0, 1, 500]) {
    assert.deepEqual(anchorState(frame, undefined), ESTABLISHED);
  }
});

test("before activation an element is future: dormant, cold, unswept", () => {
  for (const frame of [0, ANCHOR - 10, ANCHOR - 1, ANCHOR]) {
    const state = at(frame);
    assert.equal(state.degree, 0, `degree at ${frame}`);
    assert.equal(state.heat, 0, `heat at ${frame}`);
    assert.equal(state.sweep, 0, `sweep at ${frame}`);
  }
});

test("heat peaks within a few frames of activation and is gone inside a second", () => {
  assert.ok(at(ANCHOR + 1).heat > 0, "heat starts on the frame after activation");
  assert.equal(
    at(ANCHOR + ANCHOR_TIMING.heatRise).heat,
    1,
    "attack completes at heatRise",
  );
  assert.equal(
    at(ANCHOR + ANCHOR_TIMING.heatRise + ANCHOR_TIMING.heatHold - 1).heat,
    1,
    "and holds",
  );

  assert.equal(
    at(ANCHOR + HEAT_FRAMES).heat,
    0,
    "and is fully cold at the end of the window",
  );
  assert.ok(HEAT_FRAMES <= 30, "the transient must not outlast one second at 30fps");
});

test("heat rises then falls, and never returns", () => {
  const peak = ANCHOR + ANCHOR_TIMING.heatRise;
  for (let frame = ANCHOR; frame < peak; frame += 1) {
    assert.ok(at(frame).heat <= at(frame + 1).heat, `heat should rise at ${frame}`);
  }
  const decayFrom = peak + ANCHOR_TIMING.heatHold;
  for (let frame = decayFrom; frame < ANCHOR + HEAT_FRAMES; frame += 1) {
    assert.ok(at(frame).heat >= at(frame + 1).heat, `heat should fall at ${frame}`);
  }
  for (const frame of [ANCHOR + HEAT_FRAMES, ANCHOR + 200, ANCHOR + 10_000]) {
    assert.equal(at(frame).heat, 0, `heat must stay cold at ${frame}`);
  }
});

test("establishment accumulates and is never given back", () => {
  let previous = 0;
  for (let frame = ANCHOR; frame <= ANCHOR + 400; frame += 1) {
    const { degree } = at(frame);
    assert.ok(degree >= previous, `degree fell at frame ${frame}`);
    assert.ok(degree >= 0 && degree <= 1, `degree out of range at frame ${frame}`);
    previous = degree;
  }
  assert.equal(previous, 1, "an established element stays established");
});

test("the sweep is one-way and completes on its own clock", () => {
  assert.ok(at(ANCHOR + 1).sweep > 0);
  assert.ok(at(ANCHOR + ANCHOR_TIMING.sweep - 1).sweep < 1);
  assert.equal(at(ANCHOR + ANCHOR_TIMING.sweep).sweep, 1);
  assert.equal(at(ANCHOR + 1000).sweep, 1);
});

test("degree reaches established after the transient has already begun to decay", () => {
  // The point of the three-state model: the flare announces the activation, and the durable
  // contrast change finishes underneath it rather than being the only signal.
  assert.ok(
    ANCHOR_TIMING.establish > ANCHOR_TIMING.heatRise,
    "the transient must be faster than the settle it announces",
  );
  assert.equal(at(ANCHOR + ANCHOR_TIMING.establish).degree, 1);
});

test("every value stays in range for any frame, including nonsensical ones", () => {
  for (const frame of [-1000, -1, 0, ANCHOR, ANCHOR + 7, 1e6]) {
    const state = at(frame);
    for (const [name, value] of Object.entries(state)) {
      assert.ok(
        Number.isFinite(value) && value >= 0 && value <= 1,
        `${name} was ${value} at frame ${frame}`,
      );
    }
  }
});

test("an anchor at frame zero still behaves", () => {
  const state = anchorState(0, 0);
  assert.equal(state.degree, 0);
  assert.equal(state.heat, 0);
  assert.equal(anchorState(30, 0).degree, 1);
});
