import assert from "node:assert/strict";
import { test } from "node:test";

import type { AuthoredActor, AuthoredStep } from "../presentation/protocol.ts";
import {
  allocateLanes,
  COOLING_ROWS,
  lifetimesOf,
  peakLive,
  tenantAt,
  type LaneAllocation,
} from "./tenancy.ts";

/**
 * The allocator, as assertions about intervals.
 *
 * Every test here is a property rather than a pinned assignment, with one deliberate exception: the
 * `tap` shape is pinned to declaration order, because "the healthy case pays nothing" is the whole
 * licence the experiment operates under and it should fail loudly if it stops being true.
 *
 * `COOLING_ROWS` is referenced rather than restated, so a round that revisits the reclamation
 * boundary moves these tests with it instead of having to argue with them.
 */

function cast(...names: readonly string[]): readonly AuthoredActor[] {
  return names.map((name) => ({ id: name.toLowerCase(), text: name }));
}

function send(from: string, to: string): AuthoredStep {
  return { from, to, message: "a message" };
}

/** Enough traffic between two actors to push everything else `rows` steps further down. */
function filler(from: string, to: string, rows: number): readonly AuthoredStep[] {
  return Array.from({ length: rows }, (_unused, index) =>
    index % 2 === 0 ? send(from, to) : send(to, from),
  );
}

function overlapping(allocation: LaneAllocation): readonly (readonly [string, string])[] {
  const clashes: (readonly [string, string])[] = [];
  for (const one of allocation.tenancies) {
    for (const other of allocation.tenancies) {
      if (one.id >= other.id || one.slot !== other.slot) continue;
      if (one.first <= other.last && other.first <= one.last) {
        clashes.push([one.id, other.id]);
      }
    }
  }
  return clashes;
}

/* ------------------------------------------------------------- lifetimes */

test("an actor's interval spans its first and last participation, sent or received", () => {
  const actors = cast("A", "B", "C");
  const steps = [send("a", "b"), send("b", "c"), send("c", "b"), send("b", "a")];
  assert.deepEqual(
    lifetimesOf(actors, steps).map((life) => [life.id, life.first, life.last]),
    [
      ["a", 0, 3],
      ["b", 0, 3],
      ["c", 1, 2],
    ],
  );
});

test("an actor that appears once has an interval, not an absence", () => {
  const steps = [send("a", "b"), send("b", "c"), send("b", "a")];
  const life = lifetimesOf(cast("A", "B", "C"), steps).find((one) => one.id === "c");
  assert.deepEqual(life, { id: "c", declared: 2, first: 1, last: 1 });
});

test("the peak is the most actors live at any one step", () => {
  // a and b run throughout; c and d take turns, so three is the most that are ever live.
  const steps = [
    send("a", "b"),
    send("a", "c"),
    send("c", "a"),
    send("a", "d"),
    send("d", "b"),
  ];
  assert.equal(peakLive(lifetimesOf(cast("A", "B", "C", "D"), steps)), 3);
});

/* ------------------------------------------------------------ allocation */

test("overlapping actors never share a slot", () => {
  const actors = cast("A", "B", "C", "D", "E");
  const steps = [
    send("a", "b"),
    send("b", "c"),
    send("c", "d"),
    send("d", "e"),
    send("e", "a"),
    send("a", "c"),
    send("b", "e"),
  ];
  assert.deepEqual(overlapping(allocateLanes(actors, steps)), []);
});

test("a protocol whose parties are all present throughout pays nothing", () => {
  // The `tap` shape: everybody overlaps everybody, so allocation must be the identity on
  // declaration order and the film must be unable to tell the allocator ran.
  const actors = cast("You", "Terminal", "Acquirer", "Network", "Issuer");
  const steps = [
    send("you", "terminal"),
    send("terminal", "acquirer"),
    send("acquirer", "network"),
    send("network", "issuer"),
    send("issuer", "network"),
    send("network", "acquirer"),
    send("acquirer", "terminal"),
    send("terminal", "you"),
    send("acquirer", "network"),
    send("network", "issuer"),
    send("issuer", "network"),
    send("network", "acquirer"),
  ];
  const allocation = allocateLanes(actors, steps);
  assert.equal(allocation.slots, actors.length);
  assert.equal(allocation.reuses, 0);
  assert.deepEqual(
    allocation.tenancies.map((tenancy) => [tenancy.id, tenancy.slot]),
    actors.map((actor, index) => [actor.id, index]),
  );
});

test("a column is reclaimed once its tenant's traffic can no longer share a frame", () => {
  const actors = cast("A", "B", "Early", "Late");
  const steps = [
    send("early", "a"),
    send("a", "early"),
    ...filler("a", "b", COOLING_ROWS + 1),
    send("late", "a"),
  ];
  const allocation = allocateLanes(actors, steps);
  const early = allocation.byActor.get("early");
  const late = allocation.byActor.get("late");
  assert.equal(late?.slot, early?.slot);
  assert.equal(late?.ordinal, 1);
  assert.equal(allocation.reuses, 1);
  assert.deepEqual(overlapping(allocation), []);
});

test("a column whose tenant only just finished is not reclaimed", () => {
  // One row short of the cooling distance. Semantically `early` is finished and the arithmetic
  // would allow the reuse; the rule refuses it, because the two actors' traffic can still meet in
  // one shot and the film would be claiming a continuation nobody wrote.
  const actors = cast("A", "B", "Early", "Late");
  const steps = [
    send("early", "a"),
    send("a", "early"),
    ...filler("a", "b", COOLING_ROWS - 1),
    send("late", "a"),
  ];
  const allocation = allocateLanes(actors, steps);
  assert.equal(allocation.reuses, 0);
  assert.notEqual(
    allocation.byActor.get("late")?.slot,
    allocation.byActor.get("early")?.slot,
  );
});

test("a slot count never drops below the peak, and never exceeds the cast", () => {
  const actors = cast("A", "B", "C", "D", "E", "F");
  const steps = [
    send("a", "b"),
    send("b", "c"),
    ...filler("a", "b", COOLING_ROWS + 2),
    send("d", "e"),
    send("e", "f"),
    send("f", "d"),
  ];
  const allocation = allocateLanes(actors, steps);
  assert.ok(allocation.slots >= allocation.peak);
  assert.ok(allocation.slots <= actors.length);
  assert.equal(allocation.slots + allocation.reuses, actors.length);
});

test("nothing is ranked by lifetime: arrival order sets the columns", () => {
  // The pathological shape the ranking hypothesis was invented for — three disposable actors
  // first, three durable ones after. The durable actors must NOT be promoted leftwards; the
  // disposable ones vacate instead, and the leftmost columns come free on their own.
  const actors = cast("Dns", "Discovery", "Bootstrap", "Gateway", "Orders", "Database");
  const steps = [
    send("dns", "discovery"),
    send("discovery", "bootstrap"),
    send("bootstrap", "dns"),
    ...filler("gateway", "orders", COOLING_ROWS + 2),
    send("orders", "database"),
    send("database", "orders"),
  ];
  const allocation = allocateLanes(actors, steps);
  assert.deepEqual(
    ["dns", "discovery", "bootstrap"].map((id) => allocation.byActor.get(id)?.slot),
    [0, 1, 2],
  );
  // Gateway and Orders arrive while the early three are still coolable-in-principle but not yet
  // cool, so they open new columns; Database arrives late enough to inherit one that was vacated.
  assert.equal(allocation.byActor.get("database")?.ordinal, 1);
  assert.ok(allocation.slots < actors.length);
});

/* ----------------------------------------------------------- determinism */

test("allocation is deterministic across runs", () => {
  const actors = cast("A", "B", "C", "D", "E");
  const steps = [
    send("a", "b"),
    send("b", "c"),
    ...filler("a", "b", COOLING_ROWS + 3),
    send("d", "a"),
    send("e", "d"),
  ];
  const once = allocateLanes(actors, steps);
  const again = allocateLanes(actors, steps);
  assert.deepEqual(once.tenancies, again.tenancies);
});

test("simultaneous arrivals are broken by declaration order, not by chance", () => {
  const forwards = allocateLanes(cast("A", "B"), [send("a", "b")]);
  const backwards = allocateLanes(cast("B", "A"), [send("a", "b")]);
  assert.deepEqual(
    forwards.tenancies.map((tenancy) => [tenancy.id, tenancy.slot]),
    [
      ["a", 0],
      ["b", 1],
    ],
  );
  assert.deepEqual(
    backwards.tenancies.map((tenancy) => [tenancy.id, tenancy.slot]),
    [
      ["b", 0],
      ["a", 1],
    ],
  );
});

test("an actor added at the end disturbs nobody already placed", () => {
  const steps = [send("a", "b"), send("b", "c"), send("c", "a")];
  const before = allocateLanes(cast("A", "B", "C"), steps);
  const after = allocateLanes(cast("A", "B", "C", "D"), [...steps, send("a", "d")]);
  for (const tenancy of before.tenancies) {
    assert.equal(after.byActor.get(tenancy.id)?.slot, tenancy.slot, tenancy.id);
  }
});

/* --------------------------------------------------------------- tenancy */

test("a column names its sitting tenant, including in the gap before a handover", () => {
  const actors = cast("A", "B", "Early", "Late");
  const steps = [
    send("early", "a"),
    send("a", "early"),
    ...filler("a", "b", COOLING_ROWS + 1),
    send("late", "a"),
  ];
  const allocation = allocateLanes(actors, steps);
  const held = allocation.bySlot[allocation.byActor.get("early")?.slot ?? -1] ?? [];
  assert.equal(held.length, 2);
  assert.equal(tenantAt(held, 0)?.id, "early");
  // Semantically finished, and still holding the column: the handover has not happened yet.
  assert.equal(tenantAt(held, 5)?.id, "early");
  assert.equal(tenantAt(held, steps.length - 1)?.id, "late");
});
