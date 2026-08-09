import assert from "node:assert/strict";
import { test } from "node:test";

import { ARRIVAL_MS, occurrenceDwellFor, RUN_FLOOR } from "../presentation/beat.ts";
import type { Scene } from "../compile/timeline.ts";
import { electLayout } from "./audition.ts";
import { occurrencePhases } from "./explain.ts";
import { machinePlan } from "./machine.ts";
import { MACHINE } from "./theme.ts";
import type { SlideBody } from "../presentation/body.ts";

/**
 * The phase budget, asserted end to end.
 *
 * `beat.test.ts` says an occurrence is priced correctly and `machine.test.ts` says the camera
 * respects the windows. This is the join: given the durations the clock actually produces, does a
 * silent arrival end up with stable frames on the screen? That question cannot be answered from
 * either half alone, and it is the question the round is about.
 */

const FPS = 30;
const VIEW = { width: 1920 - MACHINE.rail, height: 1080 };

const MACHINE_BODY = {
  kind: "machine",
  states: [
    { id: "queued", text: "Queued" },
    { id: "claimed", text: "Claimed" },
    { id: "running", text: "Running" },
    { id: "retry", text: "Retry wait" },
  ],
  transitions: [
    { id: "claim", from: "queued", to: "claimed", on: "a worker takes the lease" },
    { id: "start", from: "claimed", to: "running", on: "handler begins" },
    { id: "timed", from: "running", to: "retry", on: "handler exceeds its deadline" },
    { id: "backoff", from: "retry", to: "queued", on: "backoff expires" },
  ],
  scenario: [
    { take: "claim" },
    { take: "start" },
    { take: "timed" },
    { take: "backoff" },
    { take: "claim" },
  ],
} as unknown as SlideBody;

/** Beats laid out exactly as `machineCues` plus `buildTimeline` would place them, all silent. */
function silentScene(): Scene {
  const machine = MACHINE_BODY as unknown as {
    transitions: readonly { id: string; on: string }[];
    scenario: readonly { take: string }[];
  };
  const byId = new Map(machine.transitions.map((entry) => [entry.id, entry] as const));
  let from = 27;
  const beats = machine.scenario.map((occurrence, index) => {
    const label = byId.get(occurrence.take)?.on ?? occurrence.take;
    const durationInFrames = Math.ceil((occurrenceDwellFor(label, index) / 1000) * FPS);
    const beat = { index, address: `root/take-${index + 1}`, from, durationInFrames };
    from += durationInFrames;
    return beat;
  });
  return {
    ordinal: 1,
    title: "a machine",
    body: MACHINE_BODY,
    layout: "circuit",
    anchors: [],
    calls: [],
    spans: [],
    beats,
    recalls: [],
    from: 0,
    durationInFrames: from + 120,
    narrationFrom: 27,
    narrationDurationInFrames: from - 27,
    clips: [],
  } as unknown as Scene;
}

test("every silent arrival gets a stable window nothing else is allowed into", () => {
  const scene = silentScene();
  const machine = MACHINE_BODY as unknown as Parameters<typeof electLayout>[0];
  const layout = electLayout(machine, VIEW);
  const takes = (
    MACHINE_BODY as unknown as { scenario: readonly { take: string }[] }
  ).scenario.map((entry) => entry.take);
  const plan = machinePlan(
    layout,
    scene.beats,
    takes,
    {
      from: scene.from,
      until: scene.from + scene.narrationDurationInFrames + 27,
      end: scene.durationInFrames,
    },
    VIEW.width / VIEW.height,
    VIEW.width,
  );
  const phases = occurrencePhases(scene, plan.shots);

  // The floor: the arrival allowance, decayed as far as a run may decay it, in frames. Anything
  // below this is the defect the baseline had — an occupancy nobody had time to see.
  const floor = Math.floor(((ARRIVAL_MS * RUN_FLOOR) / 1000) * FPS) - 1;
  for (const phase of phases.slice(0, -1)) {
    assert.ok(
      phase.hold >= floor,
      `occurrence ${phase.index + 1} held for ${phase.hold} frames, under the floor of ${floor}`,
    );
  }
});

test("the phases of one occurrence do not overlap", () => {
  const scene = silentScene();
  const machine = MACHINE_BODY as unknown as Parameters<typeof electLayout>[0];
  const layout = electLayout(machine, VIEW);
  const takes = (
    MACHINE_BODY as unknown as { scenario: readonly { take: string }[] }
  ).scenario.map((entry) => entry.take);
  const plan = machinePlan(
    layout,
    scene.beats,
    takes,
    {
      from: scene.from,
      until: scene.from + scene.narrationDurationInFrames + 27,
      end: scene.durationInFrames,
    },
    VIEW.width / VIEW.height,
    VIEW.width,
  );
  const phases = occurrencePhases(scene, plan.shots);

  for (const phase of phases) {
    assert.ok(phase.crossFrom < phase.crossUntil, "a traversal takes at least one frame");
    assert.equal(
      phase.arrivesAt,
      phase.crossUntil,
      "occupancy lands when the crossing ends",
    );
    assert.ok(
      phase.arrivesAt <= phase.until,
      "an arrival happens inside its own occurrence",
    );
    if (phase.cameraFrom === undefined) continue;
    assert.ok(
      phase.cameraUntil !== undefined && phase.cameraUntil <= phase.crossFrom,
      `occurrence ${phase.index + 1}: the camera was still moving when the traveller set off`,
    );
  }
});

test("a camera move never eats into the arrival before it", () => {
  const scene = silentScene();
  const machine = MACHINE_BODY as unknown as Parameters<typeof electLayout>[0];
  const layout = electLayout(machine, VIEW);
  const takes = (
    MACHINE_BODY as unknown as { scenario: readonly { take: string }[] }
  ).scenario.map((entry) => entry.take);
  const plan = machinePlan(
    layout,
    scene.beats,
    takes,
    {
      from: scene.from,
      until: scene.from + scene.narrationDurationInFrames + 27,
      end: scene.durationInFrames,
    },
    VIEW.width / VIEW.height,
    VIEW.width,
  );
  const phases = occurrencePhases(scene, plan.shots);
  for (let index = 1; index < phases.length; index += 1) {
    const phase = phases[index];
    const previous = phases[index - 1];
    if (phase?.cameraFrom === undefined || previous === undefined) continue;
    assert.ok(
      phase.cameraFrom >= previous.arrivesAt + MACHINE.arrivalQuiet,
      `the camera left occurrence ${previous.index + 1} before its arrival had been announced`,
    );
  }
});
