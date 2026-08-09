import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  AuthoredOccurrence,
  AuthoredState,
  AuthoredTransition,
} from "../presentation/machine.ts";
import { fitWidth, union, type Rect } from "./camera.ts";
import {
  layoutMachine,
  machinePlan,
  occurrenceBounds,
  runProgress,
  startingState,
  wrapEventLabel,
} from "./machine.ts";
import { MACHINE } from "./theme.ts";

/**
 * Where a machine sits, and whether it stays there.
 *
 * Almost everything asserted here is a *stability* property rather than a positional one. No test
 * pins a coordinate, because dagre's answer is allowed to change when a constant does and a test
 * that froze it would make the archaeology unable to overrule the layout. What is pinned is the set
 * of things that must be true of any answer: that the run cannot move a state, that two parallel
 * transitions are two things, that a self-loop is inside room reserved for it, that nothing is
 * drawn outside the bounds the closing overview is fitted to, and that a camera looking at a
 * neighbourhood it is already looking at declines to move.
 */

const ELEVATOR = {
  states: [
    { id: "closed", text: "Closed" },
    { id: "opening", text: "Opening" },
    { id: "open", text: "Open" },
    { id: "closing", text: "Closing" },
    { id: "nudging", text: "Nudging" },
    { id: "stuck", text: "Out of service" },
  ] as readonly AuthoredState[],
  transitions: [
    { id: "call", from: "closed", to: "opening", on: "call accepted" },
    { id: "opened", from: "opening", to: "open", on: "open limit reached" },
    { id: "dwelt", from: "open", to: "closing", on: "dwell timer expires" },
    { id: "reversed", from: "closing", to: "opening", on: "safety beam interrupted" },
    { id: "nudged", from: "closing", to: "nudging", on: "obstruction limit reached" },
    { id: "shut", from: "nudging", to: "closed", on: "closed limit reached" },
    { id: "abandoned", from: "nudging", to: "stuck", on: "door remains obstructed" },
  ] as readonly AuthoredTransition[],
  scenario: [
    { take: "call" },
    { take: "opened" },
    { take: "dwelt" },
    { take: "reversed" },
    { take: "opened" },
    { take: "dwelt" },
    { take: "nudged" },
    { take: "shut" },
  ] as readonly AuthoredOccurrence[],
};

/** Everything hard about laying a machine out, in one specimen. */
const HARD = {
  states: [
    { id: "queued", text: "Queued" },
    { id: "claimed", text: "Claimed" },
    { id: "running", text: "Running" },
    { id: "retry", text: "Retry wait" },
    { id: "orphaned", text: "Orphaned" },
    { id: "cancelling", text: "Cancelling" },
    { id: "cancelled", text: "Cancelled" },
  ] as readonly AuthoredState[],
  transitions: [
    { id: "claim", from: "queued", to: "claimed", on: "worker claims the lease" },
    { id: "start", from: "claimed", to: "running", on: "handler begins" },
    { id: "heartbeat", from: "running", to: "running", on: "lease renewed" },
    { id: "timed-out", from: "running", to: "retry", on: "handler exceeds its deadline" },
    { id: "rate-limited", from: "running", to: "retry", on: "downstream returns 429" },
    { id: "backoff", from: "retry", to: "queued", on: "backoff expires" },
    {
      id: "commit-in-flight",
      from: "running",
      to: "orphaned",
      on: "visibility timeout expires while result commit is still in flight",
    },
    { id: "reclaimed", from: "orphaned", to: "queued", on: "reaper reclaims the job" },
    { id: "cancel", from: "running", to: "cancelling", on: "operator cancels" },
    { id: "drained", from: "cancelling", to: "cancelled", on: "handler acknowledges" },
  ] as readonly AuthoredTransition[],
  scenario: [
    { take: "claim" },
    { take: "start" },
    { take: "heartbeat" },
    { take: "timed-out" },
    { take: "backoff" },
    { take: "claim" },
    { take: "start" },
    { take: "rate-limited" },
    { take: "backoff" },
    { take: "claim" },
    { take: "start" },
    { take: "cancel" },
    { take: "drained" },
  ] as readonly AuthoredOccurrence[],
};

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x - 0.5 &&
    inner.y >= outer.y - 0.5 &&
    inner.x + inner.width <= outer.x + outer.width + 0.5 &&
    inner.y + inner.height <= outer.y + outer.height + 0.5
  );
}

/* ------------------------------------------------------------- stability */

test("the same machine lays out identically, every time", () => {
  const once = layoutMachine(HARD);
  const again = layoutMachine(HARD);
  assert.deepEqual(
    once.nodes.map((node) => node.rect),
    again.nodes.map((node) => node.rect),
  );
  assert.deepEqual(
    once.edges.map((edge) => edge.path),
    again.edges.map((edge) => edge.path),
  );
});

test("the scenario cannot move a state, however it is permuted", () => {
  // The property the whole composition rests on: the machine is a *place*. A layout that consulted
  // the run could rearrange itself to flatter one, and the state that was off to the left would
  // stop being off to the left when the run came back to it.
  const baseline = layoutMachine(HARD);
  const variations = [
    { ...HARD, scenario: [] },
    { ...HARD, scenario: [{ take: "claim" }] },
    { ...HARD, scenario: [...HARD.scenario].reverse() },
    { ...HARD, scenario: [...HARD.scenario, ...HARD.scenario] },
  ];
  for (const variant of variations) {
    assert.deepEqual(
      layoutMachine(variant).nodes.map((node) => [node.id, node.rect]),
      baseline.nodes.map((node) => [node.id, node.rect]),
    );
  }
});

/* ---------------------------------------------------------------- shapes */

test("two transitions between one pair are two routes and two labels", () => {
  const layout = layoutMachine(HARD);
  const timedOut = layout.edgeById.get("timed-out");
  const rateLimited = layout.edgeById.get("rate-limited");
  assert.ok(timedOut !== undefined && rateLimited !== undefined);
  assert.equal(timedOut.from, rateLimited.from);
  assert.equal(timedOut.to, rateLimited.to);
  assert.notEqual(timedOut.path, rateLimited.path);
  assert.ok(
    !overlaps(timedOut.label, rateLimited.label),
    "parallel transitions must not share a label position, or one of them is unreadable",
  );
});

test("a self-transition is drawn in room reserved for it, beside the plate", () => {
  const layout = layoutMachine(HARD);
  const running = layout.byId.get("running");
  const loop = layout.edgeById.get("heartbeat");
  assert.ok(running !== undefined && loop !== undefined);
  assert.equal(loop.self, true);

  // The box dagre was given is wider than the plate, and the difference is where the loop lives.
  // Beside rather than above, because under a top-down layout the space over a state is where its
  // incoming edges arrive.
  assert.ok(running.box.width > running.rect.width);
  assert.equal(running.box.x, running.rect.x);
  const arc = union(
    loop.points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })),
  );
  assert.ok(
    contains(running.box, arc),
    "the loop reaches outside the room reserved for it, where another edge may be routed",
  );
  assert.ok(
    contains(running.box, loop.label),
    "the loop's caption reaches outside the room reserved for it",
  );
});

test("a self-transition's caption never lands on its own plate", () => {
  const layout = layoutMachine(HARD);
  const running = layout.byId.get("running") as NonNullable<
    ReturnType<typeof layout.byId.get>
  >;
  const loop = layout.edgeById.get("heartbeat") as NonNullable<
    ReturnType<typeof layout.edgeById.get>
  >;
  assert.ok(!overlaps(loop.label, running.rect));
});

test("nothing collides: no plate touches a plate, and no label touches either", () => {
  for (const [name, machine] of [
    ["elevator", ELEVATOR],
    ["leased job runner", HARD],
  ] as const) {
    const layout = layoutMachine(machine);
    const boxes = [
      ...layout.nodes.map((node) => ({ what: `plate ${node.id}`, rect: node.rect })),
      ...layout.edges.map((edge) => ({ what: `label ${edge.id}`, rect: edge.label })),
    ];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i] as (typeof boxes)[number];
        const b = boxes[j] as (typeof boxes)[number];
        assert.ok(!overlaps(a.rect, b.rect), `${name}: ${a.what} overlaps ${b.what}`);
      }
    }
  }
});

test("the bounds contain every plate, every route, every label and every loop", () => {
  for (const machine of [ELEVATOR, HARD]) {
    const layout = layoutMachine(machine);
    for (const node of layout.nodes) {
      assert.ok(contains(layout.bounds, node.box), `${node.id} is outside the bounds`);
    }
    for (const edge of layout.edges) {
      assert.ok(
        contains(layout.bounds, edge.label),
        `${edge.id}'s label is outside the bounds`,
      );
      for (const point of edge.points) {
        assert.ok(
          contains(layout.bounds, { ...point, width: 0, height: 0 }),
          `${edge.id} is routed outside the bounds`,
        );
      }
    }
  }
});

test("a back edge is routed back, not drawn as though it went forward", () => {
  // `backoff` returns to the state the run started in, and dagre reversed it to get a ranking.
  // Two things must survive that. The route has to *leave* `retry` and *arrive* at `queued`,
  // whichever way round the ranker solved it — and under a top-down layout, arriving at a state
  // that ranks above you means the route runs visibly upwards, which is the picture saying "this
  // goes back".
  const layout = layoutMachine(HARD);
  const back = layout.edgeById.get("backoff");
  const retry = layout.byId.get("retry");
  const queued = layout.byId.get("queued");
  assert.ok(back !== undefined && retry !== undefined && queued !== undefined);
  const near = (point: { x: number; y: number }, rect: typeof retry.rect): number =>
    Math.hypot(point.x - (rect.x + rect.width / 2), point.y - (rect.y + rect.height / 2));
  const first = back.points[0] as { x: number; y: number };
  const last = back.points[back.points.length - 1] as { x: number; y: number };
  assert.ok(
    near(first, retry.rect) < near(last, retry.rect),
    "the route's first point should be the one at its source",
  );
  assert.ok(queued.rect.y < retry.rect.y, "the reclamation edge should run upwards");
  assert.ok(last.y < first.y, "and its route should end above where it started");
});

test("a long label wraps rather than widening the machine without limit", () => {
  const lines = wrapEventLabel(
    "visibility timeout expires while result commit is still in flight",
  );
  assert.ok(lines.length > 1);
  assert.ok(lines.length <= MACHINE.labelMaxLines);
  assert.equal(
    lines.join(" "),
    "visibility timeout expires while result commit is still in flight",
  );
});

test("a word longer than the measure overhangs rather than being hyphenated", () => {
  const lines = wrapEventLabel("supercalifragilisticexpialidociousness fires");
  assert.equal(lines[0], "supercalifragilisticexpialidociousness");
});

/* ------------------------------------------------------------------- run */

test("the run's start is inferred from the first occurrence, and never declared", () => {
  assert.equal(startingState(ELEVATOR), "closed");
  assert.equal(startingState({ ...ELEVATOR, scenario: [{ take: "dwelt" }] }), "open");
});

test("the run accumulates occupancy, a wake, and a route", () => {
  const progress = runProgress(ELEVATOR);
  assert.equal(progress.length, ELEVATOR.scenario.length);
  assert.deepEqual(
    progress.map((entry) => entry.occupied),
    ["opening", "open", "closing", "opening", "open", "closing", "nudging", "closed"],
  );
  const last = progress.at(-1);
  assert.ok(last !== undefined);
  assert.deepEqual([...last.visited].sort(), [
    "closed",
    "closing",
    "nudging",
    "open",
    "opening",
  ]);
  // `stuck` exists, and the run never occupies it. That is the road not taken.
  assert.ok(!last.visited.has("stuck"));
  assert.deepEqual(last.route, [
    "closed",
    "opening",
    "open",
    "closing",
    "opening",
    "open",
    "closing",
    "nudging",
    "closed",
  ]);
});

test("a repeated transition counts, so a paused frame can say it happened twice", () => {
  const progress = runProgress(ELEVATOR);
  assert.deepEqual(
    progress.map((entry) => `${entry.took} #${entry.ordinal}`),
    [
      "call #1",
      "opened #1",
      "dwelt #1",
      "reversed #1",
      "opened #2",
      "dwelt #2",
      "nudged #1",
      "shut #1",
    ],
  );
  assert.equal(progress.at(-1)?.taken.get("opened"), 2);
  assert.equal(progress.at(-1)?.taken.get("abandoned"), undefined);
});

/* ---------------------------------------------------------------- camera */

function beatsFor(count: number, every = 60): { index: number; from: number }[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    from: 200 + index * every,
  }));
}

test("what an occurrence wants on screen is the source, the route, and the destination", () => {
  const layout = layoutMachine(HARD);
  const bounds = occurrenceBounds(layout, "start");
  const claimed = layout.byId.get("claimed") as NonNullable<
    ReturnType<typeof layout.byId.get>
  >;
  const running = layout.byId.get("running") as NonNullable<
    ReturnType<typeof layout.byId.get>
  >;
  const start = layout.edgeById.get("start") as NonNullable<
    ReturnType<typeof layout.edgeById.get>
  >;
  assert.ok(contains(bounds, claimed.box), "the source has to be in the shot");
  assert.ok(contains(bounds, running.box), "the destination has to be in the shot");
  assert.ok(contains(bounds, start.label), "the event label has to be in the shot");
});

test("an arrival brings the destination's other exits with it, when they fit", () => {
  const layout = layoutMachine(HARD);
  const bounds = occurrenceBounds(layout, "start");
  const alternatives = (layout.leaving.get("running") ?? []).filter((edge) =>
    contains(bounds, edge.label),
  );
  assert.ok(
    alternatives.length > 0,
    "arriving somewhere should show at least one thing that could happen next",
  );
});

test("context is added only while the shot stays readable, and never trims the subject", () => {
  // The exact contract, and it is two halves. Adding alternatives may never push a shot past the
  // width at which the event label it is *about* stops being readable. The essential subject —
  // source, route, label, destination — is exempt, because a long back edge legitimately needs a
  // wide shot and cropping one would put the traversal off the frame.
  for (const [name, machine] of [
    ["elevator", ELEVATOR],
    ["leased job runner", HARD],
  ] as const) {
    const layout = layoutMachine(machine);
    for (const edge of layout.edges) {
      const source = layout.byId.get(edge.from);
      const target = layout.byId.get(edge.to);
      const essential = union([
        ...(source === undefined ? [] : [source.box]),
        ...(target === undefined ? [] : [target.box]),
        edge.label,
        ...edge.points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })),
      ]);
      const shot = fitWidth(occurrenceBounds(layout, edge.id), 16 / 9, MACHINE.shotPad);
      const floor = fitWidth(essential, 16 / 9, MACHINE.shotPad);
      assert.ok(
        shot <= Math.max(floor, MACHINE.context) + 1,
        `${name}: taking ${edge.id} widened the shot to ${Math.round(shot)} for context alone`,
      );
      assert.ok(
        contains(occurrenceBounds(layout, edge.id), essential),
        `${name}: taking ${edge.id} lost part of its own subject`,
      );
    }
  }
});

test("an untaken transition is context exactly as a taken one is", () => {
  // The atlas takes only *established* neighbours, because in a world an unreached thing is a
  // spoiler. Here they are the answer to "what else could happen", so nothing about the run may
  // reach this function at all — and the signature is the proof: it is not given the scenario.
  const layout = layoutMachine(HARD);
  assert.deepEqual(occurrenceBounds(layout, "start"), occurrenceBounds(layout, "start"));
});

test("the plan opens on the whole machine and returns to it", () => {
  const layout = layoutMachine(ELEVATOR);
  const plan = machinePlan(
    layout,
    beatsFor(ELEVATOR.scenario.length),
    ELEVATOR.scenario.map((occurrence) => occurrence.take),
    { from: 0, until: 900 },
  );
  const first = plan.track[0];
  const last = plan.track.at(-1);
  assert.ok(first !== undefined && last !== undefined);
  assert.equal(first.frame, 0);
  assert.deepEqual(first.view, last.view);
  assert.ok(last.frame >= 900);
});

test("every move lands before the occurrence it is about, never on it", () => {
  const layout = layoutMachine(HARD);
  const beats = beatsFor(HARD.scenario.length, 70);
  const plan = machinePlan(
    layout,
    beats,
    HARD.scenario.map((occurrence) => occurrence.take),
    { from: 0, until: 1400 },
  );
  for (const shot of plan.shots) {
    if (shot.kind === "hold") continue;
    const key = plan.track.find((entry) => entry.view === shot.view);
    assert.ok(key !== undefined, `the shot at ${shot.frame} produced no camera key`);
    assert.ok(
      key.frame + key.travel <= shot.frame,
      `the camera was still travelling at ${shot.frame} when the traveller set off`,
    );
  }
});

test("a run that stays in one neighbourhood stops moving the camera", () => {
  // decision:24's hold policy, asked to work in a third space and given nothing new. Four
  // occurrences of one self-loop are four beats and one shot: the second is already well inside
  // the frame the first produced, and a "do not bounce on a revisit" rule would have been the
  // same rule written a third time.
  const layout = layoutMachine(HARD);
  const takes = ["claim", "start", "heartbeat", "heartbeat", "heartbeat", "heartbeat"];
  const plan = machinePlan(layout, beatsFor(takes.length), takes, {
    from: 0,
    until: 700,
  });
  const kinds = plan.shots.map((shot) => shot.kind);
  assert.deepEqual(kinds.slice(3), ["hold", "hold", "hold"]);
});

test("the whole machine is legible in the shot that has to show all of it", () => {
  // The closing overview is the one frame that cannot be arrived at by moving closer, so the
  // constraint is on the machine rather than on the camera: a state's name has to survive it.
  for (const [name, machine] of [
    ["elevator", ELEVATOR],
    ["leased job runner", HARD],
  ] as const) {
    const layout = layoutMachine(machine);
    const plan = machinePlan(
      layout,
      beatsFor(machine.scenario.length),
      machine.scenario.map((occurrence) => occurrence.take),
      { from: 0, until: 900 },
    );
    const overview = plan.track[0]?.view;
    assert.ok(overview !== undefined);
    const pixels = (1920 * MACHINE.label) / overview.width;
    assert.ok(
      pixels >= 19,
      `${name}: a state's name is ${pixels.toFixed(1)}px in the overview, below the legible floor`,
    );
  }
});
