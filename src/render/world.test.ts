import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAMERA,
  cameraAt,
  cameraPlan,
  cameraTrack,
  chamberFor,
  composedShot,
  fitTo,
  layoutWorld,
  marginOf,
  occupancyOf,
  plateSize,
  portalAt,
  shotFor,
  smootherstep,
  targetBounds,
  union,
  viewRect,
  viewportTransform,
  wrapLabel,
  type Rect,
  type WorldLayout,
} from "./world.ts";

/**
 * The geometry nobody wrote down.
 *
 * Everything here is testable without a browser on purpose: layout, framing and the camera track
 * are pure functions of the world and the anchors, and the only thing the composition adds is
 * turning a viewport into a CSS transform. What is deliberately *not* tested is what any of it
 * looks like — that was settled by watching, which is the only way it can be.
 */

const WORLD = {
  entities: [
    { id: "source", text: "The source you write" },
    { id: "cues", text: "Narration cues" },
    { id: "content", text: "Semantic content" },
    { id: "speech", text: "Speech, measured here" },
    { id: "state", text: "Presentation state" },
    { id: "video", text: "One video file" },
  ],
  relations: [
    { from: "source", to: "cues" },
    { from: "source", to: "content" },
    { from: "cues", to: "speech" },
    { from: "speech", to: "state" },
    { from: "content", to: "state" },
    { from: "state", to: "video" },
  ],
};

const laid = layoutWorld(WORLD);

function rectOf(layout: WorldLayout, id: string): Rect {
  const node = layout.byId.get(id);
  assert.ok(node !== undefined, `no node ${id}`);
  return node.rect;
}

test("a label is laid out, not squeezed: the break is balanced and nothing is dropped", () => {
  // v1 wrapped greedily at a fixed measure and produced `What / narration / can reach`.
  assert.deepEqual(wrapLabel("What narration can reach"), [
    "What narration",
    "can reach",
  ]);
  assert.deepEqual(wrapLabel("Remotion"), ["Remotion"]);
  assert.deepEqual(wrapLabel("Speech, measured here"), ["Speech,", "measured here"]);

  // Whatever the break, every word survives it in order.
  for (const label of [
    "One video file",
    "Presentation state",
    "The source you write",
    "A very considerably longer entity label than anyone should write",
  ]) {
    assert.equal(wrapLabel(label).join(" "), label);
    assert.ok(wrapLabel(label).length <= 3);
  }
});

test("a break is chosen for the plate it makes, not for a fixed measure", () => {
  // Each candidate break is scored on the plate's proportion, so the chosen one is never
  // wildly further from the target shape than another achievable break.
  const chosen = plateSize(wrapLabel("Semantic anchors"));
  const oneLine = plateSize(["Semantic anchors"]);
  const three = plateSize(["Semantic", "anch", "ors"]);
  const away = (size: { width: number; height: number }) =>
    Math.abs(size.width / size.height - 2.3);
  assert.ok(away(chosen) <= away(oneLine));
  assert.ok(away(chosen) < away(three));
});

test("a word longer than any sensible line gets its own, rather than being cut", () => {
  const lines = wrapLabel("Indistinguishable from compression");
  assert.ok(lines.includes("Indistinguishable"));
  assert.equal(lines.join(" "), "Indistinguishable from compression");
});

test("a plate is sized to its label, and a longer label makes a wider plate", () => {
  const narrow = plateSize(["Remotion"]);
  const wide = plateSize(["Presentation"]);
  const tall = plateSize(["Speech,", "measured", "here"]);
  assert.ok(wide.width > narrow.width);
  assert.ok(tall.height > narrow.height);
});

test("layout is deterministic: the same world lands in the same place twice", () => {
  const again = layoutWorld(WORLD);
  assert.deepEqual(
    laid.nodes.map((node) => [node.id, node.rect]),
    again.nodes.map((node) => [node.id, node.rect]),
  );
  assert.deepEqual(
    laid.edges.map((edge) => edge.path),
    again.edges.map((edge) => edge.path),
  );
});

test("every entity is placed, and every relation is routed", () => {
  assert.equal(laid.nodes.length, WORLD.entities.length);
  assert.equal(laid.edges.length, WORLD.relations.length);
  for (const edge of laid.edges) {
    assert.ok(edge.points.length >= 2, `${edge.from}->${edge.to} has no route`);
    assert.ok(edge.length > 0);
    assert.match(edge.path, /^M /);
  }
});

test("the flow runs left to right, so depth is position along it", () => {
  const source = laid.byId.get("source");
  const video = laid.byId.get("video");
  assert.equal(source?.depth, 0);
  assert.equal(video?.depth, 1);
  assert.ok(rectOf(laid, "source").x < rectOf(laid, "state").x);
  assert.ok(rectOf(laid, "state").x < rectOf(laid, "video").x);
});

test("the entity nothing leaves is the world's product, and it is the only one", () => {
  assert.deepEqual(
    laid.nodes.filter((node) => node.terminal).map((node) => node.id),
    ["video"],
  );
});

test("bounds contain every plate and every routed relation", () => {
  const { bounds } = laid;
  for (const node of laid.nodes) {
    assert.ok(node.rect.x >= bounds.x);
    assert.ok(node.rect.x + node.rect.width <= bounds.x + bounds.width);
    assert.ok(node.rect.y >= bounds.y);
    assert.ok(node.rect.y + node.rect.height <= bounds.y + bounds.height);
  }
  for (const edge of laid.edges) {
    for (const point of edge.points) {
      assert.ok(point.x >= bounds.x && point.x <= bounds.x + bounds.width);
      assert.ok(point.y >= bounds.y && point.y <= bounds.y + bounds.height);
    }
  }
});

test("the world is wider than the frame it will be seen through", () => {
  // The whole premise of the composition. If this stops holding, the camera has nothing to do.
  assert.ok(laid.bounds.width > 1920, `world is only ${laid.bounds.width} wide`);
});

test("a target with no established context is the entity alone", () => {
  assert.deepEqual(targetBounds(laid, "source", new Set()), rectOf(laid, "source"));
});

test("a target picks up the established things it relates to", () => {
  const bounds = targetBounds(laid, "cues", new Set(["source"]));
  assert.deepEqual(bounds, union([rectOf(laid, "cues"), rectOf(laid, "source")]));
});

test("a relation to something not yet reached is not context", () => {
  // `speech` is downstream of `cues`; at the moment `cues` ignites it has not been reached.
  assert.deepEqual(targetBounds(laid, "cues", new Set()), rectOf(laid, "cues"));
});

test("context stops being taken before the shot loses its subject", () => {
  const all = new Set(laid.nodes.map((node) => node.id));
  for (const node of laid.nodes) {
    const view = fitTo(targetBounds(laid, node.id, all), laid.bounds, {
      widest: CAMERA.widest,
    });
    assert.ok(
      view.width <= CAMERA.widest,
      `${node.id} framed at ${Math.round(view.width)}`,
    );
  }
});

test("a target that does not name an entity falls back to the whole world", () => {
  assert.deepEqual(targetBounds(laid, "nothing-like-this", new Set()), laid.bounds);
});

test("fitting pads, respects the aspect, and never goes closer than the limit", () => {
  const tall: Rect = { x: 0, y: 0, width: 100, height: 900 };
  const view = fitTo(tall, { x: 0, y: 0, width: 4000, height: 2000 });
  // Bound by height at 16:9, not by the 100-unit width.
  assert.ok(view.width >= (900 * 16) / 9, "a tall target must be framed by its height");
  assert.equal(
    fitTo({ x: 0, y: 0, width: 1, height: 1 }, laid.bounds).width,
    CAMERA.nearest,
  );
});

test("the centre is clamped so the shot stays over the world", () => {
  const edge = rectOf(laid, "source");
  const view = fitTo(edge, laid.bounds, { widest: CAMERA.widest });
  const left = view.cx - view.width / 2;
  // Some void at the edge is allowed, and it is bounded by the slack.
  assert.ok(left < laid.bounds.x, "an edge plate should sit near the edge of the shot");
  assert.ok(left > laid.bounds.x - view.width * CAMERA.slack - 1);
});

test("the whole world fits inside the whole-world shot", () => {
  const whole = fitTo(laid.bounds, laid.bounds, { pad: CAMERA.revealPad });
  const height = whole.width / (16 / 9);
  assert.ok(whole.cx - whole.width / 2 <= laid.bounds.x);
  assert.ok(whole.cx + whole.width / 2 >= laid.bounds.x + laid.bounds.width);
  assert.ok(whole.cy - height / 2 <= laid.bounds.y);
  assert.ok(whole.cy + height / 2 >= laid.bounds.y + laid.bounds.height);
});

const EVENTS = [
  { frame: 100, id: "source" },
  { frame: 200, id: "cues" },
  { frame: 300, id: "speech" },
];
const SPAN = { from: 0, until: 400 };
const plan = cameraPlan(laid, EVENTS, SPAN);
const track = plan.track;

/* ------------------------------------------------- a move has to be worth making */

test("a shot that already frames the target with room is kept", () => {
  const bounds = rectOf(laid, "state");
  const held = fitTo(bounds, laid.bounds, { widest: CAMERA.widest });
  const shot = shotFor(held, bounds, laid.bounds);
  assert.equal(shot.kind, "hold");
  assert.deepEqual(shot.view, held);
});

test("a target clipped by the current frame is brought in, at the same scale", () => {
  const bounds = rectOf(laid, "state");
  const held = fitTo(bounds, laid.bounds, { widest: CAMERA.widest });
  // Slide the camera until the subject is half out of frame.
  const drifted = { ...held, cx: held.cx + held.width * 0.45 };
  const shot = shotFor(drifted, bounds, laid.bounds);
  assert.equal(shot.kind, "pan");
  assert.equal(shot.view.width, drifted.width, "a pan must not change the scale");
  // And it pans the *least* it can: the subject ends up against the margin, not centred.
  assert.ok(Math.abs(shot.view.cx - held.cx) > 1, "it moved");
  assert.ok(shot.view.cx > held.cx, "it stayed on the side it came from");
});

test("a target too small to read is recomposed even though it is fully visible", () => {
  // This is the case containment alone gets wrong: the opening whole-world shot contains every
  // target perfectly and is the right shot for none of them.
  const whole = fitTo(laid.bounds, laid.bounds, { pad: CAMERA.revealPad });
  const held = viewRect(whole);
  // Whichever plate sits furthest from the edges: the case is about size, not about clipping.
  const inmost = [...laid.nodes].sort(
    (a, b) => marginOf(b.rect, held) - marginOf(a.rect, held),
  )[0];
  assert.ok(inmost !== undefined);
  assert.ok(
    marginOf(inmost.rect, held) > CAMERA.holdMargin,
    "it really is fully contained",
  );
  assert.ok(
    occupancyOf(inmost.rect, held) < CAMERA.holdOccupancy,
    "and really is too small",
  );
  assert.equal(shotFor(whole, inmost.rect, laid.bounds).kind, "recompose");
});

test("a target that does not fit at the current scale is recomposed", () => {
  const tight = fitTo(rectOf(laid, "source"), laid.bounds, { widest: CAMERA.widest });
  const wide = union([rectOf(laid, "source"), rectOf(laid, "video")]);
  assert.equal(shotFor(tight, wide, laid.bounds).kind, "recompose");
});

test("holding is stable: re-deciding the same shot never starts drifting", () => {
  // The property hysteresis exists for. Feeding a decision back in must reach a fixed point
  // rather than oscillating between two nearby solutions.
  let view = fitTo(rectOf(laid, "state"), laid.bounds, { widest: CAMERA.widest });
  const bounds = rectOf(laid, "state");
  for (let round = 0; round < 8; round += 1) {
    const shot = shotFor(view, bounds, laid.bounds);
    assert.equal(shot.kind, "hold", `moved again on round ${round}`);
    view = shot.view;
  }
});

test("the plan records what it decided about every event, including the ones it ignored", () => {
  assert.deepEqual(
    plan.shots.map((shot) => shot.id),
    EVENTS.map((event) => event.id),
  );
  for (const shot of plan.shots) {
    assert.ok(["hold", "pan", "recompose"].includes(shot.kind));
  }
});

test("an event that changes nothing produces no key at all", () => {
  const still = cameraPlan(laid, [{ frame: 100, id: "source" }], SPAN);
  const held = still.track.at(-2)?.view;
  assert.ok(held !== undefined);
  // Reaching the same entity again from the shot that already frames it is a hold, and a hold
  // adds nothing to the track.
  const again = cameraPlan(
    laid,
    [
      { frame: 100, id: "source" },
      { frame: 200, id: "source" },
    ],
    SPAN,
  );
  assert.equal(again.track.length, still.track.length);
  assert.equal(again.shots.at(-1)?.kind, "hold");
});

/* ---------------------------------------------------------------- the whole track */

test("the track opens on the whole world and closes on it again", () => {
  const whole = fitTo(laid.bounds, laid.bounds, { pad: CAMERA.revealPad });
  assert.deepEqual(track[0]?.view, whole);
  assert.deepEqual(track.at(-1)?.view, whole);
  assert.equal(track.at(-1)?.frame, SPAN.until);
});

test("every key that is not a hold begins at the frame the narration reached its entity", () => {
  const moved = plan.shots
    .filter((shot) => shot.kind !== "hold")
    .map((shot) => shot.frame);
  assert.deepEqual(
    track.slice(1, -1).map((key) => key.frame),
    moved,
  );
});

test("a move is paced by its own path and never outlives the gap after it", () => {
  for (const [index, key] of track.entries()) {
    if (index === 0) continue;
    const next = track[index + 1];
    assert.ok(key.travel >= 1);
    if (next !== undefined) assert.ok(key.travel <= next.frame - key.frame);
  }
  // A traversal across the world is not given the same time as a hop between neighbours.
  const far = cameraPlan(laid, [{ frame: 100, id: "video" }], {
    from: 0,
    until: 900,
  }).track;
  const near = cameraPlan(laid, [{ frame: 100, id: "source" }], {
    from: 0,
    until: 900,
  }).track;
  assert.ok((far[1]?.travel ?? 0) >= (near[1]?.travel ?? 0));
});

test("events are ordered by frame, whatever order they arrive in", () => {
  const shuffled = cameraPlan(laid, [...EVENTS].reverse(), SPAN).track;
  assert.deepEqual(
    shuffled.map((key) => key.view),
    track.map((key) => key.view),
  );
});

test("the camera sits still until a stop, then arrives exactly at it", () => {
  const before = cameraAt(track, 99);
  assert.deepEqual(before, track[0]?.view);

  const key = track[1];
  assert.ok(key !== undefined);
  const arrived = cameraAt(track, key.frame + key.travel);
  assert.ok(Math.abs(arrived.cx - key.view.cx) < 0.5);
  assert.ok(Math.abs(arrived.width - key.view.width) < 0.5);
});

test("the camera moves monotonically and never jumps", () => {
  let previous = cameraAt(track, 0);
  for (let frame = 1; frame <= SPAN.until + CAMERA.revealTravel; frame += 1) {
    const view = cameraAt(track, frame);
    const step = Math.hypot(view.cx - previous.cx, view.cy - previous.cy);
    assert.ok(step < view.width / 6, `jump of ${Math.round(step)} at frame ${frame}`);
    assert.ok(view.width > 0);
    previous = view;
  }
});

test("a world nobody narrates is framed whole from beginning to end", () => {
  const still = cameraTrack(laid, [], SPAN);
  const whole = fitTo(laid.bounds, laid.bounds, { pad: CAMERA.revealPad });
  assert.deepEqual(cameraAt(still, 0), whole);
  assert.deepEqual(cameraAt(still, 999), whole);
});

/* ------------------------------------------------------------------- going inside */

const INSIDE = [
  { frame: 100, id: "cues" },
  { frame: 200, id: "detail-one", inside: "speech" },
  { frame: 260, id: "detail-two", inside: "speech" },
  { frame: 340, id: "state" },
];
const excursion = cameraPlan(laid, INSIDE, { from: 0, until: 500 });

test("a cue reaching inside an entity opens it, and the next one outside closes it", () => {
  assert.equal(excursion.portals.length, 1);
  const pass = excursion.portals[0];
  assert.ok(pass !== undefined);
  assert.equal(pass.id, "speech");
  // It opens once the camera has arrived at the concept, not the instant the word lands: the
  // approach is a shot like any other and the expansion follows it.
  assert.ok(pass.enterFrame >= 200, "opens no earlier than the cue that reaches inside");
  assert.ok(pass.enterFrame < 260, "and before the next thing said in there");
  assert.equal(pass.exitFrame, 340, "closes on the first cue that reaches outside");
  assert.deepEqual(
    excursion.shots.map((shot) => shot.kind),
    ["recompose", "enter", "exit", "pan"],
  );
});

test("a second cue inside the same entity does not re-enter it", () => {
  assert.equal(excursion.shots.filter((shot) => shot.kind === "enter").length, 1);
});

test("an excursion nobody leaves is closed by the end of the narration", () => {
  const unfinished = cameraPlan(
    laid,
    [{ frame: 100, id: "detail-one", inside: "speech" }],
    { from: 0, until: 400 },
  );
  assert.equal(unfinished.portals[0]?.exitFrame, 400);
});

test("the chamber is centred on the plate, so the plate does not move while it opens", () => {
  const node = laid.byId.get("speech");
  assert.ok(node !== undefined);
  const chamber = chamberFor(node);
  assert.ok(
    Math.abs(chamber.x + chamber.width / 2 - (node.rect.x + node.rect.width / 2)) < 1e-9,
  );
  assert.ok(
    Math.abs(chamber.y + chamber.height / 2 - (node.rect.y + node.rect.height / 2)) <
      1e-9,
  );
  assert.ok(Math.abs(chamber.width / chamber.height - 16 / 9) < 1e-9);
  assert.ok(
    chamber.width > node.rect.width,
    "a chamber is bigger than the plate it opens from",
  );
});

test("the interior is entered and left at rest, and is fully open in between", () => {
  const pass = excursion.portals[0];
  assert.ok(pass !== undefined);
  assert.equal(portalAt(pass, pass.enterFrame), 0);
  assert.equal(portalAt(pass, pass.enterFrame + pass.enterFrames), 1);
  assert.equal(portalAt(pass, pass.exitFrame), 1);
  assert.equal(portalAt(pass, pass.exitFrame + pass.exitFrames), 0);
  assert.equal(portalAt(pass, pass.exitFrame + pass.exitFrames + 60), 0);

  // Monotone in, held, monotone out — no wobble anywhere.
  let previous = 0;
  for (
    let frame = pass.enterFrame;
    frame <= pass.enterFrame + pass.enterFrames;
    frame += 1
  ) {
    const value = portalAt(pass, frame);
    assert.ok(value >= previous - 1e-9, `portal went backwards at ${frame}`);
    previous = value;
  }
  for (
    let frame = pass.enterFrame + pass.enterFrames;
    frame <= pass.exitFrame;
    frame += 1
  ) {
    assert.equal(portalAt(pass, frame), 1);
  }
});

test("coming out lands on the entity that was entered, before going anywhere else", () => {
  const exit = excursion.shots.find((shot) => shot.kind === "exit");
  assert.ok(exit !== undefined);
  const back = fitTo(rectOf(laid, "speech"), laid.bounds, { widest: CAMERA.widest });
  assert.deepEqual(exit.view, back);

  // And the cue that closed it is framed only after the retreat and the beat that follows it.
  const after = excursion.track.find((key) => key.frame > exit.frame);
  assert.ok(after !== undefined);
  assert.equal(after.frame, exit.frame + CAMERA.exitTravel + CAMERA.returnHold);
});

/* --------------------------------------------- landing before something that is not a shot */

test("a composed arrival wants the subject in the middle, not merely on screen", () => {
  const subject = rectOf(laid, "state");
  const composed = fitTo(subject, laid.bounds, { widest: CAMERA.widest });
  assert.equal(composedShot(composed, subject, laid.bounds).kind, "hold");

  // A shot that keeps the subject comfortably inside the frame — one `shotFor` is happy to hold
  // — is not the shot to expand or to pull back from.
  const drifted = { ...composed, cx: composed.cx + composed.width * 0.12 };
  assert.equal(shotFor(drifted, subject, laid.bounds).kind, "hold");
  const arrival = composedShot(drifted, subject, laid.bounds);
  assert.equal(arrival.kind, "arrive");
  assert.deepEqual(arrival.view, composed);
});

test("the portal opens on a composed shot of the plate, after a beat on it", () => {
  // The camera starts on the whole world, so the concept it is about to enter is across the map.
  const pass = excursion.portals[0];
  assert.ok(pass !== undefined);
  const node = laid.byId.get("speech");
  assert.ok(node !== undefined);

  const at = cameraAt(excursion.track, pass.enterFrame);
  const centre = {
    x: node.rect.x + node.rect.width / 2,
    y: node.rect.y + node.rect.height / 2,
  };
  assert.ok(
    Math.abs(centre.x - at.cx) / at.width <= CAMERA.composedOffset,
    "the plate is centred horizontally when the expansion begins",
  );
  assert.ok(
    Math.abs(centre.y - at.cy) / (at.width / (16 / 9)) <= CAMERA.composedOffset,
    "and vertically",
  );

  // And it was standing there before it started: the approach lands, then the frame holds.
  const approach = excursion.track.filter((key) => key.frame < pass.enterFrame).at(-1);
  assert.ok(approach !== undefined);
  assert.equal(pass.enterFrame - (approach.frame + approach.travel), CAMERA.settle);
});

test("the chamber opens about the shot, so the camera only changes scale", () => {
  const pass = excursion.portals[0];
  assert.ok(pass !== undefined);
  const at = cameraAt(excursion.track, pass.enterFrame);
  assert.ok(Math.abs(pass.chamber.x + pass.chamber.width / 2 - at.cx) < 0.5);
  assert.ok(Math.abs(pass.chamber.y + pass.chamber.height / 2 - at.cy) < 0.5);
});

test("the last entity nothing leaves is composed, and the reveal waits for it to land", () => {
  const arriving = cameraPlan(
    laid,
    [
      { frame: 100, id: "state" },
      { frame: 200, id: "remotion" },
      { frame: 240, id: "video" },
    ],
    { from: 0, until: 250 },
  );

  const last = arriving.shots.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.id, "video");
  assert.equal(last.kind, "arrive", "the world's product gets a shot of its own");
  assert.deepEqual(
    last.view,
    fitTo(rectOf(laid, "video"), laid.bounds, { widest: CAMERA.widest }),
  );

  // The reveal was due at 250, which is before the arrival has even finished moving.
  const reveal = arriving.track.at(-1);
  const arrival = arriving.track.at(-2);
  assert.ok(reveal !== undefined && arrival !== undefined);
  assert.equal(reveal.frame, arrival.frame + arrival.travel + CAMERA.settle);
  assert.ok(reveal.frame > 250, "and it waited rather than cutting the arrival off");
});

test("a terminal entity reached mid-traversal is framed like anything else", () => {
  // The rule is about what comes *next*, not about which entity it is: reaching the product and
  // then carrying on talking about something else is an ordinary shot.
  const passing = cameraPlan(
    laid,
    [
      { frame: 100, id: "video" },
      { frame: 200, id: "source" },
    ],
    { from: 0, until: 400 },
  );
  assert.ok(passing.shots.every((shot) => shot.kind !== "arrive"));
  assert.equal(passing.track.at(-1)?.frame, 400, "and the reveal is not delayed");
});

test("a world with no interiors plans exactly as it did before they existed", () => {
  // Backward compatibility, stated as an identity rather than as a promise.
  const withInside = cameraPlan(
    laid,
    EVENTS.map((event) => ({ ...event })),
    SPAN,
  );
  assert.deepEqual(withInside.track, track);
  assert.deepEqual(withInside.portals, []);
});

test("the viewport becomes one transform, and the world's centre lands in the frame's", () => {
  const view = { cx: 1000, cy: 500, width: 3840 };
  const put = viewportTransform(view, { width: 1920, height: 1080 });
  assert.equal(put.scale, 0.5);
  assert.equal(put.x + view.cx * put.scale, 960);
  assert.equal(put.y + view.cy * put.scale, 540);

  // A parallax layer is the same arithmetic at a fraction of the rate, so it stays registered
  // on the frame's centre while moving less than the world does.
  const behind = viewportTransform(view, { width: 1920, height: 1080 }, 0.5);
  assert.equal(behind.scale, 0.25);
  assert.equal(behind.x + view.cx * behind.scale, 960);
});

test("the timing curve leaves and arrives at rest", () => {
  assert.equal(smootherstep(0), 0);
  assert.equal(smootherstep(1), 1);
  assert.equal(smootherstep(-3), 0);
  assert.equal(smootherstep(4), 1);
  assert.ok(Math.abs(smootherstep(0.5) - 0.5) < 1e-9);
  // No overshoot anywhere: a camera that springs past its subject reads as a plugin.
  for (let t = 0; t <= 1; t += 0.01) {
    const value = smootherstep(t);
    assert.ok(value >= 0 && value <= 1);
  }
});
