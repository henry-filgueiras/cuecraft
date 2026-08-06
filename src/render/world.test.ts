import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAMERA,
  cameraAt,
  cameraTrack,
  fitTo,
  layoutWorld,
  plateSize,
  smootherstep,
  targetBounds,
  union,
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

test("a label is broken to the plate measure, and nothing is dropped", () => {
  assert.deepEqual(wrapLabel("Speech, measured here", 12), [
    "Speech,",
    "measured",
    "here",
  ]);
  assert.deepEqual(wrapLabel("Remotion", 12), ["Remotion"]);
  // A word longer than the measure gets its own line rather than being cut.
  assert.deepEqual(wrapLabel("Indistinguishable from", 12), [
    "Indistinguishable",
    "from",
  ]);
  assert.equal(wrapLabel("a b c", 12).join(" "), "a b c");
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
const track = cameraTrack(laid, EVENTS, SPAN);

test("the track opens on the whole world and closes on it again", () => {
  assert.equal(track.length, EVENTS.length + 2);
  const whole = fitTo(laid.bounds, laid.bounds, { pad: CAMERA.revealPad });
  assert.deepEqual(track[0]?.view, whole);
  assert.deepEqual(track.at(-1)?.view, whole);
  assert.equal(track.at(-1)?.frame, SPAN.until);
});

test("each stop begins at the frame the narration reached its entity", () => {
  assert.deepEqual(
    track.slice(1, -1).map((key) => key.frame),
    EVENTS.map((event) => event.frame),
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
  const far = cameraTrack(laid, [{ frame: 100, id: "video" }], { from: 0, until: 900 });
  const near = cameraTrack(laid, [{ frame: 100, id: "source" }], { from: 0, until: 900 });
  assert.ok((far[1]?.travel ?? 0) >= (near[1]?.travel ?? 0));
});

test("events are ordered by frame, whatever order they arrive in", () => {
  const shuffled = cameraTrack(laid, [...EVENTS].reverse(), SPAN);
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

  // And having arrived, it holds until the next stop.
  assert.deepEqual(cameraAt(track, key.frame + key.travel + 20), cameraAt(track, 199));
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
