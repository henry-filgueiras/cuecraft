import dagre from "@dagrejs/dagre";

import type { SlideBody } from "../presentation/body.ts";
import type {
  AuthoredMachine,
  AuthoredOccurrence,
  AuthoredState,
  AuthoredTransition,
} from "../presentation/machine.ts";
import { scenarioPath } from "../presentation/machine.ts";
import {
  CAMERA,
  centreOf,
  distance,
  fitTo,
  fitWidth,
  paceOf,
  shotFor,
  union,
  type CameraKey,
  type CameraShot,
  type Point,
  type Rect,
  type Viewport,
} from "./camera.ts";
import { polylineLength, smoothPath, trimToBoxes } from "./polyline.ts";
import { MACHINE } from "./theme.ts";

/**
 * Where a state machine sits, and where the camera looks at one.
 *
 * The same two derivations the atlas and the transcript have, against a third kind of space:
 *
 *     states + transitions  ->  layout        (dagre, once, from the topology alone)
 *     layout + beats        ->  camera keys   (a viewport per occurrence)
 *
 * ## The topology is the whole input, and the scenario is none of it
 *
 * This is the load-bearing property of the module and it is asserted by a test rather than argued
 * here: **`layoutMachine` never sees the scenario.** Permute the run, delete half of it, take a
 * different branch, and every plate is in exactly the same place. That is not an optimisation and
 * it is not tidiness. A machine's whole claim on a viewer is that it is a *place* — the state that
 * was off to the left is still off to the left when the run comes back to it — and a layout that
 * consulted the run would be a layout that could rearrange itself to flatter one, which is the
 * "fake linear highway" this composition exists not to draw. The scenario is welcome to be the
 * reason a machine is worth explaining. It is not allowed to be the reason a state is where it is.
 *
 * ## What dagre is asked to do here that a world never asked
 *
 * `layoutWorld` uses dagre in the easiest mode there is: a simple digraph of unlabelled edges,
 * where cycles are permitted but nothing in the artifact had any. A machine is the hard input, and
 * three of its four difficulties are handled by dagre and one is not:
 *
 *     cycles and backward edges   dagre's greedy feedback-arc pass reverses them and routes
 *                                 them back the long way, which is exactly right — a back edge
 *                                 that looked like a forward edge would be a lie
 *     parallel transitions        `multigraph: true` with an edge name per transition, so two
 *                                 transitions between one pair get two routes and two labels
 *     required edge labels        each edge is given the size of its wrapped label, so dagre
 *                                 reserves a rank for it and nothing lands on top of anything
 *     self-transitions            **not** dagre's. What it produces for a self edge is a crossed
 *                                 ribbon that reads as a routing bug. So the loop is drawn, and
 *                                 the *room* for it is reserved through dagre by making the state
 *                                 wider — see `MACHINE.loopReach`.
 *
 * That last row is the honest answer to "can the existing machinery be adapted": three quarters of
 * it, and the quarter that cannot is small, local, and cheaper to draw than to argue with.
 *
 * ## What is shared, and what is not
 *
 * Every primitive about *looking at a rectangle* comes from `./camera.ts` unchanged, and every
 * primitive about *drawing a route between two boxes* comes from `./polyline.ts`, which is where
 * `./world.ts` kept them until this module needed them too. What is **not** shared is the two
 * functions that mention the domain: `targetBounds` frames a hot entity plus established
 * neighbours, and it is wrong here twice over — a machine has no notion of established, and the
 * subject of a shot is not a node but an *edge and the two nodes it joins*. So this writes its own
 * `occurrenceBounds` and its own planner, about sixty lines between them, and reuses the rest.
 * That is the test decision:36 set for a third composition, and it passes it.
 *
 * Plain TypeScript, no Remotion import, so the whole of the geometry is unit-testable without a
 * browser.
 */

export interface MachineNode {
  readonly id: string;
  readonly label: string;
  /** The label, broken to the measure a state plate is set at. */
  readonly lines: readonly string[];
  /** The plate itself. Never contains the self-loop, which lives in reserved room beside it. */
  readonly rect: Rect;
  /** The plate plus any room reserved beside it for self-loops. What dagre was actually given. */
  readonly box: Rect;
  /** How many transitions leave and arrive. Reported, never drawn: a hub is a fact, not a style. */
  readonly out: number;
  readonly in: number;
}

export interface MachineEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly on: string;
  /** The event label, wrapped to the measure it was laid out at. */
  readonly lines: readonly string[];
  /** The route, ending on the two plates it joins. */
  readonly points: readonly Point[];
  readonly path: string;
  readonly length: number;
  /** Where the event label sits, already positioned. */
  readonly label: Rect;
  /** An actor of its own kind: a transition that leaves and arrives at the same state. */
  readonly self: boolean;
}

export interface MachineLayout {
  readonly nodes: readonly MachineNode[];
  readonly edges: readonly MachineEdge[];
  /** Everything: plates, routes, labels, loops. What the closing overview has to contain. */
  readonly bounds: Rect;
  readonly byId: ReadonlyMap<string, MachineNode>;
  readonly edgeById: ReadonlyMap<string, MachineEdge>;
  /** Which transitions leave each state, in declaration order. The answer to "what else?". */
  readonly leaving: ReadonlyMap<string, readonly MachineEdge[]>;
}

/** The machine of a slide body, or nothing if the slide is not one. */
export function machineOf(body: SlideBody): AuthoredMachine | undefined {
  return body.kind === "machine"
    ? { states: body.states, transitions: body.transitions, scenario: body.scenario }
    : undefined;
}

/* ----------------------------------------------------------------- layout */

/**
 * Break a state's name into the lines its plate should hold.
 *
 * The same balanced search `wrapLabel` runs for a world, at this composition's own proportions and
 * without importing it — a state plate is a pill rather than a card, so it wants a wider aspect and
 * pays a heavier penalty for a second line. Two constants' difference is not a reason to share a
 * function, and sharing one would have meant a `plateAspect` parameter threaded through a call
 * site that is already reading it from a token.
 */
export function wrapStateLabel(label: string): readonly string[] {
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [label];

  let best: { lines: readonly string[]; score: number } | undefined;
  for (let count = 1; count <= Math.min(MACHINE.maxLines, words.length); count += 1) {
    const broken = balance(words, count);
    if (broken.length !== count) continue;
    const size = plateSize(broken);
    const proportion = Math.abs(size.width / size.height - MACHINE.plateAspect);
    const score = proportion + MACHINE.linePenalty * (count - 1);
    if (best === undefined || score < best.score) best = { lines: broken, score };
  }
  return best?.lines ?? [words.join(" ")];
}

/** The balanced break into exactly `count` lines: the smallest longest-line that fits. */
function balance(words: readonly string[], count: number): readonly string[] {
  const longest = Math.max(...words.map((word) => word.length));
  const total = words.join(" ").length;
  for (
    let measure = Math.max(longest, Math.ceil(total / count));
    measure <= total;
    measure += 1
  ) {
    const broken = greedy(words, measure);
    if (broken.length <= count) return broken;
  }
  return [words.join(" ")];
}

/**
 * An event label, wrapped greedily.
 *
 * Greedy rather than balanced, unlike a state's name, and for the reason a protocol's message
 * labels are: a state's name is a *card* and wants to be a pleasing shape; an event label is a line
 * of running text that happens to be short, and balancing it produces the ragged two-short-lines
 * look that reads as a poem. A word longer than the measure takes the line it needs and overhangs,
 * because the alternative is hyphenating somebody's timeout.
 */
export function wrapEventLabel(label: string): readonly string[] {
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [label];
  const broken = greedy(words, MACHINE.labelMeasure);
  if (broken.length <= MACHINE.labelMaxLines) return broken;
  // Past the ceiling, rebalance rather than let one label become a column: a five-line event
  // label between two neighbouring states is a wall, and the rank dagre reserves for it drags the
  // whole machine apart.
  return balance(words, MACHINE.labelMaxLines);
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

/** A state plate, sized to the name it holds. Authors do not set sizes (decision:10). */
export function plateSize(lines: readonly string[]): {
  readonly width: number;
  readonly height: number;
} {
  const longest = Math.max(...lines.map((line) => line.length), 1);
  return {
    width: Math.max(
      MACHINE.minPlateWidth,
      Math.round(longest * MACHINE.label * MACHINE.charWidth) + 2 * MACHINE.padX,
    ),
    height:
      Math.round(lines.length * MACHINE.label * MACHINE.lineHeight) + 2 * MACHINE.padY,
  };
}

/** The box an event label occupies, which is what dagre is told to reserve a rank for. */
function labelSize(lines: readonly string[]): {
  readonly width: number;
  readonly height: number;
} {
  const longest = Math.max(...lines.map((line) => line.length), 1);
  return {
    width:
      Math.round(longest * MACHINE.event * MACHINE.eventCharWidth) +
      2 * MACHINE.labelPadX,
    height:
      Math.round(lines.length * MACHINE.event * MACHINE.eventLineHeight) +
      2 * MACHINE.labelPadY,
  };
}

/**
 * Lay the machine out. Deterministic, and a pure function of the topology.
 *
 * `rankdir` is **top to bottom**, and it is the one place this module departs from the atlas on
 * purpose. A world is laid out left to right because a world is a transformation and a
 * transformation reads along the axis text does. A machine is not a transformation: it is cyclic,
 * its rank order is an artifact of whichever edges dagre had to reverse to get one, and reading it
 * as a flow left to right would be reading a direction into it that nobody wrote.
 *
 * The choice was made against the frame rather than against taste, and the measurement is worth
 * keeping. Laid out left to right, the elevator — six states in a cycle with two back edges — comes
 * out **10:1**, because a chain of `n` states with labelled edges spends `2n - 1` ranks on its own
 * length. Fitted to a 16:9 overview that is a state name at 18.6 screen pixels, which is under the
 * legibility floor: the one shot that has to show the whole machine could not have been read. Top
 * to bottom the same machine is 0.9:1 and the same name is 33 pixels. The adversarial specimen,
 * which is a hub rather than a chain, is unmoved either way — 21.8 against 22.8 — because a hub
 * fans wide whichever axis it fans along.
 *
 * So: a chain pays enormously and a hub pays nothing, and the direction that survives both is the
 * one every statechart a viewer has ever seen is drawn in anyway.
 *
 * Rank is still not progress and does not mean progress. dagre's greedy feedback-arc pass broke
 * whatever cycles there were in order to have one, and the edges it reversed route visibly the long
 * way round, which is the picture saying exactly that.
 */
export function layoutMachine(machine: {
  readonly states: readonly AuthoredState[];
  readonly transitions: readonly AuthoredTransition[];
}): MachineLayout {
  const graph = new dagre.graphlib.Graph({ directed: true, multigraph: true });
  graph.setGraph({
    rankdir: "TB",
    ranksep: MACHINE.ranksep,
    nodesep: MACHINE.nodesep,
    edgesep: MACHINE.edgesep,
    marginx: 0,
    marginy: 0,
    ranker: "network-simplex",
  });
  graph.setDefaultEdgeLabel(() => ({}));

  // Every event label is wrapped before anything is laid out, because two things need its size:
  // dagre, so it can reserve a rank for it, and a state with a self-transition, so it can reserve
  // room beside itself for the loop *and the caption next to it*.
  const labels = new Map<string, readonly string[]>(
    machine.transitions.map((transition) => [
      transition.id,
      wrapEventLabel(transition.on),
    ]),
  );

  const wrapped = new Map<string, readonly string[]>();
  const plates = new Map<string, { width: number; height: number }>();
  for (const state of machine.states) {
    const lines = wrapStateLabel(state.text);
    const plate = plateSize(lines);
    wrapped.set(state.id, lines);
    plates.set(state.id, plate);
    // The reservation, and the only place a self-loop touches the layout engine. dagre is told
    // about a wider box; the plate is drawn at the left of it, and the loops own the rest.
    graph.setNode(state.id, {
      width: plate.width + loopRoomFor(state.id, machine.transitions, labels),
      height: plate.height,
    });
  }

  for (const transition of machine.transitions) {
    if (transition.from === transition.to) continue;
    graph.setEdge(
      transition.from,
      transition.to,
      { ...labelSize(labels.get(transition.id) as readonly string[]), labelpos: "c" },
      transition.id,
    );
  }

  dagre.layout(graph);

  const nodes: MachineNode[] = machine.states.map((state) => {
    const laid = graph.node(state.id) as {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    const plate = plates.get(state.id) as { width: number; height: number };
    const box: Rect = {
      x: laid.x - laid.width / 2,
      y: laid.y - laid.height / 2,
      width: laid.width,
      height: laid.height,
    };
    return {
      id: state.id,
      label: state.text,
      lines: wrapped.get(state.id) ?? [state.text],
      // Left-aligned inside the box: what was reserved for the loops is to the right of the
      // plate, and a state without a loop has a box that *is* its plate.
      rect: {
        x: box.x,
        y: laid.y - plate.height / 2,
        width: plate.width,
        height: plate.height,
      },
      box,
      out: machine.transitions.filter((entry) => entry.from === state.id).length,
      in: machine.transitions.filter((entry) => entry.to === state.id).length,
    };
  });
  const byId = new Map(nodes.map((node) => [node.id, node] as const));

  // Self-loops are laid out here rather than by dagre, in the room reserved beside the plate.
  // Several loops on one state reach progressively further out, so two never share a curve.
  const loopIndex = new Map<string, number>();

  const edges: MachineEdge[] = machine.transitions.map((transition): MachineEdge => {
    const lines = labels.get(transition.id) ?? [transition.on];
    const size = labelSize(lines);

    if (transition.from === transition.to) {
      const node = byId.get(transition.from) as MachineNode;
      const ordinal = loopIndex.get(transition.from) ?? 0;
      loopIndex.set(transition.from, ordinal + 1);
      const loop = selfLoop(node, ordinal);
      return {
        id: transition.id,
        from: transition.from,
        to: transition.to,
        on: transition.on,
        lines,
        points: loop.points,
        path: smoothPath(loop.points),
        length: polylineLength(loop.points),
        label: {
          x: loop.apex.x + MACHINE.labelPadX,
          y: loop.apex.y - size.height / 2,
          width: size.width,
          height: size.height,
        },
        self: true,
      };
    }

    const routed = graph.edge(
      transition.from,
      transition.to,
      transition.id,
    ) as unknown as {
      points: Point[];
      x?: number;
      y?: number;
    };
    const points = trimToBoxes(
      routed.points,
      byId.get(transition.from)?.rect,
      byId.get(transition.to)?.rect,
    );
    // dagre reports where it put the label's rank slot. Trust it: that slot is what the rank was
    // widened for, and moving the label to the route's own midpoint would put it back into the
    // space the rank was widened to keep clear.
    const centre =
      routed.x === undefined || routed.y === undefined
        ? midpointOf(points)
        : { x: routed.x, y: routed.y };

    return {
      id: transition.id,
      from: transition.from,
      to: transition.to,
      on: transition.on,
      lines,
      points,
      path: smoothPath(points),
      length: polylineLength(points),
      label: {
        x: centre.x - size.width / 2,
        y: centre.y - size.height / 2,
        width: size.width,
        height: size.height,
      },
      self: false,
    };
  });

  const leaving = new Map<string, MachineEdge[]>(nodes.map((node) => [node.id, []]));
  for (const edge of edges) leaving.get(edge.from)?.push(edge);

  // Labels and routes as well as plates. A back edge bows a long way outside both of its endpoints
  // and a label sits in a rank of its own, and an overview whose bounds cut through either would be
  // the one frame in the film that has to show the whole machine failing to.
  const bounds = union([
    ...nodes.map((node) => node.box),
    ...edges.map((edge) => edge.label),
    ...edges.flatMap((edge) =>
      edge.points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })),
    ),
  ]);

  return {
    nodes,
    edges,
    bounds,
    byId,
    edgeById: new Map(edges.map((edge) => [edge.id, edge])),
    leaving,
  };
}

/**
 * How much room beside a state its self-transitions need.
 *
 * One loop's reach per loop, plus the widest of their captions and the gap before it. A loop whose
 * label hung out of the reserved space would be reserving room for the wrong thing, and the caption
 * is the half of a self-transition that says what fired it.
 *
 * Beside rather than above, and the reason is `rankdir`. Under a top-down layout the space directly
 * over a state is where its incoming edges arrive; reserving a loop there would put a hand-drawn
 * arc into the one region the router is guaranteed to want. To the right is space no rank uses,
 * because a rank is a horizontal band and dagre already knows the box is that wide.
 */
function loopRoomFor(
  id: string,
  transitions: readonly AuthoredTransition[],
  labels: ReadonlyMap<string, readonly string[]>,
): number {
  const loops = transitions.filter(
    (transition) => transition.from === id && transition.to === id,
  );
  if (loops.length === 0) return 0;
  const caption = Math.max(
    ...loops.map((loop) => labelSize(labels.get(loop.id) ?? [loop.on]).width),
  );
  return loops.length * MACHINE.loopReach + MACHINE.labelPadX + caption;
}

/**
 * A self-transition, drawn as an arc out of the plate's right side and back into it.
 *
 * Out of one shoulder and into the other rather than out of and into the same point, because a loop
 * that leaves and returns at one place is a circle with an arrowhead on it, and a circle does not
 * say which way round it goes. Two shoulders and a visible apex do.
 *
 * The caption hangs *beside* the apex and level with it, which is the transcript's rule for a
 * self-message arrived at independently and for the same reason: a hook is a shape with a middle,
 * and a caption floating over its top edge reads as belonging to whatever is above it.
 */
function selfLoop(
  node: MachineNode,
  ordinal: number,
): { readonly points: readonly Point[]; readonly apex: Point } {
  const spread = (node.rect.height * MACHINE.loopSpread) / 2;
  const middle = node.rect.y + node.rect.height / 2;
  const right = node.rect.x + node.rect.width;
  const reach = MACHINE.loopReach * (ordinal + 1) - MACHINE.padX / 2;
  const apex = { x: right + reach, y: middle };
  return {
    points: [
      { x: right, y: middle - spread },
      { x: right + reach * 0.72, y: middle - spread * 1.35 },
      apex,
      { x: right + reach * 0.72, y: middle + spread * 1.35 },
      { x: right, y: middle + spread },
    ],
    apex,
  };
}

function midpointOf(points: readonly Point[]): Point {
  const first = points[0] ?? { x: 0, y: 0 };
  const last = points[points.length - 1] ?? first;
  return { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
}

/* ----------------------------------------------------------------- camera */

/**
 * What one occurrence wants on screen.
 *
 * The rule is one sentence with a clause the atlas's does not have: **frame where the run is, the
 * transition it is taking, and where that takes it — then as many of the destination's other exits
 * as fit.**
 *
 * The first three are not negotiable, because they are the occurrence. A shot of the destination
 * alone answers "where is it now" and destroys "how did it get here"; a shot of the edge alone is a
 * label floating in a field. The route is taken whole rather than as its two endpoints, because a
 * back edge bows halfway across the machine and a frame containing both of its ends and none of its
 * middle is a frame with an arrow leaving the top of it.
 *
 * The clause is the interesting part and it is what makes the composition an explainer rather than
 * a replay. The third question a paused frame has to answer is *what else could happen from here*,
 * and the honest place to answer it is the shot that arrives somewhere: the alternatives are taken
 * nearest-first and stop being taken the moment the shot would exceed the widest legible one, so a
 * state with one other exit gets it and a hub with six does not silently become the overview.
 *
 * Note what is **not** consulted: which transitions have been taken already. The atlas takes only
 * *established* neighbours, because in a world an unreached thing is a spoiler. Here the untaken
 * ones are the point, and preferring them would be as wrong as hiding them — nearest-first is
 * about the frame, not about the run.
 */
export function occurrenceBounds(
  layout: MachineLayout,
  transitionId: string,
  aspect: number = 16 / 9,
): Rect {
  const edge = layout.edgeById.get(transitionId);
  if (edge === undefined) return layout.bounds;
  const source = layout.byId.get(edge.from);
  const target = layout.byId.get(edge.to);

  const essential = union([
    ...(source === undefined ? [] : [source.box]),
    ...(target === undefined ? [] : [target.box]),
    edge.label,
    ...edge.points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })),
  ]);

  if (target === undefined) return essential;
  const here = centreOf(target.rect);
  const alternatives = (layout.leaving.get(target.id) ?? [])
    .filter((other) => other.id !== edge.id)
    .map((other) => ({
      other,
      to: layout.byId.get(other.to),
    }))
    .sort(
      (a, b) =>
        distance(here, centreOf(a.other.label)) - distance(here, centreOf(b.other.label)),
    );

  let bounds = essential;
  for (const { other, to } of alternatives) {
    const widened = union([bounds, other.label, ...(to === undefined ? [] : [to.box])]);
    if (fitWidth(widened, aspect, MACHINE.shotPad) > MACHINE.context) break;
    bounds = widened;
  }
  return bounds;
}

export interface MachinePlan {
  readonly track: readonly CameraKey[];
  /** One per occurrence, including the ones that moved nothing. The record of what was decided. */
  readonly shots: readonly CameraShot[];
}

/**
 * The camera plan, derived from the beats and the topology and from nothing else.
 *
 * The shape of the sequence is not authored anywhere and is not configurable:
 *
 *     the whole machine  ->  occurrence, occurrence, occurrence ...  ->  the whole machine
 *
 * It opens wide because a map has to be seen as a map before anything travels over it, and it ends
 * wide because when the run stops there is nothing left to frame but all of it and the route
 * through it. Neither end says anything about finishing: the closing shot is *the machine, with the
 * run's wake on it and the traveller wherever it stopped*, which is a picture of an explanation
 * ending rather than of a system reaching a conclusion.
 *
 * In between it is `shotFor` in a loop, which is the third time decision:24's hold policy has been
 * asked to work in a space it was not measured against and the second time it needed nothing added.
 * A scenario that stays in one neighbourhood — a hub taking its self-loop, or a pair of states
 * bouncing — produces no keys at all after the first, because each occurrence is already well
 * inside the shot the last one produced. Nothing was written to make that happen, and writing a
 * "do not bounce on a revisit" rule would have been writing the same rule a third time.
 *
 * The one thing added is `MACHINE.lead`, and it is not a framing rule. A move already *lands* on
 * the occurrence rather than starting there — the transcript's rule, and for the same reason. What
 * the lead buys is a few frames of stillness between the camera arriving and the traveller setting
 * off, because those are two motions and a viewer asked to watch both at once watches neither.
 */
export function machinePlan(
  layout: MachineLayout,
  beats: readonly { readonly index: number; readonly from: number }[],
  takes: readonly string[],
  span: { readonly from: number; readonly until: number },
  aspect: number = 16 / 9,
): MachinePlan {
  const whole = fitTo(layout.bounds, layout.bounds, {
    aspect,
    pad: CAMERA.revealPad,
  });

  const stops: { frame: number; view: Viewport; travel?: number }[] = [
    { frame: span.from, view: whole },
  ];
  const shots: CameraShot[] = [];
  let current = whole;
  let first = true;

  for (const beat of [...beats].sort((a, b) => a.from - b.from)) {
    const transitionId = takes[beat.index];
    if (transitionId === undefined) continue;
    const at = Math.max(beat.from, span.from);
    const bounds = occurrenceBounds(layout, transitionId, aspect);

    // **The overview is not a shot the run may hold.** It contains every subsequent subject
    // comfortably, so the hold policy would keep it for the whole film — which is a legible
    // diagram nobody ever comes close enough to read a transition label on. So the first
    // occurrence composes properly, and every one after it is decided against *that*: a working
    // distance, arrived at once, rather than the opening wide never being left. The transcript
    // learned this the same way, on its first render.
    const shot = first
      ? {
          view: fitTo(bounds, layout.bounds, {
            aspect,
            widest: MACHINE.widest,
            pad: MACHINE.shotPad,
          }),
          kind: "recompose" as const,
        }
      : shotFor(current, bounds, layout.bounds, aspect, {
          pad: MACHINE.shotPad,
          widest: MACHINE.widest,
        });
    first = false;

    shots.push({ frame: at, id: transitionId, kind: shot.kind, view: shot.view });
    if (shot.kind === "hold") continue;

    const travel = paceOf(current, shot.view, CAMERA.minTravel, CAMERA.maxTravel);
    const lands = Math.max(
      stops.at(-1)?.frame ?? span.from,
      at - travel - MACHINE.lead,
      span.from + MACHINE.establish,
    );
    stops.push({ frame: lands, view: shot.view, travel });
    current = shot.view;
  }

  stops.push({ frame: Math.max(span.until, span.from), view: whole });

  const track: CameraKey[] = stops.map((stop, index) => {
    if (index === 0) return { frame: stop.frame, view: stop.view, travel: 1 };
    const previous = stops[index - 1] as { frame: number; view: Viewport };
    const next = stops[index + 1];
    const gap = next === undefined ? Infinity : Math.max(1, next.frame - stop.frame);
    const isReveal = index === stops.length - 1;
    const suggested =
      stop.travel ??
      (isReveal
        ? CAMERA.revealTravel
        : paceOf(previous.view, stop.view, CAMERA.minTravel, CAMERA.maxTravel));
    return {
      frame: stop.frame,
      view: stop.view,
      travel: Math.max(1, Math.min(suggested, gap)),
    };
  });

  return { track, shots };
}

/* -------------------------------------------------------------- the run */

/**
 * What the run has done by a given occurrence, as the picture needs it.
 *
 * One pass over the scenario, published as a list so the composition looks up rather than
 * recomputes. Everything the frame has to say that is not topology is in here:
 *
 *     occupied     which state the run is in after this occurrence — the traveller
 *     visited      every state it has been in, so departed states can be ordinary and not dead
 *     taken        how many times each transition has been taken, so a repeat can say so
 *     route        the states in order, so a paused frame can answer "how did it get here"
 *
 * Derived rather than authored, and derived *once* rather than per frame: the composition reads
 * `progress[current]` and nothing in the renderer walks the scenario.
 */
export interface RunProgress {
  readonly occupied: string;
  readonly entered: string;
  readonly took: string;
  /** How many times this transition has been taken, counting this occurrence. One-based. */
  readonly ordinal: number;
  readonly visited: ReadonlySet<string>;
  readonly taken: ReadonlyMap<string, number>;
  readonly route: readonly string[];
}

export function runProgress(machine: {
  readonly transitions: readonly AuthoredTransition[];
  readonly scenario: readonly AuthoredOccurrence[];
}): readonly RunProgress[] {
  const path = scenarioPath(machine);
  const visited = new Set<string>();
  const taken = new Map<string, number>();
  const route: string[] = [];
  const start = path.start;
  if (start !== undefined) {
    visited.add(start);
    route.push(start);
  }

  return machine.scenario.map((occurrence, index) => {
    const arriving = path.after[index] as string;
    const ordinal = (taken.get(occurrence.take) ?? 0) + 1;
    taken.set(occurrence.take, ordinal);
    visited.add(arriving);
    route.push(arriving);
    return {
      occupied: arriving,
      entered: arriving,
      took: occurrence.take,
      ordinal,
      visited: new Set(visited),
      taken: new Map(taken),
      route: [...route],
    };
  });
}

/**
 * Where the run is *before* anything happens: the first occurrence's source.
 *
 * Inferred, never declared, and separated out because it is the one piece of state the film shows
 * before it shows any change — the traveller is standing somewhere while the overview is being
 * established, and where it is standing is a fact about the scenario rather than about the machine.
 */
export function startingState(machine: {
  readonly transitions: readonly AuthoredTransition[];
  readonly scenario: readonly AuthoredOccurrence[];
}): string | undefined {
  const first = machine.scenario[0];
  if (first === undefined) return undefined;
  return machine.transitions.find((transition) => transition.id === first.take)?.from;
}
