import dagre from "@dagrejs/dagre";

import type { SlideBody } from "../presentation/body.ts";
import type { AuthoredEntity, AuthoredRelation } from "../presentation/world.ts";
import {
  CAMERA,
  cameraAt,
  centreOf,
  composedShot,
  distance,
  fitTo,
  fitWidth,
  paceOf,
  shotFor,
  smootherstep,
  union,
  type CameraKey,
  type CameraShot,
  type Point,
  type Rect,
  type Viewport,
} from "./camera.ts";
import { polylineLength, smoothPath, trimToBoxes } from "./polyline.ts";
import { WORLD } from "./theme.ts";

/**
 * Where a semantic world sits, and where the camera looks *at a world*.
 *
 * Two derivations, in one module because the second is a function of the first and neither is a
 * function of anything the author wrote.
 *
 *     entities + relations  ->  layout        (dagre, once, for the whole world)
 *     layout + anchors      ->  camera keys   (a viewport per narration event)
 *     camera keys + frame   ->  viewport      (a smooth path between two of them)
 *
 * The middle line is where this module now stops and `./camera.ts` begins. Everything about
 * *looking at a rectangle* — the hold policy, the fit, the pacing, the path — moved there when a
 * second composition needed a camera and had no graph to offer one. What is left here is
 * everything that mentions a node: which bounds an event wants on screen, what a chamber is, and
 * the traversal plan that walks a world. The re-exports below keep every existing importer
 * unchanged, which is also the honest record of what used to live here.
 *
 * **Once** is the load-bearing word in the first line. The world is laid out one time, in its own
 * coordinates, and never again; every frame of the scene reads the same positions. That is what
 * makes the thing on screen a place rather than a sequence of diagrams — when the camera moves
 * from one concept to another, the viewer is moving through a space that was already there.
 * Re-running layout per cue would produce the same pictures and none of the meaning.
 *
 * One mature library does the part that is genuinely hard and genuinely solved. **dagre** does
 * layered graph layout: rank assignment, crossing reduction, coordinate assignment and edge
 * routing, deterministically and offline. It is small, it is pure, and it is not anything cuecraft
 * should be writing itself (decision:5).
 *
 * Plain TypeScript, no Remotion import, so the whole of the geometry is unit-testable without a
 * browser — the same constraint `layout.ts`, `anchor.ts` and `projection.ts` work under.
 *
 * Nothing in here is reachable from the source. The author writes what exists and what relates
 * to what; every number below is derived from that plus the viewport.
 */

// The polyline geometry a routed graph is drawn with moved to `./polyline.ts` when a second
// composition wanted every line of it (decision:36's rule, applied again). Re-exported so no
// existing importer changed, and so the history of what used to live here stays legible.
export { polylineLength, smoothPath } from "./polyline.ts";

export {
  CAMERA,
  cameraAt,
  composedShot,
  fitTo,
  marginOf,
  occupancyOf,
  shotFor,
  smootherstep,
  union,
  viewRect,
  viewportTransform,
  type CameraKey,
  type CameraShot,
  type Point,
  type Rect,
  type ShotKind,
  type Viewport,
} from "./camera.ts";

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
    const points = trimToBoxes(
      routed.points,
      nodes.find((node) => node.id === relation.from)?.rect,
      nodes.find((node) => node.id === relation.to)?.rect,
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

/* ------------------------------------------------------------------ camera */

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
