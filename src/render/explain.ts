import type { Scene, Timeline } from "../compile/timeline.ts";
import { auditionLayouts, type Audition } from "./audition.ts";
import { ledgerBand, fitLedger, type LedgerFit } from "./ledger.ts";
import { machineOf, machinePlan, type MachineShot } from "./machine.ts";
import { viewRect, type Rect, type Viewport } from "./camera.ts";
import { subtitleFit } from "./subtitle.ts";
import { MACHINE, subtitleBand } from "./theme.ts";

/**
 * What a machine film decided, in numbers a person can check.
 *
 * Every policy in `./machine.ts` is a claim about perception — that a shot holds, that an arrival
 * registers, that a pull-back settles — and none of those claims is checkable from the code that
 * makes them. This is the instrument. It answers three questions about a rendered film without
 * rendering it:
 *
 *     where did the time go        per occurrence, in named phases
 *     what did the camera do       per occurrence, with the reason and the measurement
 *     what does the map cost       type sizes at the shots the film actually takes
 *
 * ## It reports, and derives nothing
 *
 * The load-bearing property, and the one worth defending: **this module calls the same functions
 * the composition calls, and computes no policy of its own.** A diagnostic that worked out its own
 * answer would be a second implementation of the renderer, and the first time the two disagreed
 * the instrument would be the thing everybody trusted. So the layout comes from `layoutMachine`,
 * the shots come from `machinePlan`, the phases come from `occurrencePhases`, and the frame budget
 * comes off the `Timeline` the renderer is handed. The only arithmetic here is turning frames into
 * milliseconds and world units into screen pixels.
 *
 * Nothing here is reachable from the presentation grammar, and nothing in the grammar can turn it
 * on, off, or sideways. It is a developer's instrument (`cuecraft explain`), and the reason it is
 * on the CLI rather than in a scratch script is that evidence nobody can reproduce is an anecdote.
 */

/** How a screen pixel relates to a world unit, at a given shot. 1080p, always. */
const FRAME_WIDTH = 1920;

/**
 * The phases of one occurrence, in frames.
 *
 * The decomposition is the point, and it is what the derived clock never made explicit. An
 * occurrence used to be one number — how long it owns the stage — and the composition spent that
 * number on three different things without anybody being able to see the split. Named, they are:
 *
 *     camera      the move that serves this occurrence, which happens *before* it and out of the
 *                 tail of the one before. Absent when the shot held.
 *     traversal   the traveller crossing. A motion, capped by the occurrence's own length.
 *     arrival     the single frame occupancy lands on. Not an interval.
 *     narration   what is being said over it, if anything, measured from the clip.
 *     hold        the stable frames after arrival: nothing moving, occupancy established. This is
 *                 the phase the round is about, and the one nothing was previously budgeting.
 *
 * `hold` stops at whichever comes first: the next occurrence, or the next camera move. A camera
 * that starts drifting away is not a stable frame however still the traveller is, and counting it
 * as one is exactly the self-deception the instrument exists to prevent.
 */
export interface OccurrencePhases {
  readonly index: number;
  readonly take: string;
  readonly narrated: boolean;
  /** The occurrence's own span. */
  readonly from: number;
  readonly until: number;
  /** The camera move serving it, if it made one. Frames, absolute. */
  readonly cameraFrom?: number;
  readonly cameraUntil?: number;
  /** The crossing. */
  readonly crossFrom: number;
  readonly crossUntil: number;
  /** Where occupancy lands: the frame the crossing ends. */
  readonly arrivesAt: number;
  /** How long the sentence over it runs past the arrival. Zero when silent. */
  readonly speakingAfterArrival: number;
  /** Stable frames after arrival: no traveller, no camera. */
  readonly hold: number;
}

/**
 * The phase decomposition for every occurrence in a scene.
 *
 * Consumed by the instrument and by the tests, and deliberately not by the renderer — the renderer
 * already has all of this and reading it back through a summary would be the derivation going the
 * wrong way. What the renderer and this share is the *plan*, which is the thing that actually has
 * to agree.
 */
export function occurrencePhases(
  scene: Scene,
  shots: readonly MachineShot[],
  crossFrames: number = MACHINE.cross,
): readonly OccurrencePhases[] {
  const takes =
    scene.body.kind === "machine" ? scene.body.scenario.map((entry) => entry.take) : [];
  const beats = [...scene.beats].sort((a, b) => a.from - b.from);
  const byIndex = new Map(shots.map((shot) => [shot.index, shot] as const));

  return beats.map((beat, position): OccurrencePhases => {
    const next = beats[position + 1];
    const shot = byIndex.get(beat.index);
    const nextShot = next === undefined ? undefined : byIndex.get(next.index);
    const cross = Math.max(1, Math.min(crossFrames, beat.durationInFrames));
    const arrivesAt = beat.from + cross;
    const until = beat.from + beat.durationInFrames;

    // The stable window ends at the next occurrence, or earlier if the camera sets off for it
    // first. `movesAt` is the frame the move begins, which is what a viewer sees.
    const disturbed = Math.min(until, nextShot?.movesAt ?? until);

    const clip = beat.clipIndex === undefined ? undefined : scene.clips[beat.clipIndex];
    const speakingUntil = clip === undefined ? 0 : clip.from + clip.durationInFrames;

    return {
      index: beat.index,
      take: takes[beat.index] ?? "?",
      narrated: beat.clipIndex !== undefined,
      from: beat.from,
      until,
      ...(shot?.movesAt === undefined
        ? {}
        : { cameraFrom: shot.movesAt, cameraUntil: shot.movesAt + (shot.travel ?? 0) }),
      crossFrom: beat.from,
      crossUntil: arrivesAt,
      arrivesAt,
      speakingAfterArrival: Math.max(0, speakingUntil - arrivesAt),
      hold: Math.max(0, disturbed - arrivesAt),
    };
  });
}

/** What the closing pull-back costs, and what it buys. */
export interface ClosingBudget {
  /** The frame the last occurrence's beat ends on. */
  readonly lastBeatEnds: number;
  /** When the pull-back starts, and how long it takes. */
  readonly pullsBackAt: number;
  readonly travel: number;
  /** Frames of settled, motionless canonical overview at the end of the film. */
  readonly settled: number;
  /** Everything after the last spoken frame, travel included. */
  readonly postRoll: number;
}

export interface MachineExplanation {
  readonly ordinal: number;
  readonly title: string;
  readonly fps: number;
  /** The window the camera was actually given, after chrome, subtitles and the ledger. */
  readonly viewport: { readonly width: number; readonly height: number };
  readonly aspect: number;
  readonly layout: {
    readonly states: number;
    readonly transitions: number;
    readonly bounds: Rect;
    readonly aspect: number;
  };
  /** The canonical overview, and what type it puts on the screen. */
  readonly overview: {
    readonly view: Viewport;
    readonly stateNamePx: number;
    readonly eventLabelPx: number;
  };
  readonly phases: readonly OccurrencePhases[];
  readonly shots: readonly MachineShot[];
  /** Screen pixels a state name and an event label come out at, per shot. */
  readonly legibility: readonly {
    readonly index: number;
    readonly width: number;
    readonly stateNamePx: number;
    readonly eventLabelPx: number;
    /** How much of the whole machine this shot already contains, by area. */
    readonly containsWhole: number;
  }[];
  readonly closing: ClosingBudget;
  /** Every layout that was considered, and the one that was elected. */
  readonly audition: Audition;
  /** How the execution ledger is set for this film, and how many entries it keeps. */
  readonly ledger: LedgerFit;
  readonly film: {
    readonly from: number;
    readonly durationInFrames: number;
    readonly preRoll: number;
    readonly narration: number;
    readonly postRoll: number;
  };
}

/** How large `size` world units come out on screen, in a shot this wide. */
function screenPx(size: number, viewWidth: number, framePx: number): number {
  return (size * framePx) / viewWidth;
}

/** How much of the machine a shot contains, as a fraction of the machine's area. */
function coverage(view: Viewport, aspect: number, bounds: Rect): number {
  const rect = viewRect(view, aspect);
  const width = Math.max(
    0,
    Math.min(rect.x + rect.width, bounds.x + bounds.width) - Math.max(rect.x, bounds.x),
  );
  const height = Math.max(
    0,
    Math.min(rect.y + rect.height, bounds.y + bounds.height) - Math.max(rect.y, bounds.y),
  );
  const area = bounds.width * bounds.height;
  return area <= 0 ? 1 : (width * height) / area;
}

/**
 * Explain every machine scene in a timeline.
 *
 * The band arithmetic is repeated from the composition rather than shared, and that is a real
 * decision rather than an oversight: what the composition does is *use* the number, and what this
 * does is *report* it, and a shared helper would make a mistake in the arithmetic invisible in
 * exactly the instrument built to catch one. The two are three lines each and a test asserts they
 * agree.
 */
export function explainMachines(timeline: Timeline): readonly MachineExplanation[] {
  const band =
    timeline.subtitles.length === 0 ? 0 : subtitleBand(subtitleFit(timeline.subtitles));

  return timeline.scenes
    .filter((scene) => scene.layout === "circuit")
    .map((scene) => explainScene(scene, timeline, band));
}

function explainScene(
  scene: Scene,
  timeline: Timeline,
  band: number,
): MachineExplanation {
  const machine = machineOf(scene.body);
  if (machine === undefined) throw new Error("not a machine");
  const viewport = {
    width: FRAME_WIDTH - ledgerBand(),
    height: 1080 - band,
  };
  const aspect = viewport.width / viewport.height;
  const audition = auditionLayouts(machine, viewport);
  const layout = audition.winner.layout;
  const ledger = fitLedger(machine);
  const takes = machine.scenario.map((entry) => entry.take);
  const plan = machinePlan(
    layout,
    scene.beats,
    takes,
    {
      from: scene.from,
      until: revealFrom(scene),
      end: scene.from + scene.durationInFrames,
    },
    aspect,
    viewport.width,
  );

  const whole = plan.overview;
  const phases = occurrencePhases(scene, plan.shots);

  const legibility = plan.shots.map((shot) => ({
    index: shot.index,
    width: shot.view.width,
    stateNamePx: screenPx(MACHINE.label, shot.view.width, viewport.width),
    eventLabelPx: screenPx(MACHINE.event, shot.view.width, viewport.width),
    containsWhole: coverage(shot.view, aspect, layout.bounds),
  }));

  const reveal = plan.track.at(-1);
  const filmEnds = scene.from + scene.durationInFrames;
  const lastBeat = [...scene.beats].sort((a, b) => a.from - b.from).at(-1);
  const pullsBackAt = reveal?.frame ?? filmEnds;
  const travel = reveal?.travel ?? 0;

  return {
    ordinal: scene.ordinal,
    title: scene.title,
    fps: timeline.fps,
    viewport,
    aspect,
    layout: {
      states: machine.states.length,
      transitions: machine.transitions.length,
      bounds: layout.bounds,
      aspect: layout.bounds.width / layout.bounds.height,
    },
    overview: {
      view: whole,
      stateNamePx: screenPx(MACHINE.label, whole.width, viewport.width),
      eventLabelPx: screenPx(MACHINE.event, whole.width, viewport.width),
    },
    phases,
    shots: plan.shots,
    legibility,
    closing: {
      lastBeatEnds:
        lastBeat === undefined ? filmEnds : lastBeat.from + lastBeat.durationInFrames,
      pullsBackAt,
      travel,
      settled: Math.max(0, filmEnds - (pullsBackAt + travel)),
      postRoll: Math.max(0, filmEnds - pullsBackAt),
    },
    audition,
    ledger,
    film: {
      from: scene.from,
      durationInFrames: scene.durationInFrames,
      preRoll: scene.narrationFrom - scene.from,
      narration: scene.narrationDurationInFrames,
      postRoll:
        scene.durationInFrames -
        (scene.narrationFrom - scene.from) -
        scene.narrationDurationInFrames,
    },
  };
}

/**
 * When the camera stops looking at occurrences.
 *
 * The composition's own rule (`revealFrom` in `./layouts.tsx`), repeated for the same reason the
 * band arithmetic is: this is the number the instrument is *checking*, and reading it out of the
 * thing being checked would make a wrong answer agree with itself.
 */
function revealFrom(scene: Scene): number {
  const lastAnchored = Math.max(-1, ...scene.anchors.map((anchor) => anchor.clipIndex));
  const trailing = scene.clips[lastAnchored + 1];
  if (trailing !== undefined) return trailing.from;
  const last = scene.clips.at(-1);
  return last === undefined
    ? scene.narrationFrom + scene.narrationDurationInFrames
    : last.from + last.durationInFrames;
}

/* ------------------------------------------------------------------ printing */

function ms(frames: number, fps: number): string {
  return `${Math.round((frames / fps) * 1000)}ms`;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

/**
 * The explanation as a table.
 *
 * Fixed-width and plain, because the consumer is a terminal beside a still frame and the comparison
 * that matters is between two runs of this on two versions of the policy.
 */
export function formatExplanation(explanation: MachineExplanation): string {
  const { fps } = explanation;
  const lines: string[] = [];

  lines.push(`slide ${explanation.ordinal}  ${explanation.title}`);
  lines.push(
    `  machine    ${explanation.layout.states} states, ${explanation.layout.transitions} transitions, ` +
      `${Math.round(explanation.layout.bounds.width)} x ${Math.round(explanation.layout.bounds.height)} units ` +
      `(${explanation.layout.aspect.toFixed(2)}:1)`,
  );
  lines.push(
    `  viewport   ${explanation.viewport.width} x ${explanation.viewport.height} px ` +
      `(${explanation.aspect.toFixed(2)}:1)`,
  );
  lines.push(
    `  overview   ${Math.round(explanation.overview.view.width)} units, ` +
      `state name ${explanation.overview.stateNamePx.toFixed(1)}px, ` +
      `event label ${explanation.overview.eventLabelPx.toFixed(1)}px`,
  );
  lines.push(
    `  film       ${explanation.film.durationInFrames} frames ` +
      `(${(explanation.film.durationInFrames / fps).toFixed(1)}s) = ` +
      `${explanation.film.preRoll} pre + ${explanation.film.narration} narration + ` +
      `${explanation.film.postRoll} post`,
  );
  lines.push("");

  lines.push(
    "  " +
      pad("#", 3) +
      pad("take", 20) +
      pad("mode", 9) +
      padLeft("from", 6) +
      padLeft("dur", 6) +
      padLeft("cross", 7) +
      padLeft("hold", 7) +
      padLeft("holdms", 8) +
      padLeft("say>arr", 9) +
      "  camera",
  );
  const byIndex = new Map(explanation.shots.map((shot) => [shot.index, shot] as const));

  for (const phase of explanation.phases) {
    const shot = byIndex.get(phase.index);
    const camera =
      shot === undefined
        ? ""
        : shot.kind === "hold"
          ? `${pad(shot.shot, 9)} ${Math.round(shot.view.width)}u ev ${shot.eventPx.toFixed(0)}px   ${shot.reason}`
          : `${pad(shot.shot, 9)} ${Math.round(shot.view.width)}u ev ${shot.eventPx.toFixed(0)}px ` +
            `move@${shot.movesAt}+${shot.travel}  ${shot.reason}`;
    lines.push(
      "  " +
        pad(String(phase.index + 1), 3) +
        pad(phase.take, 20) +
        pad(phase.narrated ? "narrated" : "silent", 9) +
        padLeft(String(phase.from), 6) +
        padLeft(String(phase.until - phase.from), 6) +
        padLeft(String(phase.crossUntil - phase.crossFrom), 7) +
        padLeft(String(phase.hold), 7) +
        padLeft(ms(phase.hold, fps), 8) +
        padLeft(String(phase.speakingAfterArrival), 9) +
        "  " +
        camera,
    );
  }

  lines.push("");
  const closing = explanation.closing;
  lines.push(
    `  closing    pulls back at ${closing.pullsBackAt} over ${closing.travel} frames ` +
      `(${ms(closing.travel, fps)}), then ${closing.settled} settled frames ` +
      `(${ms(closing.settled, fps)}); post-roll ${closing.postRoll} (${ms(closing.postRoll, fps)})`,
  );

  const silent = explanation.phases.filter((phase) => !phase.narrated);
  if (silent.length > 0) {
    const holds = silent.map((phase) => phase.hold);
    lines.push(
      `  silent     ${silent.length} occurrences, hold ${Math.min(...holds)}–${Math.max(...holds)} frames ` +
        `(${ms(Math.min(...holds), fps)}–${ms(Math.max(...holds), fps)})`,
    );
  }
  const moves = explanation.shots.filter((shot) => shot.kind !== "hold");
  lines.push(
    `  camera     ${moves.length} moves in ${explanation.shots.length} occurrences ` +
      `(${explanation.shots.length - moves.length} holds), ` +
      `${explanation.audition.candidates.length > 0 ? "" : ""}` +
      `${explanation.shots.filter((shot) => shot.shot === "overview").length} on the overview`,
  );
  lines.push(
    `  ledger     ${explanation.ledger.rows} rows at ${explanation.ledger.size}px, ` +
      `measure ${explanation.ledger.measure} chars, rail ${1920 - explanation.viewport.width}px`,
  );
  lines.push(
    `  layout     ${explanation.audition.winner.name} of ${explanation.audition.candidates.length}; ` +
      `incumbent would be ${explanation.audition.incumbent.score.stateNamePx.toFixed(1)}px, ` +
      `elected ${explanation.audition.winner.score.stateNamePx.toFixed(1)}px`,
  );

  return lines.join("\n");
}
