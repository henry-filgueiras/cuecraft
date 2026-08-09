---
id: spr_01KZKEG1YAXVEEKNNAW1X05CJ4
sequence: 21
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Lay out the explanation, not the machine

## Goal

Seed a machine's layout on the transitions the scenario actually takes, so that the states and
edges under narrative examination get spatial locality and the untaken remainder is attached
*around* that core rather than interleaved *through* it. Then convict or close dragon:28.

Four workstreams, one question, and no new state-machine concept:

1. a **decision, recorded first**, about what the picture is — an atlas of a machine, or an
   explanation of a telling;
2. a **core** — the subgraph the scenario touches — laid out as if it were the whole machine, with
   the remainder attached around it;
3. the **audition** extended to generate and score seeded candidates against unseeded ones, with
   `examples/elevator.yaml` as the control;
4. **de-emphasis** of untaken material, judged on rendered frames rather than on the idea of it.

The grammar does not change. Neither example gains a coordinate, a colour, a duration, a camera key
or an emphasis key, and no `machine:` key is added, removed or reinterpreted.

## Rationale

sprint:20 asked whether foreknowledge of the whole scenario is worth anything, and answered yes on
five hypotheses out of six. It left dragon:28 open with a sharpened diagnosis: the leased runner's
event labels come out at 16.3px in the one shot that has to show the whole machine, the floor is
`MACHINE.eventPx` at 20, and 144 auditioned candidates could not clear it.

That diagnosis was measured against a search space, and this round exists because the search space
was the wrong shape. dagre places every node in one pass over a global ranking; nothing in
`rankdir × ranker × labelMeasure × spread × weight` can say *keep these six states together*. So
what sprint:20 recorded as a property of the machine is at least partly a property of the tool, and
the distinction was never tested.

Measured before this sprint was opened, on `examples/leases.yaml`:

    arrangement is exhausted
      elected today            3011x1736 (1.73:1)   23.9px name / 16.3px event
      best aspect fit of 144   2688x1830 (1.47:1)   26.8px name / 18.2px event
      area-preserving ideal    2730x1915 (1.43:1)   26.4px name / 17.9px event

    ...so no rearrangement of that content clears 20px, and the search already beats the ideal.

    traversal weight saturates
      weight 2, 5, 10, 25, 60, 150 all elect the same candidate, and the run's own territory
      never falls below 0.89 of the overview in either film. dagre's `weight` breaks ties in the
      ranker; it does not compact.

    content is the whole gap
      as shipped                       9st 14tr  3011x1736 (1.73:1)  23.9 / 16.3
      less the two terminal branches   7st 12tr  2531x1736 (1.46:1)  28.4 / 19.3
      less the orphaned detour         8st 11tr  2505x1356 (1.85:1)  28.7 / 19.5
      less all three unvisited states  6st  9tr  1755x1188 (1.48:1)  41.0 / 27.9
      less an OCCUPIED leaf (control)  8st 13tr  2968x1378 (2.15:1)  24.2 / 16.5

    ...superadditive, and the control says it is not merely "fewer states": dropping an occupied
    leaf buys 0.3px, dropping never-occupied material buys seventeen.

    and a seeded layout reaches what no arrangement could
      core alone (6 states, 8 transitions)   1602x1146 (1.40:1)   a shot on it: 24.3px event
      remainder attached around it (crude)   1867x1508 (1.24:1)   the atlas: 22.8px event

      today     6 of 13 occurrences stranded on the atlas at 16.3px; no core shot exists
      seeded   13 of 13 occurrences inside a core shot at 24.3px, atlas better than today's

The 22.8px is optimistic — the probe froze the core as an opaque block, so the six untaken edges
attached to the block rather than reaching into `Running` and `Claimed`. The 24.3px is real.

### The claim, stated so it can fail

> A machine's layout should be seeded on the subgraph the scenario traverses. The untaken
> remainder is attached around that core rather than ranked alongside it, and every declared
> transition stays on the map, routed and captioned at full size.

Falsifiable three ways, and all three are real outcomes:

- **If dagre cannot express a core**, the round stops and records that. The alternative is writing
  a bespoke placer, and that is refused in advance — not because it would not work, but because
  this repository does not implement layout machinery (`CLAUDE.md`, decision:36's rule about
  demonstrated rather than anticipated need). A finding that the library will not do it is a
  finding.
- **If seeded candidates lose the audition**, on the scoring already built, the incumbent was right
  and the compact core was not worth what it cost in crossings, ambiguity or atlas legibility.
- **If it wins on leases and hurts the elevator**, it fails. The elevator has one untaken
  transition out of seven; seeding should barely move it, and a seeded layout that reorganises a
  six-state machine is a policy that has learnt the adversarial specimen rather than the problem.

### The thing that is actually being decided

This is not a layout refinement. decision:2, decision:48 and decision:52 have all treated the
picture as an **atlas**: the machine as it is, with a story moving through it. Seeding makes it an
**explanation**: a picture shaped by what is being explained, where the same machine narrated
differently draws differently.

That is a coherent and arguably more honest account of what a presentation is for, and it is a
thesis change rather than a tuning exercise. It gets recorded as a decision *before* the code, and
if the round cannot state the difference clearly enough to write it down, it should not be built.

There is a gap in decision:52 that this pries open, and the round should say so plainly rather than
quietly exploit it. Its formal invariant is *"a pure function of the topology and of how many times
each transition is taken"* — and seeding is a function of exactly that, since a core is the set of
transitions whose count is not zero. Its prose refuses *"no transition is hidden, demoted, dropped
or drawn differently for never being taken"*, and placement-by-relevance is a soft demotion. The
invariant permits what the prose forbids. One of the two has to move, deliberately.

## Success criteria

**The decision**

- A decision artifact recorded *before* the layout code, stating the atlas/explanation choice, what
  it costs, and precisely which half of decision:52 is superseded and which half stands.

**The core**

- The core is derived from the scenario — the transitions taken and the states they touch — and is
  never authorable. No `focus:`, `emphasis:` or `core:` key exists or could exist.
- Every declared transition is on the map, routed, and captioned at its full size, seeded or not.
- Reordering, reversing or rotating the scenario still moves nothing: a core is a set, and the
  determinism test says so.
- If dagre will not express it, that is recorded and the round stops there rather than growing a
  placer.

**The audition**

- Seeded and unseeded candidates are generated from one grid, scored on the signals already built,
  and the election is deterministic and inspectable from the command line.
- `cuecraft explain --audition` reports both families, so the round can say what seeding bought.
- The audition sheet draws the elected seeded candidate beside the elected unseeded one.

**The films**

- On `examples/leases.yaml`: every occurrence inside a shot at or above the 20px floor, or the
  round records exactly which are not and why.
- The canonical overview's event label does not regress below today's 16.3px on leases, nor below
  25.5px on the elevator.
- `examples/elevator.yaml` gains no crossing, strands no occurrence, and its elected layout is
  recognisably the same machine. A test asserts it.
- Both films render through `cuecraft render`, with at least two inspection passes over real
  frames; every defect found in pass one is fixed or recorded.

**De-emphasis**

- Judged on rendered frames, adopted or refused on that evidence, and recorded either way.
- It may change weight, colour or contrast. It may not change size, position or wrapping, and it
  may not make a caption unreadable in the closing shot — the leased runner's last sentence is
  about three untaken transitions, and it has to still be pointing at something.

**The record**

- `npm run check` and `scarp doctor` pass; working tree clean; every task closed.
- dragon:28 is closed, or the round states what it now knows and why that is still not enough.

## Non-goals

sprint:19's and sprint:20's non-goal lists stand and are not restated. Added for this round:

- **No new state-machine semantics.** No pseudostates, no hierarchy, no concurrency, no second
  traveller, no second scenario, no counterfactual inspection, no scenario reset.
- **No bespoke layout engine.** dagre expresses this or the round records that it does not. No
  force-directed pass, no custom placer, no hand-rolled orthogonal router, no second layout
  dependency. This is the non-goal most likely to be argued with halfway through, and it is the
  one that matters most.
- **No authored escape hatch.** The core is derived or it does not exist. No key that names a state,
  a transition, a focus, an emphasis or a circuit is added, and none is added that could become one.
- **No special-casing of either example.** No state name, transition identity, topology shape or
  scenario appears anywhere in the implementation.
- **No hiding, dropping, shrinking or unlabelling any transition.** Whatever de-emphasis turns out
  to be, "the untaken ones are smaller" is not it. That is the failure mode that would make the
  numbers look good and the thesis false.
- **No camera rewrite.** decision:51's planner is expected to benefit from a compact core without
  being changed. If it needs changing, that is a finding and a task, not a licence to redesign the
  shot vocabulary.
- **No fitting the type smaller until it fits.** Refused in advance, for the third sprint running.
- **`world`, `protocol` and the sequence policies are not touched.**

## Outcome

**The round's claim was refuted at its first task, and the non-goal that stopped it there is the
reason the round is worth having.** Neither film changed. `layoutMachine`, `audition.ts` and
`DEFAULT_LAYOUT` are untouched, and the only production change in the whole sprint is eleven lines
of diagnostic text that were saying something untrue.

    the claim   a machine's layout should be seeded on the subgraph the scenario traverses,
                with the untaken remainder attached around that core

    the answer  it cannot be drawn with the dependency this repository has, and the
                alternative is a placer

task:103 measured every lever dagre has — compound clustering, edge weight swept to 150, `minlen`
exile, and their combinations — over the full 144-point grid on both films, against two floors that
have to be met at once: a shot on the run's own territory at or above 20px, and an atlas no worse
than today's 16.3px. **Not one of 4 x 144 configurations met both.** Compound clustering does
exactly what it claims and buys nothing, because a cluster constrains order *within* a rank while
dagre assigns ranks globally; the core keeps spanning every rank the machine spans.

The prize was real, which is what makes the negative worth recording. The six states the leased
runner actually touches, laid out alone, come out 1602 x 1146 = 1.40:1 against a 1.426:1 frame and
give **29.9px** event labels where the whole machine gives 16.3. That number is why the round was
opened and it is still true. It is simply not reachable from here.

### The three falsification conditions, and which one fired

All three were written down before the work and one fired cleanly.

- **"If dagre cannot express a core, the round stops and records that."** This one. It fired at
  task 1, and sprint:21's second non-goal — no bespoke placer — is what turned a tempting afternoon
  into a finding. That non-goal was written before the answer was known, which is the only time it
  could have been written honestly.
- "If seeded candidates lose the audition" — never reached; there were no candidates to elect.
- "If it wins on leases and hurts the elevator" — never reached, though the control was exercised
  anyway and behaved: clustering five of the elevator's six states moves its atlas 0.4px and its
  territory shot not at all.

### What the round found that it was not looking for

- **The shortfall has a second cause, and it is timing rather than geometry.** Occurrences #9, #10
  and #11 of the leased runner are three consecutive silent ones whose move windows are 14 and 11
  frames against `MACHINE.minTravel` = 16. They cannot move, so the shot at #9 must hold all three,
  and the union of their essential bounds is 3078u = **17.0px**. Even a perfect shot on that trio is
  under the floor. decision:51's planner is correct and no camera policy can reach it.
- **The de-emphasis half of the proposal was already built.** Measured off the rendered frame rather
  than argued: never-occupied state plates sit at 158 peak luminance against 202 for visited ones, a
  **21.8%** difference, and untaken edge captions sit at half the alpha of taken ones. `StatePlate`'s
  claim that `possible` is "a real contrast, not a hint" holds under measurement, and an eye
  skimming the frame says otherwise — which is why task:108 said to render. Nothing was added.
- **And the existing treatment is retrospective, deliberately.** The wake dims what has not been
  taken *yet*. Marking never-taken material from frame one is available to a compiler that knows the
  whole scenario, and it would spoil `examples/leases.yaml`, which closes on "succeeded and failed
  are still sitting there". Foreknowledge is not always worth spending — which is a genuine
  qualification of sprint:20's thesis, arrived at from the opposite direction.
- **One real defect, found and fixed.** `cuecraft explain` reported `no move worth 9px` for holds
  whose move was never priced because there was no room for it. task:110 separates the two and a
  test asserts both. It is the round's only production change and it exists because instrumenting
  the planner to check a layout hypothesis showed the instrument lying.

### Against the success criteria, honestly

Met: the decision recorded (decision:53, in the negative — see task:104); the core derived and never
authorable, because it was never built; no new dependency; both films unregressed at 16.3px and
25.5px because neither moved; `npm run check` and `scarp doctor` pass; working tree clean; every
task closed; de-emphasis judged on frames and refused with the evidence recorded.

Not met, and not by fatigue: **every occurrence at or above the 20px floor.** Six of the leased
runner's thirteen are still at 16.3px, and the round now knows in three independent ways why, which
is the opposite of where it hoped to end. The two-pass frame inspection did not happen because
nothing changed to inspect; what the one pass did find is in task:107, including that the first
still was rendered at the wrong viewport and caught by measuring ink rather than by eye.

dragon:28 is **not closed**, and the case for closing it as *inherent* is now much stronger than
sprint:20 could make it. Closing it needs the ceiling written down next to the grammar, where an
author can check it before writing a machine — which is its own round.

### What was refused and stayed refused

Every non-goal held, and the one that mattered held under pressure at the exact moment it was
designed for. No placer. No second layout dependency. No authored key of any kind. No state name,
transition identity or topology shape anywhere in the implementation. No camera rewrite — the
planner was instrumented and found correct, not adjusted. No constant tuned to make a number look
better: `CROSSING_PRICE`, `FRAMABLE_PRICE`, `movePrice` and `MACHINE.eventPx` are all byte-identical.
`world`, `protocol` and the sequence policies were not touched.
