import assert from "node:assert/strict";
import { test } from "node:test";

import type { AuthoredActor, AuthoredStep } from "../presentation/protocol.ts";
import { cameraAt, viewRect, type Rect } from "./camera.ts";
import {
  castBounds,
  layoutProtocol,
  readReplies,
  stepBounds,
  transcriptPlan,
  wrapToMeasure,
  type Lane,
} from "./protocol.ts";
import { COOLING_ROWS } from "./tenancy.ts";
import { TRANSCRIPT } from "./theme.ts";

/**
 * The geometry and the choreography, without a browser.
 *
 * These are properties rather than pinned numbers wherever a number would only be pinning today's
 * constants: the constants are meant to move when a rendered minute says so, and a test that froze
 * them would make the artifact unable to overrule the archaeology. What is pinned is what must not
 * move at all — that lanes stay where they were put, that rows never overlap, and that an arrow
 * always lands on a lifeline.
 */

function cast(...names: readonly string[]): readonly AuthoredActor[] {
  return names.map((name) => ({ id: name.toLowerCase(), text: name }));
}

function send(from: string, to: string, message = "a message"): AuthoredStep {
  return { from, to, message };
}

const SIMPLE = {
  actors: cast("Client", "Gateway", "Auth", "Worker"),
  steps: [
    send("client", "gateway", "POST /orders"),
    send("gateway", "auth", "validate token"),
    send("auth", "gateway", "valid"),
    send("gateway", "worker", "dispatch"),
    send("worker", "gateway", "accepted"),
    send("gateway", "client", "201 Created"),
  ],
};

/* ----------------------------------------------------------------- lanes */

test("lane order is the written order, and the pitch is uniform", () => {
  const layout = layoutProtocol(SIMPLE);
  assert.deepEqual(
    layout.lanes.map((lane) => lane.id),
    ["client", "gateway", "auth", "worker"],
  );
  const gaps = layout.lanes
    .slice(1)
    .map((lane, index) => lane.x - (layout.lanes[index] as { x: number }).x);
  assert.deepEqual(new Set(gaps), new Set([layout.lanePitch]));
});

test("a lane sits in exactly one place, whatever the traffic does", () => {
  const quiet = layoutProtocol(SIMPLE);
  const busy = layoutProtocol({
    ...SIMPLE,
    steps: [...SIMPLE.steps, ...SIMPLE.steps, send("worker", "worker", "retry")],
  });
  for (const lane of quiet.lanes) {
    assert.equal(busy.byId.get(lane.id)?.x, lane.x, `${lane.id} moved`);
  }
});

test("the widest name sets the pitch, and a longer one widens every lane equally", () => {
  const narrow = layoutProtocol(SIMPLE);
  const wide = layoutProtocol({
    ...SIMPLE,
    actors: SIMPLE.actors.map((actor) =>
      actor.id === "auth"
        ? { ...actor, text: "Authorization and consent service" }
        : actor,
    ),
  });
  assert.ok(wide.lanePitch > narrow.lanePitch);
  const gaps = wide.lanes
    .slice(1)
    .map((lane, index) => lane.x - (wide.lanes[index] as { x: number }).x);
  assert.deepEqual(new Set(gaps), new Set([wide.lanePitch]));
});

/* ------------------------------------------------------------------ rows */

test("every arrow starts and ends on a lifeline", () => {
  const layout = layoutProtocol(SIMPLE);
  for (const message of layout.messages) {
    assert.equal(message.x1, layout.byId.get(message.from)?.x);
    assert.equal(message.x2, layout.byId.get(message.to)?.x);
  }
});

test("rows descend, and no two of them overlap", () => {
  const layout = layoutProtocol({
    actors: cast("A", "B", "C"),
    steps: [
      send("a", "b", "short"),
      send(
        "b",
        "c",
        "a rather longer payload that will certainly have to wrap somewhere",
      ),
      send("c", "a", "back"),
      { from: "b", to: "b", message: "retry with exponential backoff" },
      send("a", "b", "again"),
    ],
  });
  layout.messages.slice(1).forEach((message, index) => {
    const previous = layout.messages[index] as { band: Rect; y: number };
    assert.ok(
      message.band.y >= previous.band.y + previous.band.height,
      `row ${index + 2} starts before row ${index + 1} finished`,
    );
    assert.ok(message.y > previous.y, `row ${index + 2} is not below row ${index + 1}`);
  });
});

test("a long label wraps rather than overflowing, and its row grows to hold it", () => {
  const short = layoutProtocol({
    actors: cast("A", "B"),
    steps: [send("a", "b", "go")],
  });
  const long = layoutProtocol({
    actors: cast("A", "B"),
    steps: [
      send(
        "a",
        "b",
        "POST /orders with the full basket, the idempotency key and the caller's trace context",
      ),
    ],
  });
  const shortRow = short.messages[0];
  const longRow = long.messages[0];
  assert.ok(shortRow !== undefined && longRow !== undefined);
  assert.equal(shortRow.lines.length, 1);
  assert.ok(longRow.lines.length > 1, "a long label should have wrapped");
  assert.ok(longRow.band.height > shortRow.band.height, "the row should have grown");
});

test("a wider arrow buys a wider measure, so the same label wraps less", () => {
  const near = layoutProtocol({
    actors: cast("A", "B", "C", "D", "E"),
    steps: [send("a", "b", "an eight word label that has to go somewhere")],
  });
  const far = layoutProtocol({
    actors: cast("A", "B", "C", "D", "E"),
    steps: [send("a", "e", "an eight word label that has to go somewhere")],
  });
  assert.ok(
    (far.messages[0]?.lines.length ?? 0) < (near.messages[0]?.lines.length ?? 0),
    "the distance between lanes should be the label's measure",
  );
});

test("wrapping never drops a word, whatever the measure", () => {
  const text = "POST /orders with basket, idempotency-key and trace context";
  for (const measure of [80, 200, 400, 900, 4000]) {
    assert.equal(wrapToMeasure(text, measure).join(" "), text);
  }
});

test("a self-message is a hook beside its own lane, not a zero-length arrow", () => {
  const layout = layoutProtocol({
    actors: cast("A", "B"),
    steps: [send("a", "b", "start"), { from: "b", to: "b", message: "retry" }],
  });
  const hook = layout.messages[1];
  assert.ok(hook !== undefined);
  assert.equal(hook.self, true);
  assert.equal(hook.x1, hook.x2);
  assert.ok(hook.band.width >= TRANSCRIPT.selfWidth, "the hook needs room of its own");
  assert.ok(hook.label.x > hook.x1, "its label hangs to the side");
});

/* --------------------------------------------------------------- tenancy */

/** Enough back-and-forth between two actors to push everything after it out of any one shot. */
function filler(from: string, to: string, rows: number): readonly AuthoredStep[] {
  return Array.from({ length: rows }, (_unused, index) =>
    index % 2 === 0 ? send(from, to, "tick") : send(to, from, "tock"),
  );
}

const RECLAIMING = {
  actors: cast("A", "B", "Early", "Late"),
  steps: [
    send("early", "a", "hello"),
    send("a", "early", "hello back"),
    ...filler("a", "b", COOLING_ROWS + 1),
    send("late", "a", "and now me"),
    send("a", "late", "and you"),
  ],
};

test("a protocol that reclaims nothing lays out exactly as it always did", () => {
  // The licence the whole experiment runs under: the healthy case pays nothing. Positions are the
  // written order, lifelines run the length of the film, and no column is ever terminated.
  const layout = layoutProtocol(SIMPLE);
  assert.equal(layout.allocation.reuses, 0);
  layout.lanes.forEach((lane, index) => {
    assert.equal(
      lane.x,
      index * layout.lanePitch,
      `${lane.id} is not where it was written`,
    );
    assert.equal(lane.slot, index);
    assert.equal(lane.ordinal, 0);
    assert.equal(lane.handsOver, false);
    assert.equal(lane.lifelineTop, layout.lifelineTop);
    assert.equal(lane.lifelineBottom, layout.lifelineBottom);
    assert.equal(lane.plate.y, 0);
  });
  assert.deepEqual(
    layout.bySlot.map((held) => held.length),
    layout.lanes.map(() => 1),
  );
});

test("a reclaimed column is the same column, and the newcomer is below the terminator", () => {
  const layout = layoutProtocol(RECLAIMING);
  const early = layout.byId.get("early") as Lane;
  const late = layout.byId.get("late") as Lane;

  assert.equal(late.x, early.x, "the newcomer should inherit the column, not a new one");
  assert.equal(early.handsOver, true, "the outgoing lifeline should be terminated");
  assert.equal(late.ordinal, 1);
  assert.ok(
    late.plate.y > early.lifelineBottom,
    "the arrival plate must sit below the terminator that freed the column",
  );
  assert.equal(late.lifelineTop, late.plate.y + early.plate.height);
  assert.equal(late.lifelineBottom, layout.lifelineBottom);
  assert.equal(early.lifelineTop, layout.lifelineTop);
});

test("an arrival is not part of the establishing shot", () => {
  const layout = layoutProtocol(RECLAIMING);
  const late = layout.byId.get("late") as Lane;
  assert.ok(
    late.plate.y > layout.cast.y + layout.cast.height,
    "a party that has not arrived yet has no business in the cast row",
  );
  // ...but the world still contains it, or the camera could clamp it away.
  assert.ok(layout.bounds.y + layout.bounds.height >= late.plate.y + late.plate.height);
});

test("an arrival gets room of its own, and no row lands in it", () => {
  const layout = layoutProtocol(RECLAIMING);
  const late = layout.byId.get("late") as Lane;
  for (const message of layout.messages) {
    const clear =
      message.band.y + message.band.height <= late.plate.y ||
      message.band.y >= late.plate.y + late.plate.height;
    // The row that *causes* the arrival owns the reserved band, so its own band legitimately
    // contains the plate — everything else must be clear of it.
    if (message.index === late.first) continue;
    assert.ok(clear, `row ${message.index + 1} lands on an arrival plate`);
  }
  // The causing row's band reaches up over the plate, so the camera frames the two together.
  const causing = layout.messages[late.first] as { band: Rect };
  assert.ok(causing.band.y <= late.plate.y);
});

test("rows still descend and never overlap once a handover is reserving room", () => {
  const layout = layoutProtocol(RECLAIMING);
  layout.messages.slice(1).forEach((message, index) => {
    const previous = layout.messages[index] as { band: Rect; y: number };
    assert.ok(
      message.band.y >= previous.band.y + previous.band.height,
      `row ${index + 2} starts before row ${index + 1} finished`,
    );
    assert.ok(message.y > previous.y, `row ${index + 2} is not below row ${index + 1}`);
  });
});

test("reuse narrows the world without narrowing the pitch", () => {
  const reused = layoutProtocol(RECLAIMING);
  const spread = layoutProtocol({
    ...RECLAIMING,
    // The same protocol with the reuse made impossible: `late` now speaks early too, so its
    // interval overlaps `early`'s and the two cannot share a column.
    steps: [send("late", "b", "a word first"), ...RECLAIMING.steps],
  });
  assert.equal(reused.allocation.slots, 3);
  assert.equal(spread.allocation.slots, 4);
  assert.equal(reused.lanePitch, spread.lanePitch, "the pitch is not what changed");
  assert.ok(reused.cast.width < spread.cast.width, "the opening row should be narrower");
});

/* --------------------------------------------------------------- replies */

test("a message that goes back the way the last one came is a reply", () => {
  const { reply } = readReplies([
    send("a", "b"),
    send("b", "c"),
    send("c", "b"),
    send("b", "a"),
  ]);
  assert.deepEqual(reply, [false, false, true, true]);
});

test("two calls the same way round are two calls, not a call and an answer", () => {
  const { reply, balanced } = readReplies([
    send("a", "b"),
    send("a", "b"),
    send("b", "a"),
    send("b", "a"),
  ]);
  assert.equal(balanced, true);
  assert.deepEqual(reply, [false, false, true, true]);
});

/**
 * The withholding rule, which is the round's most expensive finding.
 *
 * The stack cannot tell a notification from a call, so the notation is only applied where a
 * misfire is impossible — and a misfire always leaves an unanswered call behind.
 */
test("a protocol that is not call/return gets no returns and no bars at all", () => {
  const notifying = [send("a", "b"), send("b", "c"), send("c", "b"), send("b", "a")];
  const balancedOne = readReplies(notifying);
  assert.equal(balancedOne.balanced, true);

  // One unanswered notification anywhere, and the whole protocol loses the notation.
  const { reply, calls, balanced } = readReplies([...notifying, send("a", "c")]);
  assert.equal(balanced, false);
  assert.deepEqual(reply, [false, false, false, false, false]);
  assert.deepEqual(calls, []);
});

test("a self-message neither opens a call nor answers one", () => {
  const { reply } = readReplies([
    send("a", "b"),
    { from: "b", to: "b", message: "thinking" },
    send("b", "a"),
  ]);
  assert.deepEqual(reply, [false, false, true]);
});

test("an actor holds its lifeline bar for exactly as long as the call is open", () => {
  const layout = layoutProtocol({
    actors: cast("A", "B", "C"),
    steps: [send("a", "b"), send("b", "c"), send("c", "b"), send("b", "a")],
  });
  const held = layout.activations.map((entry) => entry.lane);
  assert.deepEqual(held, ["b", "c"]);

  const outer = layout.activations[0];
  const inner = layout.activations[1];
  assert.ok(outer !== undefined && inner !== undefined);
  // B is holding from the first message to the last; C from the second to the third, inside it.
  assert.equal(outer.y, layout.messages[0]?.y);
  assert.equal(outer.y + outer.height, layout.messages[3]?.y);
  assert.equal(inner.y, layout.messages[1]?.y);
  assert.equal(inner.y + inner.height, layout.messages[2]?.y);
  assert.equal(inner.depth, 1, "the nested bar steps aside rather than overlapping");
});

test("an unbalanced protocol draws every arrow the same way", () => {
  const layout = layoutProtocol({
    actors: cast("A", "B"),
    steps: [send("a", "b", "fire and forget")],
  });
  assert.deepEqual(layout.activations, []);
  assert.deepEqual(
    layout.messages.map((message) => message.reply),
    [false],
  );
});

/* -------------------------------------------------------------- the shot */

function shotsOf(layout: ReturnType<typeof layoutProtocol>) {
  const beats = layout.messages.map((message, index) => ({
    index,
    from: 100 + index * 60,
  }));
  const last = beats.at(-1)?.from ?? 0;
  return transcriptPlan(layout, beats, { from: 0, until: last + 60 }).shots;
}

/**
 * The claim is about *framing*, not about stillness.
 *
 * A protocol descends whatever else happens — that is what the y axis means — so a camera that
 * never moved during a five-message exchange would be one that had let the exchange run off the
 * bottom of the frame. What must not change is the shot: the same pair, at the same scale, in the
 * same place across the frame. Anything else is the bouncing decision:24 was written against.
 */
test("repeated traffic between the same pair does not change the framing", () => {
  const layout = layoutProtocol({
    actors: cast("Client", "Gateway", "Auth", "Worker", "Ledger", "Mailer"),
    steps: [
      send("gateway", "auth", "one"),
      send("auth", "gateway", "two"),
      send("gateway", "auth", "three"),
      send("auth", "gateway", "four"),
      send("gateway", "auth", "five"),
    ],
  });
  const shots = shotsOf(layout);
  const opening = shots[0];
  assert.ok(opening !== undefined);
  for (const shot of shots.slice(1)) {
    assert.equal(shot.view.width, opening.view.width, `${shot.id} changed scale`);
    assert.equal(shot.view.cx, opening.view.cx, `${shot.id} moved sideways`);
  }
});

test("attention migrating across the cast does move it", () => {
  const layout = layoutProtocol({
    actors: cast("A", "B", "C", "D", "E", "F", "G", "H"),
    steps: [send("a", "b", "one"), send("g", "h", "two")],
  });
  const shots = shotsOf(layout);
  assert.notEqual(
    shots[1]?.view.cx,
    shots[0]?.view.cx,
    "a jump across the whole cast should move the camera",
  );
});

test("both ends of every step are inside the shot it produced", () => {
  const layout = layoutProtocol({
    actors: cast("Client", "Gateway", "Auth", "Worker", "Ledger", "Mailer"),
    steps: [
      send("client", "gateway", "POST /orders"),
      send("gateway", "auth", "validate"),
      send("auth", "gateway", "valid"),
      send("gateway", "mailer", "notify"),
      send("mailer", "ledger", "record"),
      send("ledger", "gateway", "ok"),
      send("gateway", "client", "201"),
    ],
  });
  const beats = layout.messages.map((message, index) => ({
    index,
    from: 100 + index * 90,
  }));
  const plan = transcriptPlan(layout, beats, { from: 0, until: 100 + beats.length * 90 });

  for (const beat of beats) {
    // Where the camera actually is when the arrow is drawn, not where the shot was solved.
    const view = viewRect(cameraAt(plan.track, beat.from + 20));
    const message = layout.messages[beat.index];
    assert.ok(message !== undefined);
    for (const x of [message.x1, message.x2]) {
      assert.ok(
        x >= view.x && x <= view.x + view.width,
        `step ${beat.index + 1}: lifeline at ${Math.round(x)} is outside ${Math.round(view.x)}..${Math.round(view.x + view.width)}`,
      );
    }
    assert.ok(
      message.y >= view.y && message.y <= view.y + view.height,
      `step ${beat.index + 1}: the arrow is off the frame vertically`,
    );
  }
});

test("a shot always holds more of the cast than the two lanes it is about", () => {
  const layout = layoutProtocol(SIMPLE);
  const bounds = stepBounds(layout, 1);
  assert.ok(
    bounds.width >= layout.lanePitch * TRANSCRIPT.minLanesInShot - 1,
    "the shot lost the surrounding cast",
  );
});

test("the establishing shot holds the whole cast", () => {
  const layout = layoutProtocol(SIMPLE);
  const opening = castBounds(layout);
  for (const lane of layout.lanes) {
    assert.ok(
      lane.x >= opening.x && lane.x <= opening.x + opening.width,
      `${lane.id} is not in the establishing shot`,
    );
  }
});

test("a shot keeps the rows before it, so a message has a visible cause", () => {
  const layout = layoutProtocol(SIMPLE);
  const bounds = stepBounds(layout, 3);
  const previous = layout.messages[2];
  assert.ok(previous !== undefined);
  assert.ok(
    previous.y >= bounds.y && previous.y <= bounds.y + bounds.height,
    "the previous message left the frame",
  );
});
