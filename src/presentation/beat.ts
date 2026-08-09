import type { NarrationCue } from "./cue.ts";
import type { AuthoredMachine } from "./machine.ts";
import { takeId } from "./machine.ts";
import type { AuthoredProtocol, AuthoredStep } from "./protocol.ts";
import { stepId } from "./protocol.ts";
import { childScope, type Scope } from "./scope.ts";

/**
 * How long a silent occurrence gets, and how a body that carries its own narration becomes cues.
 *
 * This module exists because of one allowance in `./protocol.ts`: `say:` is optional. Everything
 * else in cuecraft is timed by a measurement — a scene lasts as long as its narration, an anchor
 * lands on a clip's first audible sample, a population fills across a sentence — and dragon:1's
 * whole architecture is built on nothing downstream being permitted to invent a duration. A step
 * nobody talks over has no measurement to be timed by, and it still has to happen at a speed a
 * person can watch.
 *
 * So this is the one derived clock in the format, and it is kept in one small module on purpose:
 * every number below is a policy that a rendered minute is allowed to overturn, and none of them is
 * reachable from the source.
 *
 * ## The policy, in four rules
 *
 * 1. **A narrated step is paced by its narration.** It lowers to an ordinary speech cue that
 *    activates the step, so its frame comes from the anchor machinery decision:14 built, at the
 *    onset decision:13 measured. Nothing new times it, and rewording the sentence retimes the
 *    visual — which is the property the whole system exists to have.
 *
 * 2. **A silent step is paced by what it has to show.** It gets the transition, plus time to read
 *    its label, and the label's length is the only input. `TRANSIT` is how long the arrow takes to
 *    cross and land; the reading allowance is characters times `PER_CHARACTER`, which lands around
 *    260 words a minute — brisk, because a message label is scanned rather than read, and a viewer
 *    who misses one has the arrow still on screen.
 *
 * 3. **A run of silent steps accelerates.** The first one in a run costs the viewer a lane
 *    geometry, a direction and a label; the fourth costs them a label, because the rest is already
 *    loaded. Each successive silent step is scaled by `RUN_DECAY` down to a floor of `RUN_FLOOR`,
 *    so six consecutive messages take about six fifths of a second each rather than nine tenths,
 *    and no individual one drops below being perceptible. Without it a run of silence reads as the
 *    film having stopped; with it, it reads as a passage being traced, which is what it is. The
 *    decay is gentle on purpose — a viewer with nobody talking to them is doing *all* the work.
 *
 * 4. **Nothing is added when narration resumes.** A narrated step after a silent run begins on the
 *    frame the run ends, because the sentence is the transition — there is no glue, and no author
 *    could write any.
 *
 * ## The numbers, and why they are these numbers
 *
 * `MINIMUM` is the floor and it is the one that was actually measured: below about nine tenths of a
 * second, two arrows in a row read as one event with a flicker in the middle rather than as two
 * messages. `MAXIMUM` is where a silent step stops being a beat and starts being a pause the film
 * is taking — past two seconds with nobody talking, a viewer starts wondering whether something
 * broke, and a label long enough to need more than that is a label that wanted a sentence.
 *
 * ## The second caller, and what it proved
 *
 * `./machine.ts` arrived with the same allowance and no protocol anywhere in it: an occurrence of a
 * transition may be silent, and something has to decide how long it owns the stage. The four rules
 * above transferred **without a constant changing**, which is a real result rather than a
 * convenience. The reason they transferred is that none of them is about messages: the label is
 * whatever the picture is asking the viewer to read (`message` for a step, `on` for a transition),
 * the transit is whatever has to cross the frame before there is anything to read, and the run
 * decay is about a viewer with nobody talking to them, which is a fact about silence.
 *
 * So `dwellFor` takes a label and a run position, and `dwellMs` is the protocol's name for it. What
 * is *not* shared is the lowering: two bodies with different identities, different scopes and
 * different notions of what an occurrence is write eleven lines each, and nothing was made generic
 * to let them.
 */

/** How long the arrow takes to cross and land, before anybody has read anything. */
export const TRANSIT_MS = 520;

/** Reading allowance per character of the message label. About 260 words a minute. */
export const PER_CHARACTER_MS = 34;

/** Least and most a silent step may take, before the run decay is applied. */
export const MINIMUM_DWELL_MS = 900;
export const MAXIMUM_DWELL_MS = 2000;

/**
 * How much of an isolated step's time the nth in a run gets, and how far that may go.
 *
 * The floor is where it stops, and it is set so that even the shortest step in the longest run
 * still runs longer than the arrow takes to cross — `MINIMUM_DWELL_MS * RUN_FLOOR` is just over
 * seven tenths of a second against a `TRANSIT_MS` of just over five. A run that outran its own
 * transitions would be a diagram redrawing itself rather than a protocol being traced.
 */
export const RUN_DECAY = 0.92;
export const RUN_FLOOR = 0.78;

/**
 * How long a silent occurrence holds the stage, given what it puts on screen to be read.
 *
 * `run` is how many silent occurrences have already gone by without a word between them: zero for
 * the first one after any narration, one for the one after that, and so on. It is the only piece of
 * context the policy consults, and it is deliberately not "how far into the body we are" — fatigue
 * is about the *run*, not about the film.
 */
export function dwellFor(label: string, run: number = 0): number {
  const read = label.length * PER_CHARACTER_MS;
  const whole = Math.min(MAXIMUM_DWELL_MS, Math.max(MINIMUM_DWELL_MS, TRANSIT_MS + read));
  const decay = Math.max(RUN_FLOOR, RUN_DECAY ** run);
  return Math.round(Math.max(MINIMUM_DWELL_MS * RUN_FLOOR, whole * decay));
}

/**
 * How long a stable arrival is worth, before anything has been read.
 *
 * The number sprint:20 exists to find, and it is a floor rather than an allowance. Everything
 * `dwellFor` prices is *reading*: a label appears, an eye scans it, the step is understood. A
 * machine asks for one thing more, and it is the thing decision:47 made the whole composition
 * about — after the traveller lands, the frame has to say **the machine is now here** and be
 * still while it says it. That is not reading and it does not get cheaper with a shorter label; a
 * three-word event and a nine-word event both leave occupancy in the same place and both need the
 * same moment to be seen leaving it.
 *
 * Measured against the baseline rather than chosen. sprint:19's films gave a silent occurrence its
 * whole `dwellFor` and spent the first sixteen frames of it on the crossing, which left the two
 * shortest arrivals in the elevator with **thirteen frames** of stillness and four of the leased
 * runner's six with **none at all** — the camera had already set off for the next one before the
 * traveller landed. Fourteen tenths of a second is the low end of what registers as an arrival
 * rather than as a flicker, and the round's brief proposed 1.25 to 1.75 as a hypothesis; this sits
 * inside it and was then checked against rendered frames rather than against the hypothesis.
 */
export const ARRIVAL_MS = 1400;

/**
 * How long a silent *occurrence* holds the stage: the larger of what it takes to trace and what it
 * takes to arrive.
 *
 * The larger, emphatically not the sum. Two padding mechanisms added together is how a film ends
 * up four minutes long with nothing in it, and the two quantities are not additive anyway — the
 * viewer is reading the label *during* the stable window, not after it. So whichever phase is the
 * binding constraint sets the length and the other one is free.
 *
 * The finding this produced is worth recording where it happened: for every label in both example
 * machines, the **arrival** binds and the reading allowance does not. A machine's silent
 * occurrence is priced by occupancy, not by prose, and only a label past about forty characters
 * takes the length back. That means `dwellFor`'s "rewording an event retimes the frame" property,
 * which decision:46 valued, is now true of long labels and of every narrated occurrence, and is
 * no longer true of a short silent one. It was traded deliberately: a frame that retimes to the
 * word and cannot be perceived is not worth the property.
 *
 * The run decay is the *same* decay, applied once to whichever term wins, so a run of silent
 * occurrences still accelerates and still cannot fall below `RUN_FLOOR` of an isolated one.
 */
export function occurrenceDwellFor(label: string, run: number = 0): number {
  const traced = dwellFor(label, run);
  const decay = Math.max(RUN_FLOOR, RUN_DECAY ** run);
  const settling = TRANSIT_MS + Math.round(ARRIVAL_MS * decay);
  return Math.max(traced, settling);
}

/** The same policy, asked about a step. What a step puts on screen to be read is its message. */
export function dwellMs(step: AuthoredStep, run: number = 0): number {
  return dwellFor(step.message, run);
}

/**
 * A protocol's steps, as cues.
 *
 * The lowering the sprint is really about, and it is eleven lines because the two kinds of step
 * land on machinery that already existed. A narrated step is a speech cue whose `address` is
 * already resolved — it does not go through `./nest.ts`, because there is no name to look up: the
 * compiler wrote both ends of this relationship and has no reason to spell one of them out and
 * then read it back.
 *
 * Order is the whole coupling. Nothing here carries an index, a target, or a link; the cues come
 * out in step order because the steps were in step order, and everything downstream — synthesis,
 * the frame clock, anchoring — sees the ordinary serial list it has always seen.
 *
 * `narrator` is the slide's, applied to every step that says anything. It is emphatically not read
 * from the step's `from:` — an actor is a party to an exchange and a narrator is who is telling you
 * about it, and a protocol whose lanes started speaking for themselves would be a dialogue system
 * that nobody asked for and that no step could turn off.
 */
export function protocolCues(
  protocol: AuthoredProtocol,
  scope: Scope,
  narrator?: string,
): readonly NarrationCue[] {
  let run = 0;
  return protocol.steps.map((step, index): NarrationCue => {
    const address = childScope(scope, stepId(index));
    if (step.say === undefined) {
      const milliseconds = dwellMs(step, run);
      run += 1;
      return { kind: "dwell", scope, milliseconds, address };
    }
    run = 0;
    return {
      kind: "speech",
      scope,
      text: step.say,
      activates: stepId(index),
      address,
      ...(narrator === undefined ? {} : { narrator }),
      ...(step.pronounce === undefined ? {} : { pronounce: step.pronounce }),
    };
  });
}

/**
 * A machine's scenario, as cues.
 *
 * The same eleven lines with the nouns changed, and they are eleven lines *again* rather than one
 * shared function taking a strategy, because what differs between the two is every single noun:
 * which list is walked, what identity an occurrence gets, and what text the dwell is measured
 * against. A parameterised version would take four callbacks and be longer than both.
 *
 * What a silent occurrence puts on screen to be read is the transition's `on` label, so that is
 * what times it — but it is `occurrenceDwellFor` rather than `dwellFor`, because a machine owes an
 * arrival a stable window that a protocol's arrow does not. The two agree wherever reading is the
 * binding constraint and differ wherever occupancy is, which is most of the time. That divergence
 * is `./machine.ts` asking for something a protocol has no equivalent of, rather than a protocol
 * policy being bent to fit it: `dwellFor` and `dwellMs` are untouched and the transcript is timed
 * exactly as it was.
 */
export function machineCues(
  machine: AuthoredMachine,
  scope: Scope,
  narrator?: string,
): readonly NarrationCue[] {
  const byId = new Map(machine.transitions.map((entry) => [entry.id, entry] as const));
  let run = 0;
  return machine.scenario.map((occurrence, index): NarrationCue => {
    const address = childScope(scope, takeId(index));
    if (occurrence.say === undefined) {
      const transition = byId.get(occurrence.take);
      const milliseconds = occurrenceDwellFor(transition?.on ?? occurrence.take, run);
      run += 1;
      return { kind: "dwell", scope, milliseconds, address };
    }
    run = 0;
    return {
      kind: "speech",
      scope,
      text: occurrence.say,
      activates: takeId(index),
      address,
      ...(narrator === undefined ? {} : { narrator }),
      ...(occurrence.pronounce === undefined ? {} : { pronounce: occurrence.pronounce }),
    };
  });
}
