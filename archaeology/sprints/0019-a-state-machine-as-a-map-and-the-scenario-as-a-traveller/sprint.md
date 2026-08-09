---
id: spr_01KZJ8R3RA1F5J5HEEJ40Z6GSP
sequence: 19
kind: sprint
status: active
created: 2026-08-08
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
