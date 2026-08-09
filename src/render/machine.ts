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
  marginOf,
  paceOf,
  union,
  viewRect,
  type CameraKey,
  type CameraShot,
  type Point,
  type Rect,
  type Viewport,
} from "./camera.ts";
import { polylineLength, smoothPath, trimToBoxes } from "./polyline.ts";
import { MACHINE, contextShot, widestShot } from "./theme.ts";

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
 * One way of laying a machine out, and the whole of what a candidate may vary.
 *
 * Four knobs, and the deliberate absence of a fifth. Nothing here is authorable, nothing here
 * mentions a state or a transition by name, and a policy is picked by measuring the result rather
 * than by anybody's taste — see `./audition.ts`.
 *
 * `labelMeasure` is the interesting one and it is the reason this type exists at all. It looks
 * like typography and it is really **the graph's aspect ratio in disguise**: a narrower measure
 * makes every event label taller and thinner, which makes every rank shorter and the whole machine
 * taller. The overview's type size is `1920 * label / max(W, H * frameAspect)`, which is largest
 * exactly when the machine's aspect equals the frame's — so a machine that comes out too wide
 * wants a narrower measure and one that comes out too tall wants a wider one, and both are the
 * same objective pushed from opposite sides. That is a global optimisation over a quantity nobody
 * would ever think to author, and it is available only because the whole graph, its labels and the
 * final frame are all known before anything is laid out.
 *
 * `weightOf` is the one channel a scenario may use to reach geometry, and it is here on probation.
 */
export interface LayoutPolicy {
  readonly rankdir: "TB" | "LR";
  readonly ranker: "network-simplex" | "tight-tree" | "longest-path";
  /** Characters an event label wraps to, before `MACHINE.labelMaxLines` takes over. */
  readonly labelMeasure: number;
  /**
   * How far apart things are placed along the rank, and between ranks.
   *
   * The second axis that trades one dimension of the machine for the other, and it works on the
   * part `labelMeasure` cannot reach. A hub's width is the sum of everything in its widest rank
   * plus the gaps between them; spreading pushes that out and compressing pulls it in, and
   * `ranksep` moves the other way at the same time so the two are one dial rather than two.
   *
   * Expressed as a multiplier on `MACHINE.nodesep` and `MACHINE.ranksep` rather than as absolute
   * numbers, so the tokens stay the statement of what the composition's proportions are and this
   * stays a statement about which way to lean from them.
   */
  readonly spread: number;
  /** How much dagre should care about keeping this transition short and straight. */
  readonly weightOf?: (id: string) => number;
}

/**
 * What a machine is laid out with when nobody has auditioned anything.
 *
 * sprint:19's layout exactly, kept as a named thing rather than as the absence of an argument, so
 * that "the incumbent" is a candidate the audition has to beat rather than a default it is
 * measured against.
 */
export const DEFAULT_LAYOUT: LayoutPolicy = {
  rankdir: "TB",
  ranker: "network-simplex",
  labelMeasure: MACHINE.labelMeasure,
  spread: 1,
};

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
export function wrapEventLabel(
  label: string,
  measure: number = MACHINE.labelMeasure,
): readonly string[] {
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [label];
  const broken = greedy(words, measure);
  if (broken.length <= MACHINE.labelMaxLines) return unorphan(broken, words, measure);
  // Past the ceiling, rebalance rather than let one label become a column: a five-line event
  // label between two neighbouring states is a wall, and the rank dagre reserves for it drags the
  // whole machine apart.
  return balance(words, MACHINE.labelMaxLines);
}

/**
 * Greedy, unless greedy left a word on its own.
 *
 * The one amendment the rendered frames asked for. Greedy wrapping is right for an event label —
 * balanced wrapping gives short labels the ragged two-short-lines look that reads as a poem — but
 * it has one failure that is worse than the thing it avoids. "downstream returns 429" at a measure
 * of twenty breaks as `downstream returns` / `429`, and a line containing nothing but a number
 * reads as a separate caption belonging to something else. Same for `the reaper reclaims` / `it`.
 *
 * So a last line shorter than half the measure is rebalanced across the lines greedy already chose.
 * The line *count* is never changed, which is what keeps the rank dagre reserved the right height,
 * and a label that greedy set well is returned untouched.
 */
function unorphan(
  broken: readonly string[],
  words: readonly string[],
  measure: number,
): readonly string[] {
  const last = broken[broken.length - 1];
  if (broken.length < 2 || last === undefined || last.length >= measure / 2)
    return broken;
  const rebalanced = balance(words, broken.length);
  return rebalanced.length === broken.length ? rebalanced : broken;
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
export function layoutMachine(
  machine: {
    readonly states: readonly AuthoredState[];
    readonly transitions: readonly AuthoredTransition[];
  },
  policy: LayoutPolicy = DEFAULT_LAYOUT,
): MachineLayout {
  const graph = new dagre.graphlib.Graph({ directed: true, multigraph: true });
  graph.setGraph({
    rankdir: policy.rankdir,
    // One dial, two directions: spreading along the rank compresses between them, so the machine
    // gets wider and shorter, and the reverse makes it taller and narrower.
    ranksep: Math.round(MACHINE.ranksep / policy.spread),
    nodesep: Math.round(MACHINE.nodesep * policy.spread),
    edgesep: Math.round(MACHINE.edgesep * policy.spread),
    marginx: 0,
    marginy: 0,
    ranker: policy.ranker,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  // Every event label is wrapped before anything is laid out, because two things need its size:
  // dagre, so it can reserve a rank for it, and a state with a self-transition, so it can reserve
  // room beside itself for the loop *and the caption next to it*.
  const labels = new Map<string, readonly string[]>(
    machine.transitions.map((transition) => [
      transition.id,
      wrapEventLabel(transition.on, policy.labelMeasure),
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
      {
        ...labelSize(labels.get(transition.id) as readonly string[]),
        labelpos: "c",
        // One, unless the elected policy is one that weights the run. dagre's ranker and its
        // ordering pass both read `weight`, so a heavier edge is kept shorter and straighter —
        // which is the only channel through which a scenario is ever allowed to touch geometry,
        // and it is the channel this round is testing rather than assuming.
        weight: policy.weightOf?.(transition.id) ?? 1,
      },
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
 */ export function occurrenceBounds(
  layout: MachineLayout,
  transitionId: string,
  aspect: number = 16 / 9,
  contextCap: number = contextShot(1920),
): Rect {
  const edge = layout.edgeById.get(transitionId);
  if (edge === undefined) return layout.bounds;
  const source = layout.byId.get(edge.from);
  const target = layout.byId.get(edge.to);

  const essential = essentialBounds(layout, transitionId);
  if (target === undefined || source === undefined) return essential;

  const here = centreOf(target.rect);
  const alternatives = (layout.leaving.get(target.id) ?? [])
    .filter((other) => other.id !== edge.id)
    .map((other) => ({ other, to: layout.byId.get(other.to) }))
    .sort(
      (a, b) =>
        distance(here, centreOf(a.other.label)) - distance(here, centreOf(b.other.label)),
    );

  let bounds = essential;
  for (const { other, to } of alternatives) {
    const widened = union([bounds, other.label, ...(to === undefined ? [] : [to.box])]);
    if (fitWidth(widened, aspect, MACHINE.shotPad) > contextCap) break;
    bounds = widened;
  }
  return bounds;
}

/**
 * The part of an occurrence a shot may not crop: source, route, label, destination.
 *
 * Separated from `occurrenceBounds` because the planner needs the two apart. The essential bounds
 * are a **hard constraint** — a candidate that does not contain them is not a candidate, at any
 * price — while the context an arrival brings with it is a *preference*, and pricing the two the
 * same is how a shot ends up cropping the transition it is about in order to fit in an alternative
 * nobody asked about.
 */
export function essentialBounds(layout: MachineLayout, transitionId: string): Rect {
  const edge = layout.edgeById.get(transitionId);
  if (edge === undefined) return layout.bounds;
  const source = layout.byId.get(edge.from);
  const target = layout.byId.get(edge.to);
  return union([
    ...(source === undefined ? [] : [source.box]),
    ...(target === undefined ? [] : [target.box]),
    edge.label,
    ...edge.points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })),
  ]);
}

/* ---------------------------------------------------------------- the plan */

/**
 * The three things a shot can be, and the reason there are three rather than a continuum.
 *
 *     overview    the canonical whole-machine composition. **One** viewport, computed once and
 *                 reused by identity, so "we are back at the overview" is a fact about the frame
 *                 rather than a description of it
 *     retained    the shot already being held. Costs the viewer nothing
 *     local       a materially closer look at a transition and its neighbourhood
 *
 * The vocabulary exists because sprint:19's camera had no way to say *this candidate is basically
 * the overview*. It computed a bounding rectangle per occurrence, fitted it, and if the answer came
 * out at ninety-four percent of the overview's width with the centre a little off, that is what it
 * took — a shot that is neither a look at anything nor the map, and the elevator ended its run in
 * one. Naming the overview makes snapping to it expressible; see `canonicalise`.
 */
export type ShotVocabulary = "overview" | "retained" | "local";

/**
 * The window a camera move for one occurrence has to fit inside.
 *
 * This is the timing rule stated as geometry, and it is the one thing in the planner that makes
 * "never move the camera and the traveller at the same time" an *invariant* rather than a hope.
 * `MACHINE.lead` used to be the whole of the policy and it only guarded one end: it kept a move
 * from running into the traversal it was serving, and said nothing about the traversal *before* it.
 * The baseline measurement is what convicted it — six of the two films' nine silent occurrences had
 * the next move already under way before the traveller had landed, and four of them had a stable
 * hold of exactly zero frames.
 *
 * So a move now has to fit between two fixed points:
 *
 *     opens   the previous arrival, plus the frames its flare owes itself (`MACHINE.arrivalQuiet`)
 *     closes  this occurrence's start, less `MACHINE.lead`
 *
 * and if it does not fit, **the camera does not move**. That is a strong rule with a good
 * consequence: a run of silent occurrences cannot afford a move between them, so the shot that
 * opens the run has to contain the whole run — which is exactly the question the whole-scenario
 * planner below is for. The alternative, compressing the move into whatever room is left, produces
 * a camera that lurches faster the less time it has, which is the opposite of what the frames want.
 */
interface MoveWindow {
  readonly opens: number;
  readonly closes: number;
  readonly capacity: number;
  readonly affordable: boolean;
  /**
   * Whether a move here has to be taken out of the previous arrival's stillness.
   *
   * Reported so the diagnostic can say when a film has spent an arrival on a camera move, and *not*
   * priced — see `MACHINE.arrivalHold` for why an intrusion price was written and then removed.
   */
  readonly intrudes: boolean;
}

/**
 * A candidate shot, in the canonical set.
 *
 * Candidates are **deduplicated by perception** before the planner ever sees them (`canonicalise`),
 * which is where hysteresis lives. Two rectangles that differ by three percent of the frame are one
 * shot, so a move between them is not a decision the planner can make badly — it is not a decision
 * the planner can make at all. Doing it in the candidate set rather than in the cost function is
 * deliberate: a deadband expressed as a penalty is a threshold somebody will later tune, and a
 * deadband expressed as identity is a property a test can assert.
 */
interface Candidate {
  readonly view: Viewport;
  readonly kind: ShotVocabulary;
  /** Which occurrences this candidate was generated to serve. For the diagnostic only. */
  readonly serves: readonly number[];
}

export interface MachineShot extends CameraShot {
  /** Which occurrence this is, so a shot can be lined up with a beat without matching frames. */
  readonly index: number;
  /** Which of the three things it is. */
  readonly shot: ShotVocabulary;
  /** When the camera starts moving, and for how long. Absent on a hold. */
  readonly movesAt?: number;
  readonly travel?: number;
  readonly reason: string;
  /** What the event label of this occurrence comes out at, in this shot. */
  readonly eventPx: number;
}

export interface MachinePlan {
  readonly track: readonly CameraKey[];
  /** One per occurrence, including the ones that moved nothing. The record of what was decided. */
  readonly shots: readonly MachineShot[];
  /** The canonical overview: the shot the film opens on and the shot it ends on, by identity. */
  readonly overview: Viewport;
  /** Everything the planner had to choose between, so the choice can be second-guessed. */
  readonly candidates: readonly {
    readonly kind: ShotVocabulary;
    readonly view: Viewport;
    readonly serves: readonly number[];
  }[];
}

/**
 * The canonical whole-machine overview.
 *
 * One composition, derived from the layout and the frame and from nothing else — not from the run,
 * not from where the camera happens to be, and not from which occurrence is asking. It is the shot
 * the film opens on and the shot it closes on, and because it is computed here and compared by
 * value everywhere, "the film finishes on the canonical overview" is checkable rather than
 * approximately true.
 */
export function canonicalOverview(layout: MachineLayout, aspect: number): Viewport {
  return fitTo(layout.bounds, layout.bounds, { aspect, pad: CAMERA.revealPad });
}

/** Whether two viewports are the same shot as far as an eye is concerned. */
export function sameShot(a: Viewport, b: Viewport, aspect: number): boolean {
  const scale = Math.abs(a.width - b.width) / Math.max(a.width, b.width);
  const offset = Math.max(
    Math.abs(a.cx - b.cx) / a.width,
    (Math.abs(a.cy - b.cy) * aspect) / a.width,
  );
  return scale <= MACHINE.deadbandScale && offset <= MACHINE.deadbandOffset;
}

/**
 * Fold a raw candidate onto the canonical set.
 *
 * Two rules, and the first one is the answer to "the elevator's shots are slightly zoomed and
 * slightly off-centre for no reason". A candidate that is *nearly* the overview becomes the
 * overview exactly — because a shot at ninety percent of the overview's width shows ninety percent
 * of the machine at a type size nobody can tell apart from the overview's, and the only thing its
 * being a different rectangle achieves is a camera move at each end of it. The second rule is the
 * plain deadband against the rest of the set.
 */
function canonicalise(
  candidate: Candidate,
  overview: Viewport,
  set: readonly Candidate[],
  aspect: number,
): Candidate | undefined {
  if (
    candidate.view.width >= overview.width * MACHINE.overviewSnap ||
    sameShot(candidate.view, overview, aspect)
  ) {
    return undefined;
  }
  for (const existing of set) {
    if (sameShot(candidate.view, existing.view, aspect)) return undefined;
  }
  return candidate;
}

/**
 * The camera plan, chosen over the whole scenario at once.
 *
 * ## Why this is a dynamic program and not a loop
 *
 * sprint:19's planner was `shotFor` in a loop: each occurrence was decided against the shot the
 * previous one left behind, and nothing ever looked forward. Every individual decision it made was
 * defensible and the sequence it produced was not — eleven moves in thirteen occurrences on the
 * leased runner, ten of them pans at an identical scale, because each occurrence in turn nudged the
 * frame far enough to justify a nudge. A greedy planner cannot see that four small moves in a row
 * are one wrong decision rather than four right ones.
 *
 * Everything needed to see it is available before rendering starts: the whole graph, every
 * occurrence in order, every narration duration, and therefore exactly which occurrences can afford
 * a move at all. So the shot sequence is chosen as a sequence:
 *
 *     candidates    the canonical overview, plus one shot per run of consecutive occurrences
 *                   within a short horizon, deduplicated by perception
 *     feasibility   a shot must contain every essential bound of the occurrences it covers, and a
 *                   move onto it must fit in that occurrence's move window
 *     cost          how much legibility each occurrence loses in the shot it is given, plus a
 *                   fixed price per move
 *
 * and the minimum-cost path through that is the plan. The fixed price per move is the whole of the
 * hysteresis policy in one number: a move has to buy more readable frames than it costs, summed
 * over every occurrence it serves, or the plan holds instead. Nothing else in here says "do not
 * bounce"; bouncing is simply expensive.
 *
 * ## What the shape guarantees
 *
 * The film opens on the canonical overview and ends on it, by construction rather than by policy —
 * the first key and the last key are the same object. In between, the overview is an ordinary
 * candidate that competes on cost, which retires sprint:19's special rule that the run "may not
 * hold the overview": it no longer needs saying, because holding the overview costs legibility on
 * every occurrence and the planner will pay for a closer shot the moment that is cheaper.
 */
export function machinePlan(
  layout: MachineLayout,
  beats: readonly { readonly index: number; readonly from: number }[],
  takes: readonly string[],
  span: { readonly from: number; readonly until: number; readonly end?: number },
  aspect: number = 16 / 9,
  viewportWidth: number = 1920,
): MachinePlan {
  const overview = canonicalOverview(layout, aspect);
  const widest = widestShot(viewportWidth);
  const contextCap = contextShot(viewportWidth);
  const ordered = [...beats]
    .sort((a, b) => a.from - b.from)
    .filter((beat) => takes[beat.index] !== undefined);

  if (ordered.length === 0) {
    return {
      track: [
        { frame: span.from, view: overview, travel: 1 },
        { frame: Math.max(span.until, span.from), view: overview, travel: 1 },
      ],
      shots: [],
      overview,
      candidates: [],
    };
  }

  /* ---- what each occurrence needs, and when the camera may move for it ---- */

  const essential = ordered.map((beat) =>
    essentialBounds(layout, takes[beat.index] as string),
  );
  const preferred = ordered.map((beat) =>
    occurrenceBounds(layout, takes[beat.index] as string, aspect, contextCap),
  );

  const windows: MoveWindow[] = ordered.map((beat, position) => {
    const previous = ordered[position - 1];
    const opens =
      previous === undefined
        ? span.from + MACHINE.establish
        : previous.from +
          Math.max(1, Math.min(MACHINE.cross, beat.from - previous.from)) +
          MACHINE.arrivalQuiet;
    const closes = beat.from - MACHINE.lead;
    const capacity = closes - opens;
    const settled =
      previous === undefined
        ? span.from
        : previous.from +
          Math.max(1, Math.min(MACHINE.cross, beat.from - previous.from)) +
          MACHINE.arrivalHold;
    return {
      opens,
      closes,
      capacity,
      affordable: capacity >= MACHINE.minTravel,
      intrudes: closes - settled < MACHINE.minTravel,
    };
  });

  /* ---- the candidate set ---- */

  const candidates: Candidate[] = [{ view: overview, kind: "overview", serves: [] }];
  for (let from = 0; from < ordered.length; from += 1) {
    let covered = preferred[from] as Rect;
    let hard = essential[from] as Rect;
    for (let to = from; to < Math.min(ordered.length, from + MACHINE.horizon); to += 1) {
      if (to > from) {
        covered = union([covered, preferred[to] as Rect]);
        hard = union([hard, essential[to] as Rect]);
      }
      // The context an arrival brings is a preference: if taking it would push the shot past the
      // cap, fall back to the part that may not be cropped rather than dropping the candidate.
      const bounds =
        fitWidth(covered, aspect, MACHINE.shotPad) > contextCap ? hard : covered;
      const view = fitTo(bounds, layout.bounds, {
        aspect,
        widest,
        pad: MACHINE.shotPad,
      });
      const serves: number[] = [];
      for (let index = from; index <= to; index += 1) serves.push(index);
      const folded = canonicalise(
        { view, kind: "local", serves },
        overview,
        candidates,
        aspect,
      );
      if (folded !== undefined) candidates.push(folded);
    }
  }

  /* ---- feasibility and cost ---- */

  const rect = (view: Viewport): Rect => viewRect(view, aspect);
  const holds = (view: Viewport, bounds: Rect): boolean =>
    marginOf(bounds, rect(view)) >= 0;

  /**
   * What one occurrence pays for being shown in one shot.
   *
   * In screen pixels of event label, and **bent at the legibility floor**, which is the correction
   * the first integrated run forced. A linear shortfall says a fifteen-pixel label is twelve pixels
   * worse than a comfortable one and a twenty-pixel label is seven — a difference of degree. It is
   * not a difference of degree. Above `MACHINE.eventPx` a label is read and getting closer only
   * makes it pleasanter; below it the label is not read at all and the shot has stopped answering
   * the question it exists to answer.
   *
   * Priced linearly, the leased runner held its canonical overview for twelve of thirteen
   * occurrences: at fifteen pixels a word, every move looked like it was buying comfort rather than
   * meaning, and twelve small comforts do not outweigh eleven camera moves. That is the greedy
   * camera's mistake with the sign reversed, and it was caught by rendering the table rather than
   * by reasoning about the constant.
   */
  const shortfall = (view: Viewport): number => {
    const px = (MACHINE.event * viewportWidth) / view.width;
    if (px >= MACHINE.readablePx) return 0;
    const comfort = MACHINE.readablePx - Math.max(px, MACHINE.eventPx);
    const illegible = Math.max(0, MACHINE.eventPx - px);
    return comfort + MACHINE.illegiblePrice * illegible;
  };

  const INFEASIBLE = Number.POSITIVE_INFINITY;
  const stay = candidates.map((candidate) =>
    ordered.map((_, position) =>
      holds(candidate.view, essential[position] as Rect)
        ? shortfall(candidate.view)
        : INFEASIBLE,
    ),
  );

  // Best cost of covering occurrences `position..end` given the camera is already on `shot`.
  const best: number[][] = ordered.map(() => candidates.map(() => INFEASIBLE));
  const chosen: number[][] = ordered.map(() => candidates.map(() => -1));

  for (let position = ordered.length - 1; position >= 0; position -= 1) {
    for (let shot = 0; shot < candidates.length; shot += 1) {
      let bestCost = INFEASIBLE;
      let bestNext = -1;
      for (let next = 0; next < candidates.length; next += 1) {
        if (next !== shot) {
          // A move has to be affordable in time and has to be worth its perceptual price.
          if (!(windows[position] as MoveWindow).affordable) continue;
        }
        const here = (stay[next] as number[])[position] as number;
        if (!Number.isFinite(here)) continue;
        const after =
          position + 1 === ordered.length
            ? 0
            : ((best[position + 1] as number[])[next] as number);
        if (!Number.isFinite(after)) continue;
        const cost = here + after + (next === shot ? 0 : MACHINE.movePrice);
        if (cost < bestCost) {
          bestCost = cost;
          bestNext = next;
        }
      }
      (best[position] as number[])[shot] = bestCost;
      (chosen[position] as number[])[shot] = bestNext;
    }
  }

  /* ---- walk the plan out into keys ---- */

  const overviewIndex = 0;
  const stops: { frame: number; view: Viewport; travel?: number }[] = [
    { frame: span.from, view: overview },
  ];
  const shots: MachineShot[] = [];
  let held = overviewIndex;
  let current = overview;

  for (let position = 0; position < ordered.length; position += 1) {
    const beat = ordered[position] as { index: number; from: number };
    const pick = (chosen[position] as number[])[held] as number;
    const next = pick >= 0 ? pick : held;
    const candidate = candidates[next] as Candidate;
    const window = windows[position] as MoveWindow;
    const eventPx = (MACHINE.event * viewportWidth) / candidate.view.width;

    if (next === held) {
      shots.push({
        index: beat.index,
        frame: beat.from,
        id: takes[beat.index] as string,
        kind: "hold",
        shot: next === overviewIndex ? "overview" : "retained",
        view: candidate.view,
        eventPx,
        // Two different holds, and conflating them sent task:103 looking for a price that was
        // never paid. A move is refused either because it was not *worth* its perceptual price or
        // because there was no *room* for it between the previous arrival and this occurrence —
        // and the second is not a judgement the planner made, it is a window it was handed. The
        // leased runner has both: it declines a move it could afford at #6, and at #10 and #11 it
        // has 14 and 11 frames against a 16-frame minimum and never prices anything at all.
        reason:
          next === overviewIndex && position === 0
            ? "opens on the canonical overview"
            : window.affordable
              ? `holds: ${eventPx.toFixed(0)}px event label, no move worth ${MACHINE.movePrice}px`
              : `holds: ${eventPx.toFixed(0)}px event label, no room to move ` +
                `(${Math.max(0, window.capacity)} of ${MACHINE.minTravel} frames)`,
      });
      continue;
    }

    const wanted = paceOf(current, candidate.view, MACHINE.minTravel, CAMERA.maxTravel);
    const travel = Math.max(
      MACHINE.minTravel,
      Math.min(wanted, window.capacity, CAMERA.maxTravel),
    );
    const movesAt = Math.max(
      stops.at(-1)?.frame ?? span.from,
      window.opens,
      window.closes - travel,
    );
    stops.push({ frame: movesAt, view: candidate.view, travel });
    shots.push({
      index: beat.index,
      frame: beat.from,
      id: takes[beat.index] as string,
      kind: candidate.kind === "overview" ? "recompose" : "recompose",
      shot: candidate.kind,
      view: candidate.view,
      movesAt,
      travel,
      eventPx,
      reason:
        candidate.kind === "overview"
          ? "back to the canonical overview"
          : `${candidate.serves.length > 1 ? `covers ${candidate.serves.length} occurrences, ` : ""}` +
            `${eventPx.toFixed(0)}px event label`,
    });
    held = next;
    current = candidate.view;
  }

  /* ---- and finish on the canonical overview, exactly ---- */

  /**
   * The closing shot is *budgeted* rather than left over.
   *
   * sprint:19's plan pulled back the instant the narration stopped and then held whatever the
   * author's `post_say` happened to leave — which is how both films ended up with nine seconds of
   * silence, of which four and a third were a camera travelling and the rest was however much was
   * left. Measured on the baseline and confirmed: 130 frames of pull-back and 140 of overview, from
   * a shot the planner had already widened most of the way there.
   *
   * So the move is placed against the *end* of the film and given exactly the settle it needs: it
   * starts late enough that `MACHINE.closingHold` frames of motionless canonical overview follow
   * it, and never before the narration has finished. If the author has written more silence than
   * that, the extra is spent holding the last occurrence's shot — which is a picture of something —
   * rather than sitting on the overview, which after the first few seconds is a picture of nothing
   * happening.
   */
  const closingTravel = paceOf(
    current,
    overview,
    MACHINE.minTravel,
    MACHINE.revealTravel,
  );
  const closing = Math.max(
    span.until,
    Math.min(span.end ?? span.until, span.until),
    Math.max(span.until, (span.end ?? span.until) - closingTravel - MACHINE.closingHold),
  );
  stops.push({ frame: closing, view: overview, travel: closingTravel });

  const track: CameraKey[] = stops.map((stop, index) => {
    if (index === 0) return { frame: stop.frame, view: stop.view, travel: 1 };
    const previous = stops[index - 1] as { frame: number; view: Viewport };
    const next = stops[index + 1];
    const gap = next === undefined ? Infinity : Math.max(1, next.frame - stop.frame);
    const suggested =
      stop.travel ??
      paceOf(previous.view, stop.view, MACHINE.minTravel, CAMERA.maxTravel);
    return {
      frame: stop.frame,
      view: stop.view,
      travel: Math.max(1, Math.min(suggested, gap)),
    };
  });

  return {
    track,
    shots,
    overview,
    candidates: candidates.map((candidate) => ({
      kind: candidate.kind,
      view: candidate.view,
      serves: candidate.serves,
    })),
  };
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
