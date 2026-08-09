---
id: spr_01KZKHF8BF2P8G72QXG4BH13G9
sequence: 22
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Explain the run, when the author says so

## Goal

Let an author declare that a machine slide explains the **narrated run** rather than the whole
machine, and have the compiler draw exactly that — pruning the states and transitions the scenario
never touches before the topology reaches dagre.

Three things, and the third is the one that makes it honest:

1. one authored key, `scope: whole | narrated`, defaulting to `whole`, that says what the picture
   is *about* rather than how it is drawn;
2. the reduction itself, applied where a machine is constructed, so layout, camera, ledger and
   `explain` all see one machine;
3. **the frame saying so** — a reduced map that does not declare its reduction is not a summary,
   it is a smaller machine asserted as the whole one.

## Rationale

sprint:21 established what is not available. dagre ranks globally, so no arrangement can put a
perceptual spotlight on the narrated circuits while still drawing everything: 4 x 144 configurations
across two films, and not one met both floors (task:103, decision:53). The alternative is a bespoke
placer, which is refused.

What that round also established is that the constraint was never really the library. Drawing
*less* works today, through the existing audition, with no new layout code at all. Measured through
the real pipeline — the actual timeline, beats and camera plan, not a layout score:

    leases                states     atlas    camera moves   below the 20px floor
      as shipped          9st 14tr   16.3px      6 / 13            6 / 13
      narrative reduction 6st  9tr   27.9px      0 / 13            0 / 13
          per occurrence: 28 28 28 28 28 28 28 28 28 28 28 28 28

    elevator
      as shipped          6st  7tr   25.5px      0 / 8             0 / 8
      narrative reduction 5st  6tr   31.1px      0 / 8             0 / 8

**The reduced leased runner stops needing a camera at all.** Thirteen occurrences, all at 28px, from
one held overview — which is exactly the result decision:51 recorded as the planner's strongest
evidence on the elevator. It turns the adversarial specimen into the same kind of film as the
showcase, and dragon:28 does not exist for a slide that sets it.

### Why this is not the thing decision:52 and decision:53 refused

Those refused the **compiler** demoting untaken material on its own initiative, silently, as a
layout policy. This is an author saying which of two artifacts they are making. The difference is
not a technicality:

- It adds no coordinate, size, position, colour, duration or camera key, and none that could become
  one. `../presentation/machine.ts` refuses geometry and time in its grammar and continues to.
- It cannot be applied by halves. There is no "mostly reduced", no per-state emphasis, no weighting.
  A slide is about the whole machine or about the run, and both are honest pictures.
- It is off by default, so every existing deck renders byte-identically.

### Why it has to be opt-in, argued from the examples rather than from taste

`examples/elevator.yaml` gains 5.6px and loses `still-blocked`, and its own header says what that
costs:

> `still-blocked` below is declared and never taken: the doors *could* give up, and the reason the
> run coming back to Closed means anything is that it did not have to. A trace-only notation — a
> list of things that happened — could not have said that, and the film would have been an animated
> event log.

So the showcase must refuse this flag and the adversarial specimen wants it. A flag both examples
set the same way would be a constant that had been set wrong; one they set differently is a real
choice about what a given slide is for.

### The criterion, settled by measurement rather than by intuition

Four candidate criteria were measured (`out/harness/subsets.ts`). Only one is safe:

    reachable from start      9/9 states     buys nothing — an unreachable state is a bug
    on a circuit              6/9 states     drops `Cancelled`, the state the film ends in
    on a circuit + terminals  9/9 states     the identity function
    touched by the scenario   6/9 states     41.0px name / 27.9px event

**Touched by the scenario** is the only criterion that is both safe and worth anything. It is safe
by construction: the run's own path is connected and contains wherever it stopped. The others are
recorded as refused so the next round does not re-derive them.

### The hazard, which is the actual work

A pruned `Running` has three exits where the machine declares six, and nothing on the frame says so.
That is not "we did not show what else could happen" — it is a smaller machine asserted as the whole
one, and a viewer cannot tell. dragon:18 hit the same shape from the other side and answered it with
a rail that names what the shot cut off; decision:49's ledger already says `+8 earlier` rather than
an anonymous ellipsis. The same rule applies here and it is not optional.

## Success criteria

**The grammar**

- One key, `scope`, on `machine:`, with exactly two values and `whole` as the default.
- An unknown value is an authoring error with a hint naming both, in the house style.
- No other key is added, and no key is added that could carry a coordinate, a size, a colour, a
  duration or a camera instruction.
- Every existing presentation renders byte-identically. A test asserts a machine without `scope` is
  the machine it is today.

**The reduction**

- Derived from the scenario alone: the transitions it takes and the states those touch. No other
  criterion is implemented, and the three that were measured and refused are recorded.
- Applied in exactly one place, so layout, camera, ledger, chrome and `explain` never disagree about
  which machine they are describing.
- A scenario that touches everything reduces to the machine unchanged, and a test says so.
- Permuting the scenario changes nothing about which states survive — a touched set is a set.
- Reduction cannot strand an occurrence: every transition the scenario takes survives, by
  construction, and a test asserts it on both examples.

**The declaration**

- A reduced slide says on the frame that it is reduced, and says what is missing as counts rather
  than as a hint: states shown of states declared, transitions shown of transitions declared.
- It is legible at the canonical overview, and it does not move, reflow or accumulate during the
  film.
- An unreduced slide gains nothing — no empty band, no zero counts, no reserved space.
- The graph viewport accounts for whatever room the declaration takes, as decision:49's rail does.

**The films**

- `examples/leases.yaml` gains a second slide, or a sibling example, that sets `scope: narrated` —
  so both pictures of the same machine exist and can be compared. The existing leases film keeps
  `scope: whole` and does not change.
- `examples/elevator.yaml` does not set the flag, and does not change.
- Both render through `cuecraft render`; at least two inspection passes over real frames.
- The reduced film is checked against the thing the spreadsheet cannot answer: how a reduced map
  reads against a ledger that still lists every occurrence.

**The record**

- A decision recorded before the grammar change, engaging directly with the paragraph in
  `../presentation/machine.ts` that argues the opposite.
- dragon:28 closed, or updated with what a reduced slide does and does not settle.
- `npm run check` and `scarp doctor` pass; working tree clean; every task closed.

## Non-goals

sprint:19, sprint:20 and sprint:21's non-goal lists stand and are not restated. Added:

- **No second reduction criterion.** Not reachability, not circuits, not terminals, not depth, not
  a radius around the run. Measured, refused, recorded. A criterion nobody asked for is a criterion
  nobody can judge.
- **No partial reduction.** No per-state emphasis, no weighting, no "keep the interesting ones", no
  threshold. Whole or narrated.
- **No layout change of any kind.** `layoutMachine`, `audition.ts`, `DEFAULT_LAYOUT` and the scoring
  are untouched. This round works entirely by handing dagre a different machine, which is precisely
  why it is available at all.
- **No camera change.** If the reduced film needs no moves, that is the planner already being right.
- **No new state-machine semantics.** The reduction removes declared things from a *picture*; it
  does not add initial states, final states, accepting states or any notion of relevance to the
  grammar.
- **No authored escape hatch beyond the one key.** `scope` names what the slide is about. It is not
  a door to naming a state, a transition, a circuit or a region.
- **No hiding without saying.** If the declaration cannot be made legible, the reduction is not
  shipped. This is the one criterion the round will not trade away for pixels.

## Outcome

**Built, rendered, and it does what the measurement said it would.** `examples/leases-narrated.yaml`
is the leased runner's machine and scenario with one key changed, and `cuecraft explain` on the pair
is the whole result:

    scope: whole      9 states, 14 transitions, 3011x1736 (1.73:1)   23.9px / 16.3px   6 moves
    scope: narrated   6 states,  9 transitions, 1755x1188 (1.48:1)   41.0px / 27.9px   0 moves

Nothing below the 20px floor, thirteen occurrences read from one held overview, and the silent holds
improved as a side effect — 39-52 frames against 20-52 — because a camera that never moves never
takes a move out of an arrival. The adversarial specimen became the same kind of film as the
showcase.

`examples/leases.yaml` and `examples/elevator.yaml` are untouched and their `explain` output is
identical. The unreduced closing frame measures `x 447..1847, y 149..962` after this round and
measured `x 447..1847, y 149..962` before it, so "existing decks are unchanged" is checked on pixels
rather than asserted.

### What building it corrected, which measuring it had not

The criterion. The first implementation kept the transitions the run *takes*, which is what
decision:54's Decision section said and what the sprint plan said. It dropped `resumed`
(`Cancelling -> Running`) while keeping both of its endpoints — so `Cancelling` showed one exit
where the machine declares two, and the film's own closing sentence about "the road back out of
cancelling" lost its referent on screen.

That is a worse failure than the one the feature already declares. Omitting a state is announced in
the counts; **misrepresenting a state that was kept is not announced anywhere.** So the criterion is
the induced subgraph: the run chooses the states, and the machine contributes every transition it
declares between them. Nine transitions rather than eight, 27.9px rather than 29.9px, and a picture
that does not lie about anything it draws.

### What the frames answered that the numbers could not

**A reduced map against a full ledger is not a contradiction.** The rail still lists all thirteen
occurrences and still says `+8 earlier`, because the scenario did not change — only the map did. The
two describe different things and always did: the ledger is what happened, the map is where.

**The reduction does not flatten the taken/untaken distinction, it narrows the universe the
distinction operates in.** `cancellation withdrawn` is the one untaken transition still on the map,
and decision:49's wake draws it recessive against `an operator cancels` beside it. A reduced slide
is still a machine with possibility in it, which is the strongest available answer to the worry that
this is the animated event log `../presentation/machine.ts` refuses.

**And the declaration wrapped badly on the first render**, orphaning `transitions` onto a line of its
own — sprint:20's greedy-wrap defect, recurring. A note about honesty that reads as a typographic
accident is not doing its job, so the counts are broken deliberately now and the block's height
stopped depending on a string.

### Against the success criteria, honestly

Met: one key with two values and `whole` as the default; unknown values refused with both named; no
key that could carry geometry or time; the reduction derived from the scenario alone and applied at
one call site; a run that touches everything reduces to the machine unchanged; permutation changes
neither survivors nor coordinates; no occurrence stranded, asserted on both specimens; the
declaration on the frame in counts, screen-fixed, absent entirely when unreduced, and its room taken
off the rail before anything is fitted; both films rendered, two inspection passes, the pass-one
defect fixed; `npm run check` (673 tests) and `scarp doctor` pass.

Not met, and stated rather than quietly dropped: **`examples/leases.yaml` did not gain a second
slide.** The sibling is a separate file instead, which compares the two pictures just as well and
keeps the original film byte-identical — but the criterion said "a second slide, or a sibling
example", so this is the second option taken deliberately rather than a miss.

Two defects recorded and not fixed, both out of this round's scope: the ledger still wraps greedily
(`downstream returns` / `429`), which this round made marginally more likely by taking the rail from
27px to 23px to pay for the declaration; and the bidirectional pair routes as two long near-parallel
lines across the map.

dragon:28 is **not closed**, and the reasoning is worth keeping: `scope: narrated` is an escape from
the problem rather than a solution to it. Its resolution criteria ask for a treatment that keeps
untaken possibility *readable*, and this removes it and says so. What changed is the dragon's scope,
not its status — it is now specifically about `scope: whole`, and an author who hits the wall has
somewhere to go.

### What was refused and stayed refused

No second reduction criterion — reachability, circuits and circuits-plus-terminals are measured,
refused and recorded in decision:54 so the next round does not re-derive them. No partial reduction,
no per-state emphasis, no weighting, no threshold. **No layout change of any kind**: `layoutMachine`,
`audition.ts`, `DEFAULT_LAYOUT` and the scoring are byte-identical, which is precisely why this was
available when decision:53's seeding was not. No camera change — the reduced film takes zero moves
because decision:51's planner was already right. No hiding without saying.
