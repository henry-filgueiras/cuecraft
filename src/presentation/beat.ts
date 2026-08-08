import type { NarrationCue } from "./cue.ts";
import type { AuthoredProtocol, AuthoredStep } from "./protocol.ts";
import { stepId } from "./protocol.ts";
import { childScope, type Scope } from "./scope.ts";

/**
 * How long a step gets, and how a protocol becomes cues.
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
 * How long a silent step holds the stage.
 *
 * `run` is how many silent steps have already gone by without a word between them: zero for the
 * first one after any narration, one for the one after that, and so on. It is the only piece of
 * context the policy consults, and it is deliberately not "how far into the protocol we are" —
 * fatigue is about the *run*, not about the film.
 */
export function dwellMs(step: AuthoredStep, run: number = 0): number {
  const read = step.message.length * PER_CHARACTER_MS;
  const whole = Math.min(MAXIMUM_DWELL_MS, Math.max(MINIMUM_DWELL_MS, TRANSIT_MS + read));
  const decay = Math.max(RUN_FLOOR, RUN_DECAY ** run);
  return Math.round(Math.max(MINIMUM_DWELL_MS * RUN_FLOOR, whole * decay));
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
