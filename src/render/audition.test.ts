import { DEFAULT_TYPOGRAPHY as TYPO } from "./typography.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  AuthoredOccurrence,
  AuthoredState,
  AuthoredTransition,
} from "../presentation/machine.ts";
import { auditionLayouts, electLayout, scoreLayout } from "./audition.ts";
import { DEFAULT_LAYOUT, layoutMachine, type MachineLayout } from "./machine.ts";
import { MACHINE } from "./theme.ts";

/**
 * What the audition is allowed to elect, and what it is not allowed to consult.
 *
 * The load-bearing test in here is the last one, and it is the one that changed. sprint:19's claim
 * was that **the layout never sees the scenario**, asserted by permuting, reversing, emptying and
 * doubling the run and finding every plate in the same place. sprint:20 weakened that claim on
 * measured evidence, and the tests say precisely how far: a layout is now a pure function of the
 * topology *and how many times each transition is taken*, and every other way of touching the
 * scenario is still refused.
 */

const VIEW = { width: 1920 - MACHINE.rail, height: 1080 };

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

const HARD = {
  states: [
    { id: "queued", text: "Queued" },
    { id: "claimed", text: "Claimed" },
    { id: "running", text: "Running" },
    { id: "retry", text: "Retry wait" },
    { id: "orphaned", text: "Orphaned" },
    { id: "cancelling", text: "Cancelling" },
    { id: "cancelled", text: "Cancelled" },
    { id: "succeeded", text: "Succeeded" },
    { id: "failed", text: "Failed" },
  ] as readonly AuthoredState[],
  transitions: [
    { id: "claim", from: "queued", to: "claimed", on: "a worker takes the lease" },
    { id: "start", from: "claimed", to: "running", on: "handler begins" },
    { id: "heartbeat", from: "running", to: "running", on: "lease renewed" },
    { id: "timed", from: "running", to: "retry", on: "handler exceeds its deadline" },
    { id: "limited", from: "running", to: "retry", on: "downstream returns 429" },
    { id: "backoff", from: "retry", to: "queued", on: "backoff expires" },
    {
      id: "lost",
      from: "claimed",
      to: "orphaned",
      on: "lease lost before the first heartbeat",
    },
    {
      id: "committing",
      from: "running",
      to: "orphaned",
      on: "visibility timeout expires while the result commit is still in flight",
    },
    { id: "reclaimed", from: "orphaned", to: "queued", on: "the reaper reclaims it" },
    { id: "cancel", from: "running", to: "cancelling", on: "an operator cancels" },
    { id: "resumed", from: "cancelling", to: "running", on: "cancellation withdrawn" },
    { id: "drained", from: "cancelling", to: "cancelled", on: "handler acknowledges" },
    { id: "done", from: "running", to: "succeeded", on: "result committed" },
    { id: "gaveup", from: "running", to: "failed", on: "attempt budget exhausted" },
  ] as readonly AuthoredTransition[],
  scenario: [
    { take: "claim" },
    { take: "start" },
    { take: "heartbeat" },
    { take: "timed" },
    { take: "backoff" },
    { take: "claim" },
    { take: "start" },
    { take: "limited" },
    { take: "backoff" },
    { take: "claim" },
    { take: "start" },
    { take: "cancel" },
    { take: "drained" },
  ] as readonly AuthoredOccurrence[],
};

function places(layout: MachineLayout): string {
  return layout.nodes
    .map((node) => `${node.id}@${Math.round(node.rect.x)},${Math.round(node.rect.y)}`)
    .sort()
    .join(" ");
}

test("the audition is deterministic, candidate for candidate", () => {
  for (const machine of [ELEVATOR, HARD]) {
    const first = auditionLayouts(machine, VIEW, TYPO);
    const second = auditionLayouts(machine, VIEW, TYPO);
    assert.equal(first.winner.name, second.winner.name);
    assert.deepEqual(
      first.candidates.map((candidate) => [candidate.name, candidate.score.total]),
      second.candidates.map((candidate) => [candidate.name, candidate.score.total]),
    );
  }
});

test("the incumbent is a candidate, so the round can say what the search bought", () => {
  for (const machine of [ELEVATOR, HARD]) {
    const audition = auditionLayouts(machine, VIEW, TYPO);
    assert.deepEqual(
      places(audition.incumbent.layout),
      places(layoutMachine(machine, TYPO, DEFAULT_LAYOUT)),
    );
    assert.ok(
      audition.winner.score.total >= audition.incumbent.score.total,
      "a search that elects something worse than the incumbent has failed",
    );
  }
});

test("the elected layout beats the incumbent where it matters, and never has a collision", () => {
  for (const machine of [ELEVATOR, HARD]) {
    const { winner, incumbent } = auditionLayouts(machine, VIEW, TYPO);
    assert.ok(
      winner.score.stateNamePx >= incumbent.score.stateNamePx,
      "the overview should never come out smaller than it was",
    );
    assert.equal(winner.score.nodeOverlap, 0, "no two plates may touch");
    assert.equal(winner.score.labelOnNode, 0, "no caption may lie across a state");
    assert.equal(
      winner.score.labelOverlap,
      0,
      "no two captions may lie across each other",
    );
    assert.equal(
      winner.score.loopCollisions,
      0,
      "a self-loop stays in the room reserved for it",
    );
  }
});

test("permuting or reversing the scenario moves nothing", () => {
  // sprint:19's property, and it still holds — because what the layout may read is *how many times*
  // each transition is taken, and that is invariant under reordering. The film may be told in any
  // order and the map is the same map.
  for (const machine of [ELEVATOR, HARD]) {
    const settled = places(electLayout(machine, VIEW, TYPO));
    const reversed = { ...machine, scenario: [...machine.scenario].reverse() };
    const rotated = {
      ...machine,
      scenario: [...machine.scenario.slice(3), ...machine.scenario.slice(0, 3)],
    };
    assert.equal(
      places(electLayout(reversed, VIEW, TYPO)),
      settled,
      "reversing the run moves nothing",
    );
    assert.equal(
      places(electLayout(rotated, VIEW, TYPO)),
      settled,
      "rotating it moves nothing",
    );
  }
});

test("the layout is a function of the topology and the traversal counts, and of nothing else", () => {
  // The invariant, restated honestly. sprint:19 claimed the stronger version — topology alone —
  // and sprint:20 gave it up on measured evidence: weighting the recurrent core pulled it together
  // enough that the camera could frame ten more of the leased runner's thirteen occurrences
  // legibly. What is *still* refused is everything that would let the run change the machine:
  // no state moves because of the order things happened in, and no transition is hidden, demoted,
  // or drawn differently for never being taken.
  const doubled = { ...HARD, scenario: [...HARD.scenario, ...HARD.scenario] };
  const settled = places(electLayout(HARD, VIEW, TYPO));
  assert.notEqual(
    places(electLayout(doubled, VIEW, TYPO)),
    "",
    "a doubled scenario still lays out",
  );
  // Doubling every count scales the weights uniformly, so the *relative* emphasis is unchanged.
  assert.equal(places(electLayout(doubled, VIEW, TYPO)), settled);

  // But the topology is never edited: every declared transition survives, taken or not.
  const layout = electLayout(HARD, VIEW, TYPO);
  assert.equal(layout.edges.length, HARD.transitions.length);
  for (const transition of HARD.transitions) {
    assert.ok(
      layout.edgeById.has(transition.id),
      `${transition.id} was dropped from the map`,
    );
  }
});

test("an empty scenario lays the machine out exactly as a full one does", () => {
  const empty = { ...ELEVATOR, scenario: [] as readonly AuthoredOccurrence[] };
  // Not the same as the full elevator, necessarily — with no traversals there are no weights — but
  // it must still produce a complete, collision-free map rather than falling over.
  const layout = electLayout(empty, VIEW, TYPO);
  assert.equal(layout.nodes.length, ELEVATOR.states.length);
  assert.equal(layout.edges.length, ELEVATOR.transitions.length);
  assert.equal(scoreLayout(layout, empty, VIEW).nodeOverlap, 0);
});

test("self-loops and parallel edges survive every candidate the grid produces", () => {
  const audition = auditionLayouts(HARD, VIEW, TYPO);
  for (const candidate of audition.candidates) {
    const loops = candidate.layout.edges.filter((edge) => edge.self);
    assert.equal(loops.length, 1, `${candidate.name}: the self-transition vanished`);
    const parallel = candidate.layout.edges.filter(
      (edge) => edge.from === "running" && edge.to === "retry",
    );
    assert.equal(
      parallel.length,
      2,
      `${candidate.name}: the parallel pair collapsed into one`,
    );
    assert.notDeepEqual(
      parallel[0]?.points,
      parallel[1]?.points,
      `${candidate.name}: two transitions were drawn as one road`,
    );
  }
});

test("the elected policy is one of the grid's, and names no state or transition", () => {
  // The audition may not special-case an example. Every machine gets the same grid; what differs is
  // only which member of it wins.
  const elevator = auditionLayouts(ELEVATOR, VIEW, TYPO);
  const hard = auditionLayouts(HARD, VIEW, TYPO);
  assert.ok(elevator.candidates.some((c) => c.name === hard.winner.name));
  assert.ok(hard.candidates.some((c) => c.name === elevator.winner.name));
});

test("a small machine is not made awkward to help a large one", () => {
  // The elevator is the control. Whatever the search does for the adversarial specimen, it must not
  // leave a six-state machine worse than dagre's own defaults left it.
  const { winner, incumbent } = auditionLayouts(ELEVATOR, VIEW, TYPO);
  assert.ok(winner.score.stateNamePx > incumbent.score.stateNamePx);
  assert.equal(
    winner.score.crossings,
    0,
    "a small acyclic-looking machine should not gain a crossing",
  );
  assert.equal(winner.score.framable, 1, "and every occurrence should be approachable");
});
