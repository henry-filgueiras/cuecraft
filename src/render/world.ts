import dagre from "@dagrejs/dagre";
import { interpolateZoom } from "d3-interpolate";

import type { SlideBody } from "../presentation/body.ts";
import type { AuthoredEntity, AuthoredRelation } from "../presentation/world.ts";
import { WORLD } from "./theme.ts";

/**
 * Where a semantic world sits, and where the camera looks.
 *
 * Two derivations, in one module because the second is a function of the first and neither is a
 * function of anything the author wrote.
 *
 *     entities + relations  ->  layout        (dagre, once, for the whole world)
 *     layout + anchors      ->  camera keys   (a viewport per narration event)
 *     camera keys + frame   ->  viewport      (a smooth path between two of them)
 *
 * **Once** is the load-bearing word in the first line. The world is laid out one time, in its own
 * coordinates, and never again; every frame of the scene reads the same positions. That is what
 * makes the thing on screen a place rather than a sequence of diagrams — when the camera moves
 * from one concept to another, the viewer is moving through a space that was already there.
 * Re-running layout per cue would produce the same pictures and none of the meaning.
 *
 * Two mature libraries do the parts that are genuinely hard and genuinely solved. **dagre** does
 * layered graph layout: rank assignment, crossing reduction, coordinate assignment and edge
 * routing, deterministically and offline. **d3-interpolate**'s `interpolateZoom` does the camera
 * path — Van Wijk and Nuij's smooth-and-efficient zooming, which is the published answer to
 * "move a viewport between two rectangles without making anyone seasick". Both are small, both
 * are pure, and neither is anything cuecraft should be writing itself (decision:5).
 *
 * Plain TypeScript, no Remotion import, so the whole of the geometry is unit-testable without a
 * browser — the same constraint `layout.ts`, `anchor.ts` and `projection.ts` work under.
 *
 * Nothing in here is reachable from the source. The author writes what exists and what relates
 * to what; every number below is derived from that plus the viewport.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Top-left origin, like every rectangle in a browser. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WorldNode {
  readonly id: string;
  readonly label: string;
  /** The label, broken to the measure a node plate is set at. */
  readonly lines: readonly string[];
  readonly rect: Rect;
  /**
   * How far along the flow this entity sits, 0 at the world's left edge and 1 at its right.
   *
   * Derived from the position dagre gave it, which for a layered layout is its rank. It carries
   * the world's colour: entities the machine reads are cool, entities it produces are warm, and
   * the ramp between them is the machine working. No author picks a colour, and none picks a
   * category either — the graph already said which end of it a thing is on.
   */
  readonly depth: number;
  /** No relation leaves it. The world's product, and the only solid object in it. */
  readonly terminal: boolean;
}

export interface WorldEdge {
  readonly from: string;
  readonly to: string;
  /** dagre's routing, pulled back to the two plates it joins. */
  readonly points: readonly Point[];
  /** An SVG path in world coordinates, smoothed through those points. */
  readonly path: string;
  /** Close enough for a dash pattern to travel along it at an even rate. */
  readonly length: number;
}

export interface WorldLayout {
  readonly nodes: readonly WorldNode[];
  readonly edges: readonly WorldEdge[];
  /** Everything, including the parts of edges that bow outside their endpoints. */
  readonly bounds: Rect;
  readonly byId: ReadonlyMap<string, WorldNode>;
  /** Both directions: a relation connects both of its ends. */
  readonly neighbours: ReadonlyMap<string, readonly string[]>;
}

/**
 * Break a label to the measure a node plate is set at.
 *
 * Greedy rather than balanced, and character-counted rather than measured, for the reason
 * `headingLines` estimates instead of measuring: composition has to resolve without a browser.
 * A label that will not fit in two lines gets a third; nothing is truncated, because a world
 * whose entities are unnamed is not explaining anything.
 */
export function wrapLabel(label: string, measure: number = WORLD.measure): string[] {
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (candidate.length > measure && line !== "") {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines.length === 0 ? [label] : lines;
}

/** A node plate, sized to the label it holds. Authors do not set sizes (decision:10). */
export function plateSize(lines: readonly string[]): { width: number; height: number } {
  const longest = Math.max(...lines.map((line) => line.length), 1);
  return {
    width: Math.max(
      WORLD.minPlateWidth,
      Math.round(longest * WORLD.label * WORLD.charWidth) + 2 * WORLD.padX,
    ),
    height: Math.round(lines.length * WORLD.label * WORLD.lineHeight) + 2 * WORLD.padY,
  };
}

/**
 * Lay the world out. Deterministic: the same world always produces the same coordinates.
 *
 * `rankdir` is left-to-right because the worlds this composition exists for are transformations,
 * and a transformation reads along the axis text does. That is the only thing here that could be
 * called an aesthetic choice; the rest is dagre's.
 */
export function layoutWorld(world: {
  readonly entities: readonly AuthoredEntity[];
  readonly relations: readonly AuthoredRelation[];
}): WorldLayout {
  const graph = new dagre.graphlib.Graph({ directed: true, multigraph: false });
  graph.setGraph({
    rankdir: "LR",
    ranksep: WORLD.ranksep,
    nodesep: WORLD.nodesep,
    edgesep: WORLD.edgesep,
    marginx: 0,
    marginy: 0,
    ranker: "network-simplex",
  });
  graph.setDefaultEdgeLabel(() => ({}));

  const wrapped = new Map<string, string[]>();
  for (const entity of world.entities) {
    const lines = wrapLabel(entity.text);
    wrapped.set(entity.id, lines);
    graph.setNode(entity.id, { ...plateSize(lines) });
  }
  for (const relation of world.relations) {
    graph.setEdge(relation.from, relation.to);
  }

  dagre.layout(graph);

  const raw = world.entities.map((entity) => {
    const node = graph.node(entity.id) as {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    return {
      entity,
      lines: wrapped.get(entity.id) ?? [entity.text],
      rect: {
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
        width: node.width,
        height: node.height,
      },
      centreX: node.x,
    };
  });

  const leaving = new Set(world.relations.map((relation) => relation.from));
  const centres = raw.map((item) => item.centreX);
  const first = Math.min(...centres);
  const last = Math.max(...centres);
  const span = last - first;

  const nodes: WorldNode[] = raw.map((item) => ({
    id: item.entity.id,
    label: item.entity.text,
    lines: item.lines,
    rect: item.rect,
    depth: span === 0 ? 0 : (item.centreX - first) / span,
    terminal: !leaving.has(item.entity.id),
  }));

  const edges: WorldEdge[] = world.relations.map((relation) => {
    const routed = graph.edge(relation.from, relation.to) as { points: Point[] };
    const points = trimToPlates(
      routed.points,
      nodes.find((node) => node.id === relation.from),
      nodes.find((node) => node.id === relation.to),
    );
    return {
      from: relation.from,
      to: relation.to,
      points,
      path: smoothPath(points),
      length: polylineLength(points),
    };
  });

  // Edge points as well as plates: a relation that bows around an intervening rank reaches
  // outside both of its endpoints, and a world whose bounds cut through one of its own edges
  // would clip that edge off the final reveal.
  const bounds = union([
    ...nodes.map((node) => node.rect),
    ...edges.flatMap((edge) =>
      edge.points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })),
    ),
  ]);

  return {
    nodes,
    edges,
    bounds,
    byId: new Map(nodes.map((node) => [node.id, node])),
    neighbours: adjacency(world.relations, nodes),
  };
}

/**
 * Pull an edge's ends back to the plates it joins.
 *
 * dagre routes to node centres, so an undisturbed path runs underneath both plates. Everything
 * about the drawing wants the edge to *start at an edge* — the dash that travels along it, the
 * arrow head, and the eye following it — so the first and last points are moved to where the
 * polyline crosses the plate boundary.
 */
function trimToPlates(
  points: readonly Point[],
  from: WorldNode | undefined,
  to: WorldNode | undefined,
): Point[] {
  const trimmed = [...points];
  if (from !== undefined && trimmed.length >= 2) {
    trimmed[0] = exitPoint(from.rect, trimmed[1] as Point);
  }
  if (to !== undefined && trimmed.length >= 2) {
    trimmed[trimmed.length - 1] = exitPoint(
      to.rect,
      trimmed[trimmed.length - 2] as Point,
    );
  }
  return trimmed;
}

/** Where the segment from a plate's centre towards `towards` leaves the plate. */
function exitPoint(rect: Rect, towards: Point): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = towards.x - cx;
  const dy = towards.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const scaleX = dx === 0 ? Infinity : rect.width / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Infinity : rect.height / 2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/**
 * A path through the routing points, rounded at the bends.
 *
 * Quadratic segments through the midpoints of the polyline, which is the standard way to round a
 * polyline without moving its ends: the curve passes through every midpoint and uses the original
 * vertices as controls, so a straight run stays straight and a corner becomes an arc.
 */
function smoothPath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  if (first === undefined) return "";
  if (rest.length === 0) return `M ${round(first.x)} ${round(first.y)}`;
  if (rest.length === 1) {
    const only = rest[0] as Point;
    return `M ${round(first.x)} ${round(first.y)} L ${round(only.x)} ${round(only.y)}`;
  }

  let d = `M ${round(first.x)} ${round(first.y)}`;
  for (let index = 0; index < points.length - 2; index += 1) {
    const control = points[index + 1] as Point;
    const next = points[index + 2] as Point;
    const midX = (control.x + next.x) / 2;
    const midY = (control.y + next.y) / 2;
    d += ` Q ${round(control.x)} ${round(control.y)} ${round(midX)} ${round(midY)}`;
  }
  const end = points[points.length - 1] as Point;
  return `${d} L ${round(end.x)} ${round(end.y)}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function polylineLength(points: readonly Point[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] as Point;
    const current = points[index] as Point;
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
  }
  return total;
}

function adjacency(
  relations: readonly AuthoredRelation[],
  nodes: readonly WorldNode[],
): Map<string, string[]> {
  const map = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  for (const relation of relations) {
    map.get(relation.from)?.push(relation.to);
    map.get(relation.to)?.push(relation.from);
  }
  return map;
}

export function union(rects: readonly Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/* ------------------------------------------------------------------ camera */

/**
 * What the camera is looking at: a centre, and how much world fits across the frame.
 *
 * Width rather than a zoom factor, because that is the coordinate `interpolateZoom` works in and
 * because it is the quantity that means something — "this much of the world is on screen".
 */
export interface Viewport {
  readonly cx: number;
  readonly cy: number;
  readonly width: number;
}

export const CAMERA = {
  /** Breathing room around whatever is being framed, as a fraction of the framed size. */
  pad: 0.34,
  /**
   * Breathing room for the reveal, which gets almost none.
   *
   * A travelling shot is padded so its subject sits in space; the wide shot's subject *is* the
   * space, and every percent of padding is a percent smaller the labels come out in the one frame
   * that has to be read whole.
   */
  revealPad: 0.06,
  /** Closest the camera will ever come. Below this a single plate fills the frame. */
  nearest: 1250,
  /**
   * Widest a *travelling* shot is allowed to be. The whole-world reveal is exempt: it is the one
   * shot that is supposed to be wider than anything the traversal showed.
   */
  widest: 3100,
  /** Frames a move may take, before the gap to the next cue is allowed to shorten it. */
  minTravel: 22,
  maxTravel: 46,
  /** The reveal is slower than any move inside the world, and deliberately so. */
  revealTravel: 130,
  /**
   * `interpolateZoom` reports a recommended duration for the path it found. Scaled into frames,
   * it makes a short hop brisk and a long traversal unhurried without anyone choosing either.
   */
  paceMsPerFrame: 26,
  /** How far outside the world the centre may wander, as a fraction of the viewport. */
  slack: 0.3,
} as const;

/**
 * The bounds a narration event wants on screen.
 *
 * The rule is one sentence: **frame the entity the narration just reached, plus as much of the
 * context it connects to as will fit without losing it.** Established neighbours are taken
 * nearest-first and stop being taken when the shot would get wider than `CAMERA.widest`, so a
 * concept with one predecessor gets a two-shot of the relationship, and a junction with four
 * does not accidentally become the final reveal an act early.
 *
 * Only *established* neighbours count. A relation to something the narration has not reached yet
 * is not context, it is a spoiler.
 */
export function targetBounds(
  layout: WorldLayout,
  hotId: string,
  established: ReadonlySet<string>,
): Rect {
  const hot = layout.byId.get(hotId);
  if (hot === undefined) return layout.bounds;

  const centre = centreOf(hot.rect);
  const context = (layout.neighbours.get(hotId) ?? [])
    .filter((id) => id !== hotId && established.has(id))
    .map((id) => layout.byId.get(id))
    .filter((node): node is WorldNode => node !== undefined)
    .sort(
      (a, b) => distance(centre, centreOf(a.rect)) - distance(centre, centreOf(b.rect)),
    );

  let bounds = hot.rect;
  for (const node of context) {
    const widened = union([bounds, node.rect]);
    if (fitWidth(widened) > CAMERA.widest) break;
    bounds = widened;
  }
  return bounds;
}

function centreOf(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** How wide a viewport has to be to hold these bounds at this aspect, with padding. */
function fitWidth(
  bounds: Rect,
  aspect: number = 16 / 9,
  pad: number = CAMERA.pad,
): number {
  const padded = 1 + 2 * pad;
  return Math.max(bounds.width * padded, bounds.height * padded * aspect);
}

/**
 * Turn bounds into a viewport: fit, clamp the magnification, then clamp the centre.
 *
 * The centre clamp is what keeps the camera honest. Framing a plate at the far edge of the world
 * would otherwise put half the frame outside the world entirely, and empty space at the edge of a
 * space reads as a mistake rather than as an edge. `slack` allows a little of it, because none at
 * all makes the edge plates look pinned to the frame.
 */
export function fitTo(
  bounds: Rect,
  world: Rect,
  options: {
    readonly widest?: number;
    readonly aspect?: number;
    readonly pad?: number;
  } = {},
): Viewport {
  const aspect = options.aspect ?? 16 / 9;
  const widest = options.widest ?? Infinity;
  const pad = options.pad ?? CAMERA.pad;
  const wholeWorld = fitWidth(world, aspect, CAMERA.revealPad);

  const width = Math.min(
    Math.max(fitWidth(bounds, aspect, pad), CAMERA.nearest),
    Math.max(Math.min(widest, wholeWorld), CAMERA.nearest),
  );
  const height = width / aspect;

  const centre = centreOf(bounds);
  return {
    cx: clampCentre(centre.x, world.x, world.x + world.width, width),
    cy: clampCentre(centre.y, world.y, world.y + world.height, height),
    width,
  };
}

function clampCentre(value: number, low: number, high: number, extent: number): number {
  const slack = extent * CAMERA.slack;
  const min = low - slack + extent / 2;
  const max = high + slack - extent / 2;
  if (min > max) return (low + high) / 2;
  return Math.min(Math.max(value, min), max);
}

/** One camera move: where it ends, when it starts, and how long it takes to get there. */
export interface CameraKey {
  readonly frame: number;
  readonly view: Viewport;
  readonly travel: number;
}

export interface CameraEvent {
  readonly frame: number;
  readonly id: string;
}

/**
 * The whole camera track, derived from the narration's own events.
 *
 * The shape of the sequence is not authored anywhere and is not configurable:
 *
 *     the whole world  ->  entity, entity, entity ...  ->  the whole world
 *
 * It opens wide because before the first word there is no reason to be anywhere in particular,
 * and it ends wide because when the narration stops there is nothing left to frame but all of it.
 * The final reveal is therefore *derived from the absence of further narration* — the author asks
 * for it by writing a `post_say` long enough to hold it, which is a duration, not a camera move.
 */
export function cameraTrack(
  layout: WorldLayout,
  events: readonly CameraEvent[],
  span: { readonly from: number; readonly until: number },
  aspect: number = 16 / 9,
): CameraKey[] {
  const whole = fitTo(layout.bounds, layout.bounds, { aspect, pad: CAMERA.revealPad });
  const ordered = [...events].sort((a, b) => a.frame - b.frame);

  const established = new Set<string>();
  const stops: { frame: number; view: Viewport }[] = [{ frame: span.from, view: whole }];
  for (const event of ordered) {
    const bounds = targetBounds(layout, event.id, established);
    established.add(event.id);
    stops.push({
      frame: Math.max(event.frame, span.from),
      view: fitTo(bounds, layout.bounds, { aspect, widest: CAMERA.widest }),
    });
  }
  stops.push({ frame: Math.max(span.until, span.from), view: whole });

  return stops.map((stop, index) => {
    if (index === 0) return { ...stop, travel: 1 };
    const previous = stops[index - 1] as { frame: number; view: Viewport };
    const next = stops[index + 1];
    const gap = next === undefined ? Infinity : Math.max(1, next.frame - stop.frame);
    const isReveal = index === stops.length - 1;
    const suggested = isReveal
      ? CAMERA.revealTravel
      : paceOf(previous.view, stop.view, CAMERA.minTravel, CAMERA.maxTravel);
    return { ...stop, travel: Math.max(1, Math.min(suggested, gap)) };
  });
}

/**
 * How long a move should take, asked of the thing that found the path.
 *
 * `interpolateZoom` reports the duration its own path would want at a constant perceived
 * velocity. Dividing by a constant turns that into frames: a hop between neighbours comes out
 * brisk, a traversal across the world comes out unhurried, and no one chose either number.
 */
function paceOf(from: Viewport, to: Viewport, low: number, high: number): number {
  const interpolator = interpolateZoom(
    [from.cx, from.cy, from.width],
    [to.cx, to.cy, to.width],
  );
  const frames = Math.round(interpolator.duration / CAMERA.paceMsPerFrame);
  return Math.min(Math.max(frames, low), high);
}

/**
 * Where the camera is on this frame.
 *
 * The path between two stops is `interpolateZoom`'s; the *timing* along it is smootherstep,
 * Perlin's second-order smooth step, which has zero first and second derivative at both ends.
 * A camera that starts and stops with zero acceleration reads as a camera operator; anything
 * with an overshoot reads as a plugin.
 */
export function cameraAt(track: readonly CameraKey[], frame: number): Viewport {
  const first = track[0];
  if (first === undefined) return { cx: 0, cy: 0, width: 1 };

  let index = 0;
  for (let candidate = 0; candidate < track.length; candidate += 1) {
    if ((track[candidate] as CameraKey).frame <= frame) index = candidate;
  }

  const key = track[index] as CameraKey;
  if (index === 0) return key.view;

  const previous = (track[index - 1] as CameraKey).view;
  const progress = smootherstep((frame - key.frame) / key.travel);
  const [cx, cy, width] = interpolateZoom(
    [previous.cx, previous.cy, previous.width],
    [key.view.cx, key.view.cy, key.view.width],
  )(progress);
  return { cx, cy, width };
}

/**
 * The viewport, as the one CSS transform that puts the world behind it.
 *
 * World point `p` lands at `(p - centre) * scale + half the frame`, which composes to a single
 * `translate` then `scale` about the origin. Here rather than inline in the composition because
 * it is the step where a sign error is invisible in code and obvious on screen, and because the
 * `parallax` factor — the background field moving at a fraction of the rate — has to be the same
 * arithmetic or the two layers drift apart.
 */
export function viewportTransform(
  view: Viewport,
  frame: { readonly width: number; readonly height: number },
  parallax: number = 1,
): { readonly scale: number; readonly x: number; readonly y: number } {
  const scale = (frame.width / view.width) * parallax;
  return {
    scale,
    x: frame.width / 2 - view.cx * scale,
    y: frame.height / 2 - view.cy * scale,
  };
}

export function smootherstep(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** The world of a slide body, or nothing if the slide is not one. */
export function worldOf(
  body: SlideBody,
):
  | { entities: readonly AuthoredEntity[]; relations: readonly AuthoredRelation[] }
  | undefined {
  return body.kind === "world"
    ? { entities: body.entities, relations: body.relations }
    : undefined;
}
