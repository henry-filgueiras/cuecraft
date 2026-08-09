---
id: spr_01KZJDK32M4VSS1AC8R169WAWK
sequence: 20
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
---

# Compose the whole explanation, not each beat of it

## Goal

Make the two `circuit` films perceptually and cinematographically convincing, without touching the
semantic contract sprint:19 established. Five workstreams, one hypothesis, and a refusal to add a
single new state-machine concept:

1. a chronological **execution ledger** that replaces the readout's route breadcrumb;
2. **timing** decomposed into phases, so a silent arrival owns a stable hold of its own;
3. **camera planning** with foreknowledge of the whole scenario, over a named shot vocabulary;
4. a real **layout audition** for cyclic labelled graphs, scored against candidates;
5. **diagnostics** that make all three inspectable and repeatable from the command line.

The grammar does not change. Neither example gains a coordinate, a colour, a duration or a camera
key, and no `machine:` key is added, removed or reinterpreted.

## Rationale

sprint:19 proved the semantic model: a fixed possible machine, one ordered scenario of transition
occurrences, persistent occupancy, a wake, cumulative counts, optional narration, and layout,
timing and camera all derived. It ended with two films that work and a list of things that were
visible in the frames and were not fixed, because fixing them was not what that round was for.

This round exists to test a different claim, and it is a claim about **compilers** rather than
about state machines:

> Because cuecraft knows the complete graph, the complete scenario, the narration durations and
> the transition sequence *before rendering begins*, it can plan layout, timing, history
> presentation and camera behaviour as one globally informed audiovisual composition rather than
> as a succession of locally greedy decisions.

Every policy in the composition today is local. `shotFor` decides each shot against the one before
it and knows nothing about the one after. `dwellFor` prices an occurrence from its own label and
its run position. The readout shows the last four states because four is what fits. dagre is asked
for one layout and the answer is accepted. Each of those is individually defensible and the sprint
that wrote them said so. What none of them has ever been asked is whether **foreknowledge is worth
anything** — whether a planner that can see the whole film composes better than one that cannot.

That is a question with a real negative answer available. If a lookahead planner picks the same
shots as the greedy one, if scoring four layout candidates elects the one dagre already produced,
if a phase budget lands where the derived clock already landed, then the finding is that local
policy was sufficient and foreknowledge bought nothing — and that is worth as much as the positive
result, because it is the cheaper architecture.

### The hypotheses, stated as hypotheses

- **H1 — aggregate history is not chronological history.** The wake and the `×N` counts say *which
  edges were taken and how often*, spatially. They cannot say *in what order*, and the readout's
  route says only which states were passed. If a ledger of transition **occurrences** answers the
  paused-frame question better than a list of states, the two are complementary devices and both
  stay. If the ledger merely restates the wake, it is chrome competing with the map.
- **H2 — a silent arrival is a distinct perceptual phase and is currently starved.** `dwellFor`
  prices a whole occurrence and the crossing is taken out of the middle of it. If the residue after
  camera and traversal is too short to register occupancy, the fix is a phase budget rather than a
  larger total.
- **H3 — the closing hold is mostly travel.** sprint:19 raised `post_say` to 9000ms in both
  examples because the pull-back ate a 156-frame post-roll. Nine seconds of silence is a large
  number to have arrived at by doubling. Measure what it actually buys.
- **H4 — the camera accepts bounding rectangles it should refuse.** `shotFor` is a three-rung
  ladder with no notion of *how much this move is worth*. If a canonical overview and a deadband
  remove shots without removing information, locality was the defect.
- **H5 — whole-scenario planning beats greedy planning.** Falsifiable: if lookahead changes no
  shot in either film, it did not.
- **H6 — the scenario is legitimate layout evidence.** A machine laid out to make its frequently
  travelled edges short and uncrossed may be a better *atlas* than one laid out blind, provided the
  untaken topology is not demoted. If scoring candidates elects the incumbent, dagre's default was
  already the answer and that closes the question rather than leaving it open.

### What this round is not

It is not a rescue mission for `examples/leases.yaml`. leases is the adversarial specimen and its
job is to be hostile; a change that makes leases prettier by making the elevator worse has failed.
`examples/elevator.yaml` is the control, and every policy here is judged against both.

## Success criteria

**The ledger**

- History is a list of transition **occurrences** in chronological order, screen-fixed, and
  distinguishes repeats and parallel edges between the same pair of states.
- Overflow degrades to an explicit count of what is missing, never to an anonymous `…`.
- The graph viewport accounts for the region the ledger occupies, and no entry accumulating
  anywhere in the film relayouts a node or recomposes the viewport.
- Cumulative `×N` counts survive on the edges, unless a rendered frame convicts them.

**Timing**

- Each occurrence's camera / traversal / arrival / narration / hold intervals are separately
  derivable and separately inspectable.
- A silent occurrence has a stable post-arrival hold that a test can assert a floor on.
- The final post-roll is measured in both films, and whatever is not buying a settled overview is
  removed. One padding mechanism, not several.

**Camera**

- A named shot vocabulary, with the canonical overview an exact reusable composition rather than a
  family of near-overviews.
- The film opens on it and ends on it, exactly.
- Planning consults the whole scenario. Deadband/hysteresis prevents perceptually pointless moves.
- A camera-plan diagnostic records candidates, the selection, the scores, and the reason for every
  hold and every move.

**Layout**

- More than one credible candidate policy, deterministically generated and scored on stated
  signals, with the audition reproducible from the command line.
- A visible audition artifact for leases — labelled candidate stills or a contact sheet — so the
  winner is supported by pixels and not only by a scalar.
- Node positions still a pure function of topology *and the layout policy*; permuting the scenario
  still moves nothing when the elected policy does not consult the scenario, and if it does, the
  determinism test says what it now asserts instead.

**The films**

- Both render through `cuecraft render`; at least two inspection passes over real frames; every
  defect found in pass one either fixed or recorded.
- The three original paused-frame questions still answered, plus four more: which occurrence just
  happened, did the camera move for the viewer, was this state occupied long enough to perceive,
  and is the atlas intelligible without the camera rescuing it.

**The record**

- `npm run check` and `scarp doctor` pass; working tree clean; every task closed; decisions record
  what the films actually showed, and refuted hypotheses are recorded as refuted.

## Non-goals

The whole of sprint:19's non-goal list stands, and is not restated. Added for this round:

- **No new state-machine semantics of any kind.** No pseudostates, no hierarchy, no concurrency, no
  second traveller, no guards as concepts, no counterfactual inspection, no scenario reset, no
  second scenario, no progressive topology, no Mermaid or SCXML.
- **No authored escape hatch.** If an automatic policy is hard, it stays automatic or it is
  recorded as a dragon. No coordinate, route, colour, timing or camera key becomes authorable, and
  no key is added that could become one.
- **No special-casing of either example.** No state name, transition identity, topology shape or
  scenario appears anywhere in the implementation.
- **No general graph-editor machinery, and no cinematic IDE.** Diagnostics are proportional to the
  decisions they explain.
- **No promotion of `circuit` policy into shared abstraction without a second caller.** decision:36
  and idea:20's rule, for the third time: sharing is demonstrated, never anticipated.
- **No fitting the type smaller until nothing overflows.** That is the failure mode of every one of
  these five workstreams and it is refused in advance in all five.
- **`world`, `protocol` and the sequence policies are not changed to accommodate this.** If
  something has to give, it is a finding.

## Outcome

Both films render through the ordinary pipeline from a grammar that gained nothing. No key was
added, removed or reinterpreted; neither example contains a coordinate, a colour, a duration or a
camera instruction; and the only number either of them changed is `post_say`, which came *down*.

    baseline -> after, on the same instrument (`cuecraft explain`)

    elevator   silent hold    0-18 frames        ->  42-52 frames (1400-1733ms)
               camera         5 moves in 8       ->  0 moves in 8
               overview       26.5px / 18.0px    ->  37.5px / 25.5px
               post-roll      9000ms (4333 travel) -> 3533ms (533 travel, 3000 settled)
               film           69.8s              ->  67.2s

    leases     silent hold    0-24 frames        ->  20-52 frames (667-1733ms)
               camera         11 moves in 13     ->  6 moves in 13, 10 of 13 occurrences
                              (10 identical pans)    below the legibility floor -> 1 of 13
               overview       23.4px / 15.9px    ->  23.9px / 16.3px, with a 380px rail gone
               post-roll      9000ms             ->  3700ms
               film           88.0s              ->  87.8s

### The hypothesis held, and the two places it did not are the finding

The round's claim was that a compiler with complete foreknowledge can compose layout, timing,
history and camera as one thing rather than as a succession of locally greedy decisions. Five of the
six hypotheses survived contact with a render and one was refuted twice before it was adopted in a
narrower form.

- **H1 held.** Aggregate and chronological history are different devices and both stayed
  (decision:49). The counts were suspected of being redundant once a ledger existed and are not: the
  rail keeps six entries and the counts are on every edge for the whole film.
- **H2 held, and the cause was not the one assumed.** The silent arrival was not merely short, it
  was *zero* on four of nine occurrences — because `MACHINE.lead` guarded the front of a move and
  nothing guarded the back, so the camera routinely set off before the traveller landed
  (decision:50).
- **H3 held.** Nine seconds of closing silence was 4333ms of camera travel over a shot the planner
  had already widened almost to the overview.
- **H4 and H5 held, and by a wide margin.** The elevator taking **zero** camera moves is the result
  that says most: a greedy planner cannot reach it, because it dives on its first occurrence and
  never comes back. Whole-scenario planning is not a refinement of the hold policy here, it is a
  different answer (decision:51).
- **H6 was refuted, then re-tested, then adopted narrowly.** Scenario-weighted layout scored *worse*
  on the first pass — more crossings, wider machine — and the honest reading was that the invariant
  should stand. What changed it was measuring the **film** rather than the layout: under rival
  layouts, the camera plan showed 10 of 13 occurrences below the legibility floor against 5 of 13.
  A scalar said no and a plan said yes, and the plan is closer to what a viewer sees. sprint:19's
  invariant is weakened precisely and no further (decision:52).

### What the frames changed, and the order matters

Four defects, none visible in a test, all four obvious in a rendered frame.

1. **The graph was drawn under the ledger.** Found on a contact sheet rather than a still: at a
   close shot, everything outside the viewport carried on past the edge and under the rail. A
   reservation that is not enforced by a clip is a reservation the composition merely intends.
2. **The cost function had no legibility floor**, so the leased runner held its canonical overview
   for twelve of thirteen occurrences at fifteen pixels a word. Priced linearly, "unreadable" is
   only a few pixels worse than "less comfortable"; it is a difference of kind.
3. **The audition's scalar disagreed with the audition's pictures.** The panels showed a knot of
   five routes under the six-exit hub that a point and a half of score had waved through.
4. **The title crowded the rail, and greedy wrapping orphaned last words** — `downstream returns` /
   `429`, which reads as a caption belonging to something else.

### One thing was built, measured, and taken back out

An explicit price for a camera move that eats into an arrival's stillness. It cannot discriminate: a
move only happens when the shot being held no longer *contains* the next occurrence, and every
alternative — including retreating to the overview — is equally a move and pays the same intrusion.
It changed no shot in either film and was removed rather than kept as unexercised machinery. The
underlying conflict is real and is recorded in decision:50: a silent occurrence runs about sixty
frames and a camera move needs about thirty-six of them, so on two of the leased runner's six silent
arrivals the film spends 667ms of stillness rather than 1400ms, and no rule can have both.

### The paused-frame test, at seven questions

**`examples/elevator.yaml`: yes to all seven.** Where, how, what else, which occurrence, and the
camera answers the fifth by never moving — at 25px event labels in the canonical overview there is
nothing a move could buy. Every silent arrival holds for at least 1400ms. The atlas needs no rescue.

**`examples/leases.yaml`: yes to six, and the seventh is dragon:28.** The ledger answers *which
occurrence* unambiguously, including the parallel pair that a list of states cannot distinguish. The
camera moves six times and every move buys 4-14 pixels of event label. Two silent arrivals get
667ms instead of 1400ms. And at the canonical overview four untaken transitions are still
unreadable — which is the adversarial specimen doing what it was written to do, now with 144 data
points behind the diagnosis instead of one.

### What was refused and stayed refused

Every non-goal held. No new state-machine semantics of any kind; no authored coordinate, route,
colour, timing or camera key, and no key that could become one; no state name, transition identity
or topology shape anywhere in the implementation; no graph-editor machinery and no cinematic IDE.
`world`, `protocol` and the sequence policies are untouched — `dwellFor` and `dwellMs` are
byte-identical and the transcript is timed exactly as it was. `./camera.ts` gained no domain
knowledge and lost a caller: `circuit` no longer uses `shotFor`, because the ladder it embodies *is*
the greedy policy this round replaced.

One refusal was tested rather than assumed: `examples/elevator.yaml` is the control, and a test
asserts that the elected layout gains no crossing and strands no occurrence on a six-state machine.
Every policy here was checked against the small film as well as the hostile one.
