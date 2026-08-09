import type {
  AuthoredOccurrence,
  AuthoredState,
  AuthoredTransition,
} from "../presentation/machine.ts";
import { fitWidth, union, type Point, type Rect } from "./camera.ts";
import {
  DEFAULT_LAYOUT,
  layoutMachine,
  type LayoutPolicy,
  type MachineEdge,
  type MachineLayout,
} from "./machine.ts";
import { MACHINE, contextShot } from "./theme.ts";

/**
 * Auditioning a layout instead of tuning one.
 *
 * ## Why this exists
 *
 * sprint:19 asked dagre for a layout and took the answer, which is the right thing to do the first
 * time. It produced an elevator that photographs well and a leased job runner that comes out
 * 2.88:1 against a 16:9 frame — so the one shot that has to show the whole machine shows its event
 * labels at sixteen pixels, and four transitions in that film are never legible in any frame
 * (dragon:28). The available responses were to shrink the type, which is refused, or to send the
 * camera closer, which cannot rescue an atlas that was never intelligible whole.
 *
 * There is a third, and it is the one this round is about. **A layout is not one answer, it is a
 * search.** Everything the search needs is known before a single frame is rendered: the whole
 * topology, every label's text, the parallel and bidirectional pairs, the self-loops, the complete
 * scenario, the final aspect ratio, and how much of the frame the chrome and the ledger have
 * already taken. Nothing about that is available to a person drawing a statechart by hand, and
 * nothing about it is available to a layout engine called once with defaults.
 *
 * ## The objective, which is not "smaller"
 *
 * The temptation is to score area and elect the most compact candidate. That is wrong, and it is
 * wrong in a way that would have looked like success: the compact layout is the one that stacks
 * six sibling branches into two columns and puts a sixty-five character label across a state. So
 * the score has two halves and they pull against each other.
 *
 *     legibility    what the type comes out at in the canonical overview, which is a pure
 *                   function of how well the machine's aspect matches the frame's
 *     integrity     whether anything overlaps anything, how many edges cross, whether parallel
 *                   transitions are still two visibly different routes, and whether the run's own
 *                   path stays short
 *
 * Integrity failures are priced as *penalties against* legibility rather than as tie-breakers,
 * because a machine nobody can read at the overview and a machine with a label lying across a
 * plate are both simply broken, and the second one is broken in a way a scalar loves to trade away.
 *
 * ## The knob nobody would have authored
 *
 * The single most effective candidate axis turns out to be `labelMeasure` — how many characters an
 * event label wraps to — and it is effective because it is not really typography. It is the graph's
 * aspect ratio with a different name. Narrow the measure and every label grows a line, every rank
 * gets shorter, and the whole machine gets taller and thinner; widen it and the machine spreads.
 * The overview fits `max(W, H * frameAspect)` into the frame, so the best possible overview happens
 * exactly when the machine's aspect *equals* the frame's — and the elevator (too tall) and the
 * leased runner (too wide) therefore want the measure moved in opposite directions by the same
 * rule. That is the strongest available evidence that this is a real objective and not a knob
 * being twiddled until one example improves: a constant that helped both films could only be a
 * constant that had been set wrong, and this is not a constant.
 *
 * ## What is not allowed in here
 *
 * No state name, transition identity, coordinate or topology shape appears anywhere below, and no
 * candidate is generated for a particular machine. Every machine gets the same grid, scored the
 * same way, and the elected policy is whatever wins. If the incumbent wins, the incumbent wins,
 * and that is a result rather than a wasted round.
 */

/** What a candidate is measured on. Every field is "lower is worse" except the pixel sizes. */
export interface LayoutScore {
  /** Screen pixels a state's name comes out at, in the canonical overview. The headline. */
  readonly stateNamePx: number;
  /** ...and an event label. What dragon:28 is about. */
  readonly eventLabelPx: number;
  /** How far the machine's aspect is from the frame's, as a log ratio. Zero is a perfect fit. */
  readonly aspectMiss: number;

  /* ---- integrity: node layout ---- */
  /** Overlapping area between state boxes, as a fraction of the smaller box. Should be zero. */
  readonly nodeOverlap: number;

  /* ---- integrity: routing and labels, scored apart from the nodes ---- */
  /** Overlapping area between event labels. */
  readonly labelOverlap: number;
  /** Event labels lying across state plates. */
  readonly labelOnNode: number;
  /** Event labels lying across routes that are not their own. */
  readonly labelOnEdge: number;
  /** How many pairs of routes cross. */
  readonly crossings: number;
  /**
   * Parallel and bidirectional pairs whose two routes are not visibly apart.
   *
   * Counted rather than measured because it is a yes-or-no question for a viewer: either the two
   * transitions between one pair of states read as two roads, or the picture is lying about the
   * machine having two of them.
   */
  readonly ambiguousPairs: number;
  /** Self-loops whose arc or caption lands on something else. */
  readonly loopCollisions: number;

  /* ---- shape ---- */
  /** Total routed length, in units of the machine's own diagonal. */
  readonly routedLength: number;
  /** The same, weighted by how often the scenario takes each edge. */
  readonly scenarioLength: number;
  /**
   * How tightly the states the run keeps coming back to sit together, as a fraction of the whole.
   *
   * A machine whose recurrent core is spread across the map makes the camera commute; one whose
   * core is compact lets a whole act happen in one shot. Measured over the states the scenario
   * visits more than once, which is a fact about the run and is used here only to *score*, never
   * to place anything.
   */
  readonly coreSpan: number;
  /** How much of the frame the machine actually uses at the overview. */
  readonly utilization: number;
  /**
   * What fraction of the scenario's occurrences the camera will be able to get closer to.
   *
   * The signal the first integrated run was missing, and the one that turns "the leased runner is
   * ugly" into a number. A shot exists for an occurrence only if the source, the route, the label
   * and the destination fit into something materially tighter than the canonical overview; when
   * they do not, the only shot that contains the transition *is* the overview, and the film shows
   * that transition at whatever the overview's type size happens to be, forever.
   *
   * On the leased runner's incumbent layout the recurrent cycle — `Running -> Retry wait ->
   * Queued -> Claimed -> Running`, the thing the film says three times — is spread across the full
   * width of the map, so four of its thirteen occurrences have no closer shot and drag eight more
   * along with them. The camera plan for that film is not a camera failure and no camera policy can
   * fix it. This is the layout being scored on whether the camera will be *able* to do its job,
   * which is a question only something that can see the whole scenario before laying anything out
   * is in a position to ask.
   *
   * It reads the scenario, and it reads it to *score* rather than to place: no coordinate anywhere
   * in the layout depends on the run, and permuting the scenario changes neither this number nor
   * any position, because it is a fact about the multiset of transitions taken.
   */
  readonly framable: number;

  /** The single number the election is decided on. Higher is better. */
  readonly total: number;
}

export interface LayoutCandidate {
  readonly name: string;
  readonly policy: LayoutPolicy;
  readonly layout: MachineLayout;
  readonly score: LayoutScore;
}

/** The window the graph is drawn into, in screen pixels, after every band has taken its share. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export interface Audition {
  readonly viewport: Viewport;
  readonly aspect: number;
  readonly candidates: readonly LayoutCandidate[];
  readonly winner: LayoutCandidate;
  /** The incumbent, so the report can always say what the change bought. */
  readonly incumbent: LayoutCandidate;
}

type Machine = {
  readonly states: readonly AuthoredState[];
  readonly transitions: readonly AuthoredTransition[];
  readonly scenario?: readonly AuthoredOccurrence[];
};

/**
 * The measures a label may wrap to.
 *
 * A ladder rather than a continuous search, because dagre's output is not continuous in this
 * parameter — a measure only matters when it changes how some label breaks — and because a fixed
 * ladder is trivially deterministic and reproducible. It spans from "two or three words a line",
 * which makes almost every machine taller than it is wide, to "most labels on one line", which
 * makes almost every machine wider than it is tall. Every real machine's best fit is somewhere
 * inside it, and one at either end is telling you it is off the ladder.
 */
const MEASURES = [12, 16, 20, 26, 34, 44] as const;

const RANKDIRS = ["TB", "LR"] as const;
const RANKERS = ["network-simplex", "tight-tree"] as const;

/**
 * How far the separation dial is leaned, either way.
 *
 * The same trade as `MEASURES` applied to the part of a machine's width that is gaps rather than
 * text: a hub's widest rank is the sum of what is in it plus the space between, and `labelMeasure`
 * can only reach the first term. Three positions rather than a ladder, because unlike the measure
 * this one is continuous in its effect and there is nothing to be gained from resolution — the
 * question is only which way to lean.
 */
const SPREADS = [0.5, 1, 1.8] as const;

/**
 * How much dagre is told to care about an edge the run takes.
 *
 * Weight one for a transition nobody takes, and this much more for each traversal. Deliberately
 * modest: dagre reads weight in the ranker and in the ordering pass, and a weight of ten makes the
 * untaken branches into afterthoughts hanging off a straight highway — which is precisely the
 * "fake linear machine" the whole body exists not to draw. Two per traversal is enough to break a
 * tie between two equally good orderings and not enough to buy a rank.
 */
const TRAVERSAL_WEIGHT = 2;

/**
 * How much of the overview's advertised legibility a layout forfeits by stranding its scenario.
 *
 * A layout whose every occurrence has a closer shot available shows its event labels at whatever
 * that shot gives, which is generally comfortable. One where nothing can be approached shows every
 * label at the overview's size for the length of the film. Half, so a layout that strands its
 * whole run is worth about half the headline it advertises — enough to overturn a two-pixel
 * difference in overview type, which is exactly the trade the leased runner presents, and not
 * enough to elect a layout with collisions in it.
 */
const FRAMABLE_PRICE = 0.5;

/**
 * What one pair of crossing routes costs, in pixels of state name.
 *
 * Raised from a quarter after the audition was drawn rather than merely scored. Two candidates for
 * the leased runner differed by two crossings and 1.7 pixels of type, the scalar preferred the
 * tangled one by a point and a half, and the panels made the disagreement obvious: the crossings
 * are all in one place — around the six-exit hub — and a knot of five lines under the busiest state
 * in the machine is not worth two pixels anywhere.
 *
 * Still small in absolute terms, and deliberately: a cyclic machine has crossings, and a price high
 * enough to eliminate them would elect the layout that unrolls the cycle into a chain, which is the
 * "fake linear highway" the whole body exists not to draw.
 */
const CROSSING_PRICE = 0.6;

/**
 * Every candidate, scored, with the winner elected.
 *
 * `aspect` is the frame the machine will actually be seen in — after the chrome band and the
 * execution ledger have taken theirs — and it is the input that makes this a global decision
 * rather than a local one.
 */
export function auditionLayouts(machine: Machine, viewport: Viewport): Audition {
  const weights = traversalWeights(machine);
  const scenarioWeighted = weights.size > 0;

  const policies: { name: string; policy: LayoutPolicy }[] = [];
  for (const rankdir of RANKDIRS) {
    for (const ranker of RANKERS) {
      for (const measure of MEASURES) {
        for (const spread of SPREADS) {
          for (const weighted of scenarioWeighted ? [false, true] : [false]) {
            policies.push({
              name:
                `${rankdir.toLowerCase()}-${ranker === "network-simplex" ? "simplex" : "tight"}` +
                `-m${measure}-s${spread}${weighted ? "-run" : ""}`,
              policy: {
                rankdir,
                ranker,
                labelMeasure: measure,
                spread,
                ...(weighted
                  ? {
                      weightOf: (id: string) =>
                        1 + TRAVERSAL_WEIGHT * (weights.get(id) ?? 0),
                    }
                  : {}),
              },
            });
          }
        }
      }
    }
  }

  const candidates = policies.map(({ name, policy }): LayoutCandidate => {
    const layout = layoutMachine(machine, policy);
    return { name, policy, layout, score: scoreLayout(layout, machine, viewport) };
  });

  const incumbentLayout = layoutMachine(machine, DEFAULT_LAYOUT);
  const incumbent: LayoutCandidate = {
    name: "incumbent",
    policy: DEFAULT_LAYOUT,
    layout: incumbentLayout,
    score: scoreLayout(incumbentLayout, machine, viewport),
  };

  // Deterministic to the last tie: the highest total, and among equals the one the fixed grid
  // produced first. No randomness, no clock, and no dependence on object iteration order.
  let winner = candidates[0] ?? incumbent;
  for (const candidate of candidates) {
    if (candidate.score.total > winner.score.total) winner = candidate;
  }
  return {
    viewport,
    aspect: viewport.width / viewport.height,
    candidates,
    winner,
    incumbent,
  };
}

/**
 * The layout a machine is actually drawn with.
 *
 * One entry point for the composition, the instrument and the tests, so there is exactly one
 * answer to "where is this state" in the whole system.
 */
export function electLayout(machine: Machine, viewport: Viewport): MachineLayout {
  return auditionLayouts(machine, viewport).winner.layout;
}

/** How many times the scenario takes each transition. Used to score, and on probation to place. */
function traversalWeights(machine: Machine): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const occurrence of machine.scenario ?? []) {
    counts.set(occurrence.take, (counts.get(occurrence.take) ?? 0) + 1);
  }
  return counts;
}

/* ------------------------------------------------------------------ scoring */

/** Overlapping area of two rectangles. */
function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width <= 0 || height <= 0 ? 0 : width * height;
}

/** ...as a fraction of the smaller of the two, so a big box does not hide a small collision. */
function overlapFraction(a: Rect, b: Rect): number {
  const area = Math.min(a.width * a.height, b.width * b.height);
  return area <= 0 ? 0 : overlapArea(a, b) / area;
}

function segmentsCross(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const side = (p: Point, q: Point, r: Point): number =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = side(a1, a2, b1);
  const d2 = side(a1, a2, b2);
  const d3 = side(b1, b2, a1);
  const d4 = side(b1, b2, a2);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function crossesRect(points: readonly Point[], rect: Rect): boolean {
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1] as Point;
    const b = points[index] as Point;
    const corners: Point[] = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height },
    ];
    for (let corner = 0; corner < 4; corner += 1) {
      if (
        segmentsCross(a, b, corners[corner] as Point, corners[(corner + 1) % 4] as Point)
      ) {
        return true;
      }
    }
  }
  return false;
}

function polylineLengthOf(points: readonly Point[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1] as Point;
    const b = points[index] as Point;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/** Whether two routes between the same pair of states are visibly two routes. */
function apart(a: MachineEdge, b: MachineEdge, scale: number): boolean {
  // Compared at the labels rather than at the curves: two transitions between one pair of states
  // are told apart by what fires them, so the question that matters is whether a viewer can see
  // which caption belongs to which road, not whether the roads are technically distinct splines.
  const gap = Math.hypot(
    a.label.x + a.label.width / 2 - (b.label.x + b.label.width / 2),
    a.label.y + a.label.height / 2 - (b.label.y + b.label.height / 2),
  );
  return gap > scale;
}

/**
 * Score one candidate.
 *
 * The headline is `stateNamePx`, which is what the canonical overview will actually put on the
 * screen. Everything else is a penalty subtracted from it in units of pixels — deliberately, so
 * that the trade is legible: "this candidate is worth four pixels of state name, and it is paying
 * six for a label lying across a plate."
 */
export function scoreLayout(
  layout: MachineLayout,
  machine: Machine,
  viewport: Viewport,
): LayoutScore {
  const aspect = viewport.width / viewport.height;
  const bounds = layout.bounds;
  const overview = fitWidth(bounds, aspect, 0.035);
  // Screen pixels, against the window the graph was actually given. Not against 1920: a rail that
  // takes three hundred pixels off the left takes them off every state name too, and a score that
  // measured against the whole frame would price a ledger as free.
  const stateNamePx = (MACHINE.label * viewport.width) / overview;
  const eventLabelPx = (MACHINE.event * viewport.width) / overview;
  const diagonal = Math.hypot(bounds.width, bounds.height) || 1;

  let nodeOverlap = 0;
  for (let i = 0; i < layout.nodes.length; i += 1) {
    for (let j = i + 1; j < layout.nodes.length; j += 1) {
      nodeOverlap += overlapFraction(
        (layout.nodes[i] as { box: Rect }).box,
        (layout.nodes[j] as { box: Rect }).box,
      );
    }
  }

  let labelOverlap = 0;
  for (let i = 0; i < layout.edges.length; i += 1) {
    for (let j = i + 1; j < layout.edges.length; j += 1) {
      labelOverlap += overlapFraction(
        (layout.edges[i] as MachineEdge).label,
        (layout.edges[j] as MachineEdge).label,
      );
    }
  }

  let labelOnNode = 0;
  for (const edge of layout.edges) {
    for (const node of layout.nodes) {
      labelOnNode += overlapFraction(edge.label, node.rect);
    }
  }

  let labelOnEdge = 0;
  let crossings = 0;
  let loopCollisions = 0;
  for (let i = 0; i < layout.edges.length; i += 1) {
    const a = layout.edges[i] as MachineEdge;
    for (const other of layout.edges) {
      if (other.id === a.id) continue;
      if (crossesRect(other.points, a.label)) labelOnEdge += 1;
    }
    if (a.self) {
      for (const node of layout.nodes) {
        if (node.id === a.from) continue;
        if (crossesRect(a.points, node.rect) || overlapFraction(a.label, node.rect) > 0) {
          loopCollisions += 1;
        }
      }
    }
    for (let j = i + 1; j < layout.edges.length; j += 1) {
      const b = layout.edges[j] as MachineEdge;
      if (a.self || b.self) continue;
      // Routes that share an endpoint meet there by construction; that is not a crossing.
      if (a.from === b.from || a.to === b.to || a.from === b.to || a.to === b.from)
        continue;
      let crossed = false;
      for (let p = 1; p < a.points.length && !crossed; p += 1) {
        for (let q = 1; q < b.points.length && !crossed; q += 1) {
          crossed = segmentsCross(
            a.points[p - 1] as Point,
            a.points[p] as Point,
            b.points[q - 1] as Point,
            b.points[q] as Point,
          );
        }
      }
      if (crossed) crossings += 1;
    }
  }

  // Parallel and bidirectional pairs, told apart by their captions being visibly apart. The
  // threshold is one state plate's minimum width, which is the smallest distance anything on this
  // map is ever asked to be separated by.
  let ambiguousPairs = 0;
  for (let i = 0; i < layout.edges.length; i += 1) {
    const a = layout.edges[i] as MachineEdge;
    if (a.self) continue;
    for (let j = i + 1; j < layout.edges.length; j += 1) {
      const b = layout.edges[j] as MachineEdge;
      if (b.self) continue;
      const parallel = a.from === b.from && a.to === b.to;
      const opposed = a.from === b.to && a.to === b.from;
      if (!parallel && !opposed) continue;
      if (!apart(a, b, MACHINE.minPlateWidth)) ambiguousPairs += 1;
    }
  }

  const counts = traversalWeights(machine);

  // Can the camera ever show this transition's label at a size somebody can read? The threshold is
  // `contextShot` — where an event label stops being legible — rather than merely "closer than the
  // overview", and the difference is not pedantic. The first version asked whether a tighter shot
  // *existed*, and a layout scored 100% on it whose tighter shots still put the label at seventeen
  // pixels. The question a viewer has is whether they will ever get to read the sentence on the
  // edge, so that is the question.
  const legibleShot = contextShot(viewport.width);
  let framable = 0;
  let occurrences = 0;
  for (const [id, times] of counts) {
    const edge = layout.edgeById.get(id);
    if (edge === undefined) continue;
    const source = layout.byId.get(edge.from);
    const target = layout.byId.get(edge.to);
    const essential = union([
      ...(source === undefined ? [] : [source.box]),
      ...(target === undefined ? [] : [target.box]),
      edge.label,
      ...edge.points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })),
    ]);
    occurrences += times;
    if (fitWidth(essential, aspect, MACHINE.shotPad) <= legibleShot) framable += times;
  }
  const framableFraction = occurrences === 0 ? 1 : framable / occurrences;

  let routedLength = 0;
  let scenarioLength = 0;
  for (const edge of layout.edges) {
    const length = polylineLengthOf(edge.points) / diagonal;
    routedLength += length;
    scenarioLength += length * (counts.get(edge.id) ?? 0);
  }

  // The recurrent core: the states the run occupies more than once. How tightly they sit together
  // is how much of an act can happen without the camera commuting.
  const visits = new Map<string, number>();
  for (const occurrence of machine.scenario ?? []) {
    const transition = machine.transitions.find((entry) => entry.id === occurrence.take);
    if (transition === undefined) continue;
    visits.set(transition.to, (visits.get(transition.to) ?? 0) + 1);
  }
  const core = layout.nodes.filter((node) => (visits.get(node.id) ?? 0) > 1);
  const coreSpan =
    core.length < 2
      ? 0
      : Math.hypot(
          Math.max(...core.map((node) => node.rect.x + node.rect.width)) -
            Math.min(...core.map((node) => node.rect.x)),
          Math.max(...core.map((node) => node.rect.y + node.rect.height)) -
            Math.min(...core.map((node) => node.rect.y)),
        ) / diagonal;

  const frameArea = overview * (overview / aspect);
  const utilization = frameArea <= 0 ? 0 : (bounds.width * bounds.height) / frameArea;
  const aspectMiss = Math.abs(Math.log(bounds.width / bounds.height / aspect));

  /**
   * The trade, in pixels of state name.
   *
   * Collisions are priced brutally — twelve pixels for a full label-on-plate overlap against a
   * headline that is rarely more than thirty — because a candidate that reads two pixels larger
   * and has a caption lying across a state has not won anything. Crossings and ambiguity are
   * priced gently: a cyclic machine has crossings, and pretending otherwise elects the layout that
   * unrolls the cycle.
   */
  const total =
    stateNamePx -
    40 * nodeOverlap -
    18 * labelOverlap -
    24 * labelOnNode -
    0.6 * labelOnEdge -
    CROSSING_PRICE * crossings -
    2.5 * ambiguousPairs -
    3 * loopCollisions -
    0.35 * routedLength -
    0.3 * scenarioLength -
    2 * coreSpan -
    // Priced against the headline rather than beside it: an occurrence the camera can never
    // approach is shown at the overview's type size for the whole film, so a layout that strands
    // half its scenario is worth roughly half the legibility its overview advertises.
    FRAMABLE_PRICE * (1 - framableFraction) * stateNamePx;

  return {
    stateNamePx,
    eventLabelPx,
    aspectMiss,
    nodeOverlap,
    labelOverlap,
    labelOnNode,
    labelOnEdge,
    crossings,
    ambiguousPairs,
    loopCollisions,
    routedLength,
    scenarioLength,
    coreSpan,
    utilization,
    framable: framableFraction,
    total,
  };
}

/* ----------------------------------------------------------------- printing */

function padLeft(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

/**
 * The audition as a table, best first.
 *
 * Every candidate, not only the winner, because the finding this round is trying to produce is
 * whether the search was worth running — and a report that printed only the elected policy could
 * never show that the incumbent came fourth by a pixel or first by six.
 */
export function formatAudition(audition: Audition, limit: number = 12): string {
  const lines: string[] = [];
  lines.push(
    `  layout audition   ${audition.candidates.length} candidates at ${audition.aspect.toFixed(2)}:1`,
  );
  lines.push(
    "  " +
      pad("candidate", 22) +
      padLeft("size", 8) +
      padLeft("name", 7) +
      padLeft("event", 7) +
      padLeft("aspect", 8) +
      padLeft("nodes", 7) +
      padLeft("labels", 8) +
      padLeft("cross", 7) +
      padLeft("ambig", 7) +
      padLeft("core", 7) +
      padLeft("frame", 7) +
      padLeft("total", 8),
  );

  const ranked = [...audition.candidates].sort((a, b) => b.score.total - a.score.total);
  const shown = ranked.slice(0, limit);
  if (!shown.some((candidate) => candidate === audition.winner))
    shown.push(audition.winner);

  const row = (candidate: LayoutCandidate, mark: string): string => {
    const s = candidate.score;
    const b = candidate.layout.bounds;
    return (
      "  " +
      pad(`${mark}${candidate.name}`, 22) +
      padLeft(`${Math.round(b.width)}x${Math.round(b.height)}`, 8) +
      padLeft(s.stateNamePx.toFixed(1), 7) +
      padLeft(s.eventLabelPx.toFixed(1), 7) +
      padLeft(s.aspectMiss.toFixed(2), 8) +
      padLeft(s.nodeOverlap.toFixed(2), 7) +
      padLeft((s.labelOverlap + s.labelOnNode).toFixed(2), 8) +
      padLeft(String(s.crossings), 7) +
      padLeft(String(s.ambiguousPairs), 7) +
      padLeft(s.coreSpan.toFixed(2), 7) +
      padLeft(`${Math.round(s.framable * 100)}%`, 7) +
      padLeft(s.total.toFixed(1), 8)
    );
  };

  for (const candidate of shown) {
    lines.push(row(candidate, candidate === audition.winner ? "* " : "  "));
  }
  lines.push(row(audition.incumbent, "= "));
  lines.push(
    `  elected           ${audition.winner.name}: rankdir ${audition.winner.policy.rankdir}, ` +
      `${audition.winner.policy.ranker}, measure ${audition.winner.policy.labelMeasure}` +
      `${audition.winner.policy.weightOf === undefined ? "" : ", scenario-weighted"}`,
  );
  lines.push(
    `  against incumbent state name ${audition.incumbent.score.stateNamePx.toFixed(1)} -> ` +
      `${audition.winner.score.stateNamePx.toFixed(1)}px, ` +
      `event ${audition.incumbent.score.eventLabelPx.toFixed(1)} -> ` +
      `${audition.winner.score.eventLabelPx.toFixed(1)}px`,
  );
  return lines.join("\n");
}
