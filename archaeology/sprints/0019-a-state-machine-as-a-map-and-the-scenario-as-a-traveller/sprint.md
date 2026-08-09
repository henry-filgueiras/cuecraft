---
id: spr_01KZJ8R3RA1F5J5HEEJ40Z6GSP
sequence: 19
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
---

# A state machine as a map, and the scenario as a traveller

## Goal

Add a thirteenth body — a **state machine** — and carry it end to end: grammar, validation,
timing, a layout and camera of its own, a composition, and two rendered films whose frames are
inspected and used to correct the result.

The body distinguishes two things that no existing cuecraft body distinguishes:

    machine     the possible topology of the abstraction being explained
    scenario    one ordered run of transition occurrences through that topology

Both examples render through the real pipeline: `examples/elevator.yaml` (the showcase) and
`examples/leases.yaml` (the adversarial specimen, built to attack the layout).

## Rationale

The question this round exists to answer is not "can cuecraft draw a state diagram". It is:

> Can a small semantic description of possible states, possible transitions, and one explanatory
> execution become a high-quality gradual audiovisual explanation without asking the author to
> design graph geometry, animation, timing, or camera movement?

Every body cuecraft has is either a **structure** narration tours (`world`, `formula`, `series`,
`code`) or a **sequence** that carries its own narration (`protocol`). A state machine is the
first that is *both at once*, and that is the whole reason it is worth building. Its topology is a
structure that exists before anything is said — `world`'s claim exactly — and its scenario is an
ordered list of occurrences that brings its own narration and its own derived clock —
`protocol`'s claim exactly. The hypothesis under test is that those two proven primitives compose,
plus one thing neither of them has:

> **persistent occupancy.** Exactly one state is current, it stays current until something moves
> it, and it is the strongest signal on the frame for as long as it holds.

decision:17's activation model cannot express that. `heat` is a transient by construction and
`degree` is monotone and never released, so an anchor can say *this was reached* and can never
say *this is where the machine is now, and that other one no longer is*. If the round finds that
transient anchor heat is enough, the hypothesis is wrong and occupancy was a costume. If it finds
that occupancy has to be its own persistent, exclusive, releasable state, that is a real finding
about what cuecraft's activation model is missing.

The second question is about layout. dagre is in the toolchain for one composition (dragon:8's
first reason for doubt), and `layoutWorld` uses it in the easiest possible mode: simple digraph,
no edge labels, cycles tolerated but never really exercised. A state machine is the hard input —
cycles, backward edges, parallel edges between one pair, bidirectional pairs, self-loops, required
edge labels of wildly different lengths, and a high-degree hub. Either dagre earns its place a
second time on genuinely harder input, or it does not, and either answer is worth having.

The third question is the paused-frame test, which is the acceptance criterion this round is
actually judged on and is stated under *Success criteria* below.

## Success criteria

**The grammar**

- A `machine:` body with `states`, `transitions` and `scenario`, in which nothing is geometric,
  nothing is temporal, and no key could become either.
- Topology and occurrence stay semantically distinct: a transition is timeless and carries its
  visible event label; an occurrence names a transition and may carry narration, or not.
- Validation refuses, with a diagnostic naming what is wrong and what was declared: duplicate or
  missing identities, a scenario entry naming a transition that does not exist, a discontinuous
  scenario, an empty scenario, and a machine too small to be one.
- The scenario's start is inferred from the first occurrence's `from` and its stopping state from
  the last occurrence's `to`. Neither is authorable, and no terminal, accepting or final state is
  inferred, required, or drawn.

**The film**

- Both examples compile and render to complete MP4s through `cuecraft render`.
- The machine is laid out **once**. Node positions are a function of the topology alone — a test
  asserts that permuting the scenario moves nothing.
- At an arbitrary paused frame the picture answers, without narration rescuing it:
  1. Where is the machine now?
  2. How did it get here?
  3. What else could happen from here?
- Untaken transitions read as ordinary possibility, not as failure or absence. Departed states
  read as ordinary topology, not as dead.
- A revisit re-ignites the existing node in place; a repeated transition reads as a *new*
  occurrence; a self-transition reads as an event that happened while occupancy did not move.
- Silent occurrences get perceptual dwell through the existing derived clock, and narrated ones
  through the measured one. No new clock.

**The evidence**

- Frames extracted from both rendered films covering: initial topology, mid-traversal, arrival,
  a revisit, a repeated or parallel transition, the self-loop, and the closing overview.
- At least one defect found by looking at those frames and fixed, with the before/after recorded.
  A round that renders and declares victory has not run the experiment.

**The record**

- `npm run check` and `scarp doctor` pass; the working tree is clean; every task closed.

## Non-goals

Refused in advance, and refused *because* the semantic contract is what is being tested:

- **Hierarchical or composite states, concurrent regions, more than one traveler.** One flat
  machine, one scenario, exactly one current state. A second traveler would make occupancy a set
  and the whole occupancy claim would need restating.
- **Initial, final, choice, fork, join and history pseudostates.** A scenario may stop anywhere,
  and the film may not imply that where it stopped is where it was going.
- **Guards and actions as separate semantic concepts.** A transition has one visible label. If a
  guard matters, it is part of what the transition is called.
- **Trace-only inferred topology.** Declared-but-untaken transitions are the point: without them
  this is an animated event log wearing a state machine's clothes, and the round would have
  proved nothing.
- **Progressive topology reveal, counterfactual branch inspection, scenario reset, multiple
  scenarios per slide.**
- **Mermaid, SCXML or code import.** The source is the source (decision:1).
- **Any authored coordinate, rank, route, colour, dwell or camera key**, and no key that could
  become one later.
- **A generic "diagram engine".** `world` and `machine` may share a primitive only where the
  second implementation *demonstrates* the sharing — decision:36's rule, applied a second time.
  Nothing is made generic in advance, nothing gains a strategy object.
- **A machine inside an entity.** Neither `detail:` nor `child:` may be one. A composition with a
  camera nested inside a composition with a camera is a separate question and this round does not
  open it.
- **Any change to `world`, `protocol` or the sequence policies to accommodate this.** If something
  has to give, that is a finding to record, not a refactor to slip in.

## Outcome

Both films render through the ordinary pipeline, from a grammar with no coordinate, no colour, no
duration and no camera instruction in it:

    examples/elevator.yaml   133 lines   6 states, 7 transitions, 8 occurrences   2095 frames, 01:09.9
    examples/leases.yaml     181 lines   9 states, 14 transitions, 13 occurrences 2639 frames, 01:28.0

    layout            elevator 1350 x 1526 (0.88:1)      leases 3840 x 1332 (2.88:1)
    overview          3628 units, state name 26.5px      4109 units, state name 23.4px
    shots             2030 – 3661, event label 18–32px   1250 – 3458, event label 19–52px
    collisions        none                               none

Both were laid out once from the topology alone, and a test permutes, reverses, empties and doubles
each scenario to assert that nothing moves.

### The hypothesis held, and the part that did not is the finding

The sprint's hypothesis was that a machine is `world`'s stable atlas plus `protocol`'s ordered
occurrences plus **persistent occupancy**, and that the first two would compose. They did, and more
cheaply than expected:

- **The derived clock transferred without a constant changing.** decision:35 was written about
  arrows between lanes and turns out never to have been about arrows: the label is whatever the
  picture asks a viewer to read, the transit is whatever crosses the frame first, and the run decay
  is a fact about silence. One function, two callers, and a test that asserts they agree at every
  run depth rather than merely agreeing today.
- **The hold policy transferred untouched for the third time.** A run that stays in one
  neighbourhood emits no camera keys after the first — four occurrences of one self-loop are four
  beats and one shot — and no rule was written to make that happen. decision:24 has now survived a
  world, a band and a cyclic graph.
- **The element, address and beat machinery needed nothing.** States and occurrences publish by the
  rule actors and steps already follow; `buildTimeline` grew no second path.

The third leg is where the hypothesis was **wrong about cost**. Occupancy was expected to be a
reading of the existing activation model, and it cannot be: `heat` is a transient by construction
and `degree` is monotone and never released, so between them an anchor can say *this was reached*
and can never say *this is where the machine is now, and that other one no longer is*. Occupancy is
a fourth quantity (decision:47) — and having it forced two of decision:23's findings to be re-hung
rather than reused, because both silently assume the moment **ends**. Surround attenuation went
from half a stop to a quarter and now rides the arrival transient instead of the occupancy; hue
stopped encoding identity and encodes occupancy alone, because a frame where nine states are nine
colours has no colour left to say which one is current. Three numbers were not enough for the
thirteenth body, which is the first time that has been true, and idea:20 records why the
generalisation is parked rather than taken.

### What the frames changed

Three defects, found by looking, in an order that matters: none of them was visible in a test and
all three were visible in one frame.

1. **The deck title printed across the first transition's label** on the elevator's establishing
   shot. decision:26 diagnosed this in general and its answer — fade the caption by how much of the
   world is on screen — does not transfer, because a machine's chrome is most necessary exactly when
   the whole machine is on screen. Fixed by handing the camera a viewport that stops short of the
   chrome, which is `useSubtitleBand`'s trick at the other end of the frame. It costs a tall machine
   about a third more width in every shot and a wide one nothing at all (dragon:29).
2. **The wake could not answer its own question.** At the closing overview the transition the run
   *opened with* was indistinguishable from one it never took. Untaken came down and taken went up
   to roughly two to one in alpha and stroke weight, while `available` deliberately stayed the
   smallest step on the frame.
3. **The closing overview barely existed** — the 130-frame pull-back consumed all but eight frames
   of a 156-frame `post_say`. Raised to 9000ms in both examples, which is the right lever:
   decision:22 already made that shot something an author asks for by writing enough silence.

One suspected defect was not one. A label looked clipped at the frame edge in the leases overview;
the frame had been sampled fifty frames into the pull-back, and the settled shot has 63 pixels of
margin there.

### The paused-frame test, answered honestly

> Where is the machine now? How did it get here? What else could happen from here?

**`examples/elevator.yaml`: yes, on every frame sampled.** Occupancy is unmistakable and exclusive;
the wake plus the `×2` counters reconstruct the whole route without the readout; the untaken branch
to Out of service is legible in the same frame as the branch being taken, and nothing about the
ending is styled as an ending.

**`examples/leases.yaml`: yes during the run, and only partly at the overview.** The travelling
shots answer all three. The closing overview answers the first two and answers the third *for the
states the camera visited*: at 4109 units the event labels are 16 pixels, so four transitions in
that film — including both of the two ways the job could have finished — are never legible in any
frame. That is the adversarial specimen doing exactly what it was written to do, and it is
dragon:28 rather than a defect to paper over.

### What was refused and stayed refused

Every non-goal held. No pseudostates, no composite states, no second traveller, no guards as
separate concepts, no trace-only shorthand, no authored geometry, no scenario reset, and no generic
diagram engine — `world`, `protocol` and `machine` share `camera.ts`, `polyline.ts` and the dwell
policy, and share no control flow at all (decision:48). Nothing in `world`, `protocol` or the
sequence policies was changed to accommodate this; the one thing that moved, the polyline geometry,
moved because a second caller demonstrated the sharing and is re-exported so no importer changed.

One refusal was added during the round rather than in advance: **a machine may not be an entity's
interior**, in either spelling, because the chamber would have to run a second camera inside the one
already looking at it.
