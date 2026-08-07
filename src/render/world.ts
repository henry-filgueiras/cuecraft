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
 * Break a label into the lines a plate should hold.
 *
 * v1 wrapped greedily at a fixed twelve characters, and it showed. "What narration can reach"
 * came out `What / narration / can reach` — three lines, the longest of them nine characters,
 * in a plate at the minimum width with the text jammed against a ragged right edge. The label
 * was not laid out; it was survived.
 *
 * So the wrap is chosen rather than fallen into. For one, two and three lines, this finds the
 * *balanced* break — the smallest maximum line length that fits in that many lines — and then
 * picks whichever of the three makes the better plate, scored on two things a designer would
 * actually look at:
 *
 *     proportion   how close the resulting plate is to the shape a plate wants to be
 *     simplicity   fewer lines, all else equal
 *
 * "What narration can reach" now comes out `What narration / can reach`: two lines, balanced,
 * in a plate close to 2.3:1. Nothing about the label was changed to get there.
 *
 * Character counts rather than measured text, for the reason `headingLines` estimates: layout
 * has to resolve without a browser, and monospaced-in-the-aggregate is close enough to predict a
 * break in a twenty-character label.
 */
export function wrapLabel(label: string, maxLines: number = WORLD.maxLines): string[] {
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [label];

  let best: { lines: string[]; score: number } | undefined;
  for (let lines = 1; lines <= Math.min(maxLines, words.length); lines += 1) {
    const broken = balance(words, lines);
    // A break that could not be achieved in this many lines is not a candidate for it.
    if (broken.length !== lines) continue;
    const plate = plateSize(broken);
    const proportion = Math.abs(plate.width / plate.height - WORLD.plateAspect);
    const score = proportion + WORLD.linePenalty * (lines - 1);
    if (best === undefined || score < best.score) best = { lines: broken, score };
  }
  return best?.lines ?? [words.join(" ")];
}

/**
 * The balanced break into exactly `lines` lines: the smallest longest-line that fits.
 *
 * Searched rather than computed, because the search space is a label's length and the answer is
 * exact. Greedy filling at a given measure is monotone in the measure, so the smallest measure
 * that yields few enough lines is the balanced one.
 */
function balance(words: readonly string[], lines: number): string[] {
  const longestWord = Math.max(...words.map((word) => word.length));
  const total = words.join(" ").length;
  for (
    let measure = Math.max(longestWord, Math.ceil(total / lines));
    measure <= total;
    measure += 1
  ) {
    const broken = greedy(words, measure);
    if (broken.length <= lines) return broken;
  }
  return [words.join(" ")];
}

function greedy(words: readonly string[], measure: number): string[] {
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
  return lines;
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
  revealPad: 0.035,
  /** Closest the camera will ever come. Below this a single plate fills the frame. */
  nearest: 1250,
  /**
   * Widest a *travelling* shot is allowed to be. The whole-world reveal is exempt: it is the one
   * shot that is supposed to be wider than anything the traversal showed.
   */
  widest: 2600,
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

  /* ---- what a move has to be worth, before it is made at all ---- */

  /**
   * A shot is kept if every target sits at least this far inside it, as a fraction of the frame.
   *
   * Measured, not guessed. Across v1's eleven moves the smallest comfortable margin on a shot
   * that plainly did not need recomposing was 0.18, and the tightest shot that plainly *did* was
   * clipping at -0.006. Anything in between is a judgement call, and the threshold sits nearer
   * the clipping end because a target touching the frame edge looks like an accident.
   */
  holdMargin: 0.045,
  /**
   * ...and only if the subject is at least this much of the frame.
   *
   * The whole-world opening shot contains every target perfectly and is the wrong shot for all of
   * them, because at that scale a plate is nine percent of the frame. Containment alone would
   * have held it and never dived in.
   */
  holdOccupancy: 0.21,
  /** A pan keeps the scale if the subject fits inside the frame with this much room. */
  panMargin: 0.06,
  /**
   * Beyond this, a pan across the world is not a small move and pretending otherwise is worse
   * than recomposing honestly: a long sideways slide at close range is the most nauseating shot
   * available.
   */
  maxPan: 1.15,

  /* ---- going inside something ---- */

  /**
   * How much world a chamber spans. The interior is drawn as a 1920x1080 composition scaled into
   * this, so at the portal shot it lands at roughly one composition pixel per screen pixel.
   */
  chamberWidth: 2400,
  /**
   * The chamber is framed almost exactly, so its border sits just inside the frame edge.
   *
   * That is the entire trick of the transition: the plate's own outline arrives at the edge of
   * the picture and stops there, and the viewer reads the frame as the inside of the node.
   */
  chamberPad: 0.008,
  /**
   * How long it takes to go in, and to come back out.
   *
   * Constants rather than derivations, like `revealTravel` and for the same reason: neither is a
   * traversal. A move between two concepts is paced by the distance between them because that is
   * what makes it feel like distance; going inside one covers no distance at all, and its
   * duration is a directorial choice about how long a threshold should take to cross.
   *
   * The exit is quicker than the entry. Opening something is an arrival and wants to be savoured;
   * closing it is a departure, and a slow one reads as reluctance.
   */
  enterTravel: 44,
  exitTravel: 30,
  /**
   * A beat on the way out, before the camera goes anywhere else.
   *
   * Without it the retreat runs straight into the next traversal and the node the viewer just
   * came out of is never actually seen back in its place — which is the only thing that tells
   * them where they have returned to. Six tenths of a second is enough to land it.
   */
  returnHold: 20,

  /* ---- landing on a subject, before something that is not a framing decision ---- */

  /**
   * A beat between arriving on a subject and the operation that consumes it.
   *
   * Two moments in a traversal are not followed by another shot: going *inside* a concept, and
   * pulling back off the last one. Running either straight out of the approach reads as one
   * continuous gesture — "scale this rectangle from wherever it happens to be" — rather than as
   * two things, and the composition the approach just found is never actually seen. Four tenths
   * of a second is the shortest hold that registers as a hold.
   */
  settle: 12,
  /**
   * How far off centre a subject may already sit and still count as composed, as a fraction of
   * the frame, and how far off the scale may be, as a fraction of the composed width.
   *
   * This is the hold policy again, at a tighter tolerance and against a different question.
   * `shotFor` asks "can the viewer see it?", which is the right question for a shot that is about
   * to be replaced by another shot. A composed arrival asks "is this the shot?", because what
   * follows it is a scale transition or a reveal, and both of those are read against the frame's
   * centre. So the test is proximity to the canonical framing rather than mere containment —
   * still a reason to move rather than an obligation, just a stricter one.
   */
  composedOffset: 0.05,
  composedScale: 0.15,
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
  /**
   * The entity this event happens inside, if any.
   *
   * Set both when the event reaches an element within an interior and when it reaches an entity
   * that *has* one — because "the narration turned to this concept, and this concept has an
   * inside" is the same request as "the narration turned to something in there".
   */
  readonly inside?: string;
}

/** What the camera decided to do about one narration event, and why it is describable. */
export type ShotKind = "hold" | "pan" | "recompose" | "enter" | "exit" | "arrive";

export interface CameraShot {
  readonly frame: number;
  readonly id: string;
  readonly kind: ShotKind;
  readonly view: Viewport;
}

/**
 * Whether the shot the camera is already holding is good enough for what was just said.
 *
 * This is the whole of decision:24, and it is three comparisons rather than an optimiser. The
 * measurement that motivated it is in the decision: of v1's eleven moves, one recomposed a target
 * that was already fully visible with comfortable margin, and three more zoomed by ten to
 * twenty-five percent to fix a framing nobody would have complained about. Each was individually
 * correct and the sequence was restless, because every shot was solved from scratch as though the
 * viewer had not been looking at anything a moment earlier.
 *
 *     hold        the target is already inside the frame, with room, at a readable size
 *     pan         it fits at this scale but not in this position — keep the scale, move the least
 *     recompose   it does not fit, or it is too small to read: solve the shot properly
 *
 * The ordering is the preference ladder, and the reason it is a ladder rather than a cost
 * function is that the three cases are perceptually different rather than differently weighted.
 * A hold costs the viewer nothing. A pan costs them tracking. A recompose costs them
 * re-orientation, and re-orientation is the one that reads as the camera being nervous.
 */
export function shotFor(
  current: Viewport,
  bounds: Rect,
  world: Rect,
  aspect: number = 16 / 9,
): { readonly view: Viewport; readonly kind: "hold" | "pan" | "recompose" } {
  const held = viewRect(current, aspect);

  if (
    marginOf(bounds, held) >= CAMERA.holdMargin &&
    occupancyOf(bounds, held) >= CAMERA.holdOccupancy
  ) {
    return { view: current, kind: "hold" };
  }

  // Would it fit where we are standing, if we simply looked somewhere else?
  const room = 1 - 2 * CAMERA.panMargin;
  const fitsHere =
    bounds.width <= held.width * room && bounds.height <= held.height * room;
  if (fitsHere && occupancyOf(bounds, held) >= CAMERA.holdOccupancy) {
    const panned: Viewport = {
      cx: slideInto(current.cx, bounds.x, bounds.width, held.width),
      cy: slideInto(current.cy, bounds.y, bounds.height, held.height),
      width: current.width,
    };
    const distanceMoved =
      Math.hypot(panned.cx - current.cx, panned.cy - current.cy) / current.width;
    if (distanceMoved <= CAMERA.maxPan) return { view: panned, kind: "pan" };
  }

  return {
    view: fitTo(bounds, world, { aspect, widest: CAMERA.widest }),
    kind: "recompose",
  };
}

/**
 * The shot a subject gets when what happens next is not another shot.
 *
 * `shotFor` decides between three ways of *continuing* a traversal, and its preference for doing
 * nothing is what makes the camera calm. But twice in a scene the thing after the shot is not a
 * framing decision at all — the camera goes inside the subject, or it pulls back off it — and
 * both of those are read against the centre of the frame. A subject sitting a quarter of the
 * frame off to one side is perfectly visible and completely wrong for either: the expansion
 * becomes "this rectangle grows from over there" instead of "this concept opens", and the pull
 * back leaves from a destination that never landed.
 *
 * So this asks the stricter question — *is this the composition?* rather than *can it be seen?* —
 * and answers it the same way, with a hold when the answer is already yes. Off-centre and
 * off-scale are compared separately because they fail differently: a subject at the right size in
 * the wrong place needs the camera to look elsewhere, and one in the right place at the wrong
 * size needs it to move closer.
 *
 * decision:29 has the measurements that motivated it, both taken off the observatory's own frames.
 */
export function composedShot(
  current: Viewport,
  subject: Rect,
  world: Rect,
  aspect: number = 16 / 9,
): { readonly view: Viewport; readonly kind: "hold" | "arrive" } {
  const composed = fitTo(subject, world, { aspect, widest: CAMERA.widest });
  const offset = Math.max(
    Math.abs(current.cx - composed.cx) / current.width,
    Math.abs(current.cy - composed.cy) / (current.width / aspect),
  );
  const scale = Math.abs(current.width - composed.width) / composed.width;
  return offset <= CAMERA.composedOffset && scale <= CAMERA.composedScale
    ? { view: current, kind: "hold" }
    : { view: composed, kind: "arrive" };
}

/** The rectangle a viewport covers. */
export function viewRect(view: Viewport, aspect: number = 16 / 9): Rect {
  const height = view.width / aspect;
  return {
    x: view.cx - view.width / 2,
    y: view.cy - height / 2,
    width: view.width,
    height,
  };
}

/** The smallest gap between a target and the frame edge, as a fraction of the frame's width. */
export function marginOf(inner: Rect, frame: Rect): number {
  const aspect = frame.width / frame.height;
  return (
    Math.min(
      inner.x - frame.x,
      frame.x + frame.width - (inner.x + inner.width),
      (inner.y - frame.y) * aspect,
      (frame.y + frame.height - (inner.y + inner.height)) * aspect,
    ) / frame.width
  );
}

/** How much of the frame the target takes up, on whichever axis it fills more of. */
export function occupancyOf(inner: Rect, frame: Rect): number {
  return Math.max(inner.width / frame.width, inner.height / frame.height);
}

/** Move a centre the least distance that brings `[low, low + extent]` inside the frame. */
function slideInto(centre: number, low: number, extent: number, frame: number): number {
  const gap = frame * CAMERA.panMargin;
  const min = low + extent - frame / 2 + gap;
  const max = low + frame / 2 - gap;
  if (min > max) return low + extent / 2;
  return Math.min(Math.max(centre, min), max);
}

/**
 * The rectangle an entity opens into.
 *
 * Sixteen by nine, centred by default on the plate's own centre, and that centring is the
 * load-bearing part: the camera also centres on the plate, so through the whole expansion the
 * plate's middle sits at exactly the same place on screen. The thing does not travel and then
 * become something else; it stays where it is and opens.
 *
 * `about` is where the camera will actually be standing when it opens, and it exists for the one
 * case where that is not the plate's centre. A plate at the very edge of the world cannot be
 * centred — `fitTo` clamps the shot so half the frame is not void — so the entry framing settles a
 * little to one side of it. Centring the chamber on the plate anyway would make the camera pan
 * that distance *during* the expansion, and a pan compounded with a scale is exactly what makes
 * one edge of the plate reach the frame edge long before another. Centring it on the shot instead
 * leaves the camera perfectly still: the expansion becomes a pure change of scale, and the plate
 * slides to the middle as it grows, which is the node becoming the viewport rather than a
 * rectangle being enlarged. When the entry shot *is* centred on the plate — which is the ordinary
 * case, and now the case at every portal in both specimens — the two are the same rectangle.
 *
 * Not clamped to the world. A chamber is allowed to extend past the edge of the world, because by
 * the time it has, the world is no longer what is being looked at.
 */
export function chamberFor(
  node: WorldNode,
  aspect: number = 16 / 9,
  about?: Point,
): Rect {
  const centre = about ?? centreOf(node.rect);
  const width = CAMERA.chamberWidth;
  const height = width / aspect;
  return { x: centre.x - width / 2, y: centre.y - height / 2, width, height };
}

/**
 * One excursion inside an entity: when it opens, when it closes, and how long each takes.
 *
 * Nothing here is authored. The interior opens on the first cue that reaches inside the entity
 * and closes on the first cue afterwards that does not — so the author asks for a portal by
 * writing a sentence about something inside a concept, and asks to leave by writing one about
 * something else. The durations are the camera's own travel times for the two moves, which keeps
 * the boundary expanding at exactly the rate the camera approaches.
 */
export interface PortalPass {
  readonly id: string;
  readonly chamber: Rect;
  readonly enterFrame: number;
  readonly enterFrames: number;
  readonly exitFrame: number;
  readonly exitFrames: number;
}

/**
 * An excursion the *narration* asked for, with the frames already decided.
 *
 * The derived rule above is right for an interior narrated from outside: the author writes a
 * sentence about something in there and the portal opens, which is decision:25 and is not being
 * revisited. It is wrong for an interior that narrates itself, twice over. The first cue inside
 * the child is not where the descent begins — the descent begins where the parent stopped
 * talking, which is earlier and is a fact only the narration knows. And the last cue inside the
 * child is not where it ends — a child may finish on a sentence that names nothing at all, and
 * "the next cue that reaches something else" would hold the chamber open across it.
 *
 * So a call arrives here as a schedule rather than as something to infer. The camera's job is
 * then the one it is good at: to be in the right place when the window opens, to spend the
 * window crossing the threshold, and to put the frame back exactly where it found it.
 */
export interface ScheduledCall {
  readonly target: string;
  /** The frame the narration went silent for the descent, and how long it stays silent. */
  readonly enterFrame: number;
  readonly enterWindow: number;
  /** The same, coming back. */
  readonly exitFrame: number;
  readonly exitWindow: number;
}

export interface CameraOptions {
  /** Excursions the narration scheduled, rather than ones this derives. */
  readonly calls?: readonly ScheduledCall[];
  /**
   * How long the closing pull back takes.
   *
   * A constant everywhere except inside a scope, where the pull back has to finish before the
   * chamber around it starts contracting — so it borrows the length of the exit it is part of.
   */
  readonly revealTravel?: number;
}

/** How far inside an entity the camera is on a given frame, 0 to 1. */
export function portalAt(pass: PortalPass, frame: number): number {
  if (frame <= pass.enterFrame) return 0;
  if (frame < pass.enterFrame + pass.enterFrames) {
    return smootherstep((frame - pass.enterFrame) / pass.enterFrames);
  }
  if (frame <= pass.exitFrame) return 1;
  if (frame < pass.exitFrame + pass.exitFrames) {
    return 1 - smootherstep((frame - pass.exitFrame) / pass.exitFrames);
  }
  return 0;
}

/**
 * The whole camera plan, derived from the narration's own events.
 *
 * The shape of the sequence is not authored anywhere and is not configurable:
 *
 *     the whole world  ->  entity, entity, entity ...  ->  the whole world
 *
 * It opens wide because before the first word there is no reason to be anywhere in particular,
 * and it ends wide because when the narration stops there is nothing left to frame but all of it.
 * The final reveal is therefore *derived from the absence of further narration* — the author asks
 * for it by writing a `post_say` long enough to hold it, which is a duration, not a camera move.
 *
 * Two things fold into that walk, and both are decided one event at a time against the shot the
 * camera is *actually holding* rather than against an ideal:
 *
 * - **A move must be worth making** (`shotFor`). An event whose target is already well framed
 *   produces no key at all, and the camera simply does not move. This is the only place in
 *   cuecraft where the right answer to "what should happen now" is "nothing".
 * - **An entity may be entered.** An event that reaches *into* one — or that reaches the entity
 *   itself, when it has an inside — opens a portal, and the first event afterwards that does not
 *   closes it. The approach obeys a hold policy like any other shot; the expansion that follows
 *   does not, because a scale transition is not a framing decision, it is the content.
 *
 * Twice, though, the thing after a shot is not another shot, and those two get a composed arrival
 * instead of an adequate one (`composedShot`), plus a beat to land in:
 *
 *     entering a concept    frame the subject, settle, expand into the interior
 *     reaching the end      frame the subject, settle, pull back to the whole world
 *
 * Both are still derived from what the narration reached and from the shape of the graph — the
 * second fires on out-degree zero with nothing said afterwards, which is the world's product and
 * the reveal, neither of them named anywhere. Neither adds a move the camera would not otherwise
 * have made; they change *where* a move it was already making ends up, and how long the frame is
 * allowed to hold before the next thing happens to it (decision:29).
 */
export interface CameraPlan {
  readonly track: readonly CameraKey[];
  /** One per event, including the ones that moved nothing. The record of what was decided. */
  readonly shots: readonly CameraShot[];
  readonly portals: readonly PortalPass[];
}

export function cameraPlan(
  layout: WorldLayout,
  events: readonly CameraEvent[],
  span: { readonly from: number; readonly until: number },
  aspect: number = 16 / 9,
  options: CameraOptions = {},
): CameraPlan {
  const whole = fitTo(layout.bounds, layout.bounds, { aspect, pad: CAMERA.revealPad });
  const ordered = [...events].sort((a, b) => a.frame - b.frame);
  const scheduled = [...(options.calls ?? [])].sort(
    (a, b) => a.enterFrame - b.enterFrame,
  );

  const established = new Set<string>();
  // A stop may name its own duration. Two kinds do: going inside something and coming back out
  // are thresholds, not traversals, so they are not paced by a distance they do not cover — and
  // an approach names its own because the frame *after* it depends on when it lands.
  const stops: { frame: number; view: Viewport; travel?: number }[] = [
    { frame: span.from, view: whole },
  ];
  const shots: CameraShot[] = [];
  const portals: PortalPass[] = [];
  let current = whole;
  let open:
    | { id: string; chamber: Rect; enterFrame: number; frames: number; scheduled?: true }
    | undefined;
  /** The earliest the reveal may begin, once something has landed that it must not cut off. */
  let landed = span.from;

  const push = (frame: number, view: Viewport, travel?: number): void => {
    stops.push({
      frame: Math.max(frame, span.from),
      view,
      ...(travel === undefined ? {} : { travel }),
    });
    current = view;
  };

  /**
   * The camera stack, one viewport per open scope.
   *
   * Pushed on the way in and popped on the way out, rather than recomputed from the node the
   * excursion was about. The two agree in the ordinary case and they are not the same claim:
   * recomputing says "frame that concept again", and popping says "put it back where you found
   * it". Only the second one is true when the camera was already holding a shot it liked, and
   * only the second one composes — a grandchild's return has to land on the child's view, not on
   * a fresh framing of the child's node, or two levels of unwinding accumulate two corrections.
   */
  const restore: Viewport[] = [];

  /**
   * Go inside, on a window the narration set aside for it.
   *
   * The window is silence, and the descent has to fit in it exactly: the child's first word lands
   * on the frame after it closes, and a threshold still being crossed while somebody is talking
   * over it is the thing this schedule exists to prevent.
   *
   *     ... parent speech |  approach   settle   expansion  | child speech ...
   *                       ^ enterFrame                      ^ enterFrame + window
   *
   * The approach is the one part allowed to start early, and it is allowed because it is not a
   * threshold — it is the camera turning towards what the parent has just finished talking about,
   * which is a move a documentary makes under the last sentence rather than after it.
   */
  const openScheduled = (call: ScheduledCall, at: number): void => {
    const node = layout.byId.get(call.target);
    if (node === undefined) return;

    const before = current;
    const approach = composedShot(before, node.rect, layout.bounds, aspect);
    if (approach.kind !== "hold") {
      const travel = paceOf(before, approach.view, CAMERA.minTravel, CAMERA.maxTravel);
      const lands = Math.max(stops.at(-1)?.frame ?? span.from, at - travel);
      push(lands, approach.view, travel);
    }
    // The view the excursion is leaving, and the one it will be put back to. Recorded after the
    // approach, because the approach is part of the enclosing shot rather than part of the
    // descent — coming back out lands on the composition the viewer last saw the node in.
    restore.push(current);

    const expansion = Math.max(1, call.enterWindow - CAMERA.settle);
    const openAt = at + CAMERA.settle;
    const chamber = chamberFor(node, aspect, { x: current.cx, y: current.cy });
    const view: Viewport = {
      cx: chamber.x + chamber.width / 2,
      cy: chamber.y + chamber.height / 2,
      width: chamber.width * (1 + 2 * CAMERA.chamberPad),
    };
    push(openAt, view, expansion);
    open = {
      id: call.target,
      chamber,
      enterFrame: openAt,
      frames: expansion,
      scheduled: true,
    };
    shots.push({ frame: openAt, id: call.target, kind: "enter", view });
  };

  /**
   * Come back out, one scope, to exactly the view that was pushed.
   *
   * The contraction takes the window less the beat that follows it, because what the beat is for
   * is seeing the node back in its own place — decision:25 measured that, and a return with no
   * beat on it runs straight into whatever the parent says next and never tells the viewer where
   * they have come back to.
   */
  const closeScheduled = (call: ScheduledCall, at: number): void => {
    if (open?.id !== call.target) return;
    const back = restore.pop() ?? whole;
    const contraction = Math.max(
      1,
      Math.min(call.exitWindow - CAMERA.returnHold, call.exitWindow),
    );
    push(at, back, contraction);
    portals.push({
      id: open.id,
      chamber: open.chamber,
      enterFrame: open.enterFrame,
      enterFrames: open.frames,
      exitFrame: at,
      exitFrames: contraction,
    });
    shots.push({ frame: at, id: call.target, kind: "exit", view: back });
    open = undefined;
  };

  /**
   * Everything that happens, in the order it happens.
   *
   * A scheduled descent is a moment in the same list as a narration event rather than a second
   * loop over the same frames, because the two have to interleave correctly and the only way to
   * be sure they do is to sort them together. Transitions sort ahead of utterances at the same
   * frame: the chamber is already opening when the first word inside it is spoken.
   */
  type Moment =
    | { at: number; rank: number; event: CameraEvent; last: boolean }
    | { at: number; rank: number; open: ScheduledCall }
    | { at: number; rank: number; close: ScheduledCall };

  const moments: Moment[] = [
    ...ordered.map((event, index) => ({
      at: Math.max(event.frame, span.from),
      rank: 1,
      event,
      last: index === ordered.length - 1,
    })),
    ...scheduled.map((call) => ({
      at: Math.max(call.enterFrame, span.from),
      rank: 0,
      open: call,
    })),
    ...scheduled.map((call) => ({
      at: Math.max(call.exitFrame, span.from),
      rank: 0,
      close: call,
    })),
  ].sort((a, b) => (a.at === b.at ? a.rank - b.rank : a.at - b.at));

  for (const moment of moments) {
    if ("open" in moment) {
      openScheduled(moment.open, moment.at);
      continue;
    }
    if ("close" in moment) {
      closeScheduled(moment.close, moment.at);
      continue;
    }

    const event = moment.event;
    let frame = moment.at;

    // A scheduled excursion has claimed this stretch of the narration. Everything said in it is
    // framed by the chamber and by whatever camera is running inside it, so the enclosing shot
    // has no decision to make and correctly makes none — including for the entity being entered,
    // which is why an anchor on it does not fight the descent it is announcing.
    if (open?.scheduled === true) continue;

    // Leaving comes first: an event outside the open entity closes it before it is framed.
    if (open !== undefined && event.inside !== open.id) {
      const node = layout.byId.get(open.id);
      const back = fitTo(node === undefined ? layout.bounds : node.rect, layout.bounds, {
        aspect,
        widest: CAMERA.widest,
      });
      push(frame, back, CAMERA.exitTravel);
      portals.push({
        id: open.id,
        chamber: open.chamber,
        enterFrame: open.enterFrame,
        enterFrames: open.frames,
        exitFrame: frame,
        exitFrames: CAMERA.exitTravel,
      });
      shots.push({ frame, id: open.id, kind: "exit", view: back });
      open = undefined;
      restore.pop();
      // The cue that took us back out is spoken over the retreat, and whatever it is about is
      // framed once the node is back in its place and has been seen there. Cutting straight to
      // the next concept throws away the one beat that says where the viewer has returned to.
      frame += CAMERA.exitTravel + CAMERA.returnHold;
      // The event that closed the portal is then framed normally, from where we came back to —
      // which is why the exit lands on the entity we left rather than on wherever we are going.
      // The viewer sees the node they were inside, in its own place, before anything else moves.
    }

    if (event.inside !== undefined) {
      if (open === undefined) {
        const node = layout.byId.get(event.inside);
        if (node !== undefined) {
          // Compose, settle, then open. The camera frames the concept where it lives in the world
          // first, holds there long enough for that framing to be seen, and only then expands —
          // so the viewer watches a subject they have already been shown become the frame,
          // whether the camera was next to it or across the world.
          //
          // Composed rather than merely adequate (`composedShot` rather than `shotFor`), because
          // the expansion is about to make the plate's own outline into the edge of the picture,
          // and it can only read that way if the plate is where the picture's centre is. A shot
          // that already sits there approaches in no time at all, which is the hold policy paying
          // for itself in a place it was not designed for.
          const before = current;
          const approach = composedShot(before, node.rect, layout.bounds, aspect);
          let openAt = frame;
          if (approach.kind !== "hold") {
            const travel = paceOf(
              before,
              approach.view,
              CAMERA.minTravel,
              CAMERA.maxTravel,
            );
            push(frame, approach.view, travel);
            openAt = frame + travel + CAMERA.settle;
          }

          restore.push(current);
          const chamber = chamberFor(node, aspect, { x: current.cx, y: current.cy });
          const view: Viewport = {
            cx: chamber.x + chamber.width / 2,
            cy: chamber.y + chamber.height / 2,
            width: chamber.width * (1 + 2 * CAMERA.chamberPad),
          };
          push(openAt, view, CAMERA.enterTravel);
          open = {
            id: event.inside,
            chamber,
            enterFrame: openAt,
            frames: CAMERA.enterTravel,
          };
          shots.push({ frame: openAt, id: event.inside, kind: "enter", view });
        }
      }
      // Everything said inside an entity is framed by the chamber, so no further shot is
      // considered until the narration comes back out.
      established.add(event.id);
      continue;
    }

    established.add(event.id);

    // Arriving at the end of the world, with nothing after it but the pull back.
    //
    // The last thing a traversal reaches, when no relation leaves it, is the world's product —
    // and out-degree zero is a fact about the graph rather than anything an author wrote down, so
    // the rule needs no name, no label and no key. What makes it a special shot is not that the
    // entity is important; it is that the *next* operation is the reveal, which is read from the
    // centre of the frame outwards. A destination clinging to a corner has nowhere to be pulled
    // back from, and the reveal that follows reads as the camera giving up rather than as an
    // answer. So the subject is composed and given a beat to land in before the world opens up.
    //
    // The subject alone, without the established context `targetBounds` would gather: this is a
    // full stop, and a full stop is not shared.
    const node = layout.byId.get(event.id);
    if (moment.last && node?.terminal === true) {
      const arrival = composedShot(current, node.rect, layout.bounds, aspect);
      shots.push({ frame, id: event.id, kind: arrival.kind, view: arrival.view });
      if (arrival.kind === "hold") {
        landed = Math.max(landed, frame + CAMERA.settle);
      } else {
        const travel = paceOf(current, arrival.view, CAMERA.minTravel, CAMERA.maxTravel);
        push(frame, arrival.view, travel);
        landed = Math.max(landed, frame + travel + CAMERA.settle);
      }
      continue;
    }

    const bounds = targetBounds(layout, event.id, established);
    const shot = shotFor(current, bounds, layout.bounds, aspect);
    shots.push({ frame, id: event.id, kind: shot.kind, view: shot.view });
    if (shot.kind !== "hold") push(frame, shot.view);
  }

  if (open !== undefined) {
    const closing = Math.max(span.until, span.from);
    portals.push({
      id: open.id,
      chamber: open.chamber,
      enterFrame: open.enterFrame,
      enterFrames: open.frames,
      exitFrame: closing,
      exitFrames: CAMERA.exitTravel,
    });
  }

  // The reveal begins when the narration stops naming things, and not before the last thing it
  // named has arrived. `landed` is a floor rather than a schedule: on a deck whose closing lines
  // leave any room at all it changes nothing, and on one that does not it buys the arrival its
  // beat out of the pull back rather than out of the shot before it.
  stops.push({ frame: Math.max(span.until, span.from, landed), view: whole });

  const track: CameraKey[] = stops.map((stop, index) => {
    if (index === 0) return { frame: stop.frame, view: stop.view, travel: 1 };
    const previous = stops[index - 1] as { frame: number; view: Viewport };
    const next = stops[index + 1];
    const gap = next === undefined ? Infinity : Math.max(1, next.frame - stop.frame);
    const isReveal = index === stops.length - 1;
    const suggested =
      stop.travel ??
      (isReveal
        ? (options.revealTravel ?? CAMERA.revealTravel)
        : paceOf(previous.view, stop.view, CAMERA.minTravel, CAMERA.maxTravel));
    return {
      frame: stop.frame,
      view: stop.view,
      travel: Math.max(1, Math.min(suggested, gap)),
    };
  });

  return { track, shots, portals };
}

/** The camera track alone, for callers that do not care how it was decided. */
export function cameraTrack(
  layout: WorldLayout,
  events: readonly CameraEvent[],
  span: { readonly from: number; readonly until: number },
  aspect: number = 16 / 9,
  options: CameraOptions = {},
): CameraKey[] {
  return [...cameraPlan(layout, events, span, aspect, options).track];
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
