---
id: spr_01KZFH96N7BQC1P54W511N83AX
sequence: 10
kind: sprint
status: closed
created: 2026-08-07
closed: 2026-08-07
---

# Spend width on time, not on the cast

## Goal

Find out whether cuecraft's foreknowledge of an entire protocol can make it spend horizontal space
according to the exchange's *temporal* needs rather than its cast size — **without ever making a
viewer relearn where a living participant is**.

The transcript composition gives every actor a permanent column. `examples/tap.yaml` is the case
that makes look right: five parties, all of them present for most of the film, stable positions a
viewer learns once. `examples/deploy.yaml` is the case that makes it look expensive: eight parties,
several of whom say four things and are never heard from again, each holding a column for the
entire ninety seconds. The cast is 4000 world units wide, the establishing shot is at the
legibility floor (dragon:18), and every later shot is scaled to a world that is mostly nobody.

The experiment is one pass, offline, between parsing and layout:

    parse  ->  actor lifetimes  ->  physical slot allocation  ->  existing layout  ->  existing camera

An actor gets `first_use` and `last_use`, therefore a live interval; two actors whose intervals do
not overlap are candidates for the same physical column at different times. `N` semantic actors,
`M` physical slots, `M < N` when the protocol permits it.

## Rationale

**The invariant is the experiment.** Nothing may move. Not "moves rarely", not "moves when the
camera is elsewhere" — an actor is assigned one slot for the whole film and the assignment is a
pure function of the source. This is register allocation over live intervals, not responsive
layout, and the difference is that the allocator runs *before* anything is drawn and never runs
again. If a policy needs to know where the camera currently is, it is the wrong policy.

**The interesting half is not the arithmetic, it is the honesty.** Interval colouring is a solved
problem and its answer for `deploy` is four columns. The question this round actually has to answer
is when a column may *stop being* one actor and *start being* another without the film asserting
something false. Semantic death (`last_use`) is not visual death: an actor's arrows, its plate and
its lifeline are all still on screen long after its last message, and dropping a new name into that
column while its predecessor's traffic is still in frame would be a lie the notation tells for
free. So the round is expected to reclaim *less* than the arithmetic allows, and the gap between
those two numbers is the finding.

**Why the obvious ordering hypothesis is probably wrong, and worth disproving in public.** The
tempting policy is *longest-lived actors get the leftmost slots*. `examples/tap.yaml` refutes it in
one line: its longest-lived actor is the shop's bank, and a lane order of
`bank, network, issuer, you, terminal` destroys the one thing that file gets for free — that the
question travels left to right and the answer comes back. Written order is not arrival order
dressed up; it is the author's statement of the protocol's shape, and decision:34 already refused
to let anything else set it. The hypothesis this round should test instead is that **reuse alone**
handles the pathology the ordering was invented for: disposable early actors do not need to be
demoted if they *vacate*.

**Why this is not the camera round.** A narrower world should improve framing for free, and whether
it does is the measurement. Nothing in `./camera.ts` or `transcriptPlan` gets rewritten to help it;
observations about reframing frequency are recorded for a later controlled experiment, not acted
on.

## Success criteria

**Allocation**

- An actor's slot is fixed for the entire film and derived from the source alone. Two actors whose
  live intervals overlap never share a slot. Allocation is deterministic and stable under
  re-declaration that does not change the protocol.
- A slot is reclaimed only where the rendering makes it unambiguous that a *new* party has arrived.
  The reclamation boundary is stated, derived from something that already exists, and defended —
  not tuned until the examples look good.
- `examples/tap.yaml` allocates one slot per actor and renders **identically to its baseline**.
  Nothing may be spent on the healthy case.
- No author-facing key is added. Not a lane, not an importance, not a policy name.

**Rendering**

- A slot that changes hands does so through a visible event: the outgoing tenancy is terminated,
  and the incoming actor is established in its own right. No label ever mutates under a continuous
  lifeline.
- A viewer can always find out who a column currently is, including after the cast has scrolled
  away.
- History is not damaged: causal context that was legible before is legible after.

**Evaluation**

- Baselines preserved. `tap`, `deploy` and one new synthetic example rendered and **watched end to
  end**, and the aesthetic gate is the criterion. `tap` no worse; `deploy` materially better use of
  width, or an honest record that it was not.
- Reported per example: semantic actors, physical slots, peak simultaneous live actors, reuses.
  The reduction is evidence, not the acceptance test.

**Engineering**

- One small deterministic pass, unit-testable without a browser, not a layout optimizer.
- Tests for: no overlap sharing, no actor ever moving, safe reuse taken, determinism, and stability
  under input perturbation.
- `npm run check`, `npm run test:render`, `scarp doctor` clean.

## Non-goals

**Camera hysteresis.** The observation that the transcript recomposes more often than a
cinematographer would is real and is *not* this round's problem. Solving it here would confound the
two variables the pair of experiments exists to separate. Recorded, not built.

**A general layout engine.** No constraint solver, no scoring function combining message count,
degree, narration length and lifetime. If the simple policy has a counterexample, the counterexample
gets written down.

**Reordering the cast.** The written order sets the slot order for first tenants. Nothing sorts
lanes by importance, traffic, or lifetime.

**Parallelism, and everything else sprint:9 refused** (idea:17). Also refused: an author override
for allocation, per-actor colour, an explicit `create`/`destroy` vocabulary in the source, and any
change to the camera policy that is not forced by allocation.

**Example-specific anything.** No coordinate, no branch, no constant that exists because `deploy`
has eight actors.

## Outcome

Every success criterion was met, and the round's most useful result is one it did not go looking
for: the conservative rule it shipped is defensible, but **not for the reason it was designed
around**. See dragon:19.

    examples/tap.yaml        5 actors -> 5 columns, 0 reuses    unchanged, to the pixel
    examples/deploy.yaml     8 actors -> 6 columns, 2 reuses    cast 4547 -> 3300  (-27%)
    examples/coldstart.yaml  9 actors -> 7 columns, 2 reuses    cast 5115 -> 3988  (-22%)

### What the round cost, in code

    src/render/tenancy.ts            213   lifetimes, allocation, and the cooling argument
    src/render/protocol.ts            +70  tenancy in the layout; the row cursor reserves an arrival
    layouts.tsx                       +60  terminator, arrival, and a rail that names the tenant
    theme.ts, cli.ts                  +40  two constants and four numbers printed
    tests                            +330

No change to `./camera.ts`, to `transcriptPlan`, to the beat, to the cue list, to the parser, or to
the format. The allocator is a pure function from `(actors, steps)` to `actor -> column` and it does
not know what a frame is.

### 1. Was global lifetime information actually useful?

**Yes, and more cheaply than expected.** `first_use`/`last_use` is eleven lines, the allocation is
another twenty, and between them they take a quarter off the width of the adversarial example. It is
the first thing this project has derived that a *frame-by-frame* renderer could not have derived at
all — every other automatic policy here could in principle be computed from what is on screen now.

The deeper use was not the width. It was that **an actor's identity and its column stopped being the
same number**, which is a distinction the composition had conflated since sprint:9 and which turns
out to cost nothing to separate: `Lane.index` stayed the declaration order the anchor model
addresses, `Lane.slot` became the compiler's.

### 2. How much width did it save on `deploy`?

Cast row 4547 -> 3300 world units, 27%. Eight names at ~24 screen pixels in the establishing shot
became six at ~32, which is the difference between "legible for the few seconds it lasts" and
readable.

### 3. Did width reduction improve the camera without camera changes?

**Exactly in proportion, and not one bit more — which is the cleanly separated answer.** `deploy`'s
total pan fell 27% while its world narrowed 27%; pan expressed as a fraction of world width is
unchanged at 1.45. The camera did not behave better. It had less to cross.

Two things did improve non-proportionally and both are worth keeping:

- **Zoom range fell 41%** on `deploy`. Shot sizes are more consistent, because the world no longer
  contains stretches the shot has to open up to reach across.
- **`coldstart` held one more shot and produced one fewer key** than the same protocol laid out
  without reuse, and its pan/world ratio fell from 1.00 to 0.88.

So the honest claim is: better world allocation buys the camera absolute travel, and buys the
*framing* a little consistency, and does not touch the reframing frequency at all. The camera
hysteresis question is untouched and uncontaminated, which is what the pair of experiments was for.

### 4. Was semantic `last_use` sufficient?

**No — and the reason it is insufficient is not the reason the round assumed.**

The rule shipped is that a column cools for `maxHistoryRows` before it may be relet, on the argument
that the two tenants' traffic must never share a frame. That argument has a hole, found by rendering
rather than by thinking: a shot is a *contiguous* vertical range, and the terminator and the arrival
plate lie between the two tenants' traffic, so any frame containing both necessarily contains the
handover. Delaying reclamation mostly guarantees the viewer never watches the handover happen.

`examples/coldstart.yaml` was rebuilt at zero cooling and watched. Its handovers are **better**: two
columns changing hands in the same reserved band reads as the setup cast leaving the stage and the
runtime cast walking on, which is exactly what the protocol is doing. And its *opening* falls apart,
because the cast row is "the first tenant of every column" — at zero cooling that becomes
`Boot script, Resolver, Orders service, Cache, Database`, which omits the two parties the second
half is about and includes two that do not appear until the last third.

So the cooling distance is quietly doing two jobs, and only one of them is the one it was written
for. dragon:19 holds the question.

### 5. Did longest-lifetime-first produce useful anchors?

**It was refused before it was built, and `examples/tap.yaml` is the counterexample.** Its
longest-lived actor is the shop's bank; lifetime order gives `bank, network, issuer, you, terminal`
and destroys the left-to-right reading that is the whole of what that film teaches. Recorded in
decision:38 rather than tuned around.

### 6. Did early short-lived actors coexist with later long-lived anchors?

**Yes, and this is the finding that made the ranking hypothesis unnecessary.** The pathology it was
invented for — disposable early actors permanently staking the best real estate — dissolves under
reuse: `examples/coldstart.yaml` gives its four setup actors columns 0-3 and nothing demotes them,
and two of the four *vacate*, which hands the leftmost columns to later arrivals with nobody being
ranked. Arrival order plus reuse is strictly simpler than any ordering policy and produces the
outcome the ordering policy wanted.

There is a second-order cost, and it is structural rather than a defect in the rule: **the columns
that come free are exactly the ones the early phase used, which are the leftmost ones**, while a
protocol's late phase usually lives on the right. So a reclaiming newcomer tends to land far from
whoever introduced it — `coldstart`'s cache is in column 1 while the orders service is in column 6,
and `orders -> cache` crosses the entire picture. Width was traded for arrow length. On these two
examples the trade looks worth it; it will not always.

### 7. Did lane reuse ever create false continuity?

**Not once that was findable in three watched films**, and the first attempt at the terminator was
the near miss. A thin cap on the lifeline read as a stray tick in the grid, and the whole burden of
the policy rests on it; the shipped version is a solid run-in and a bar at nearly twice the width,
and at that weight the handover reads as notation rather than as debris. That was a change made by
looking at a frame, which is now four rounds in a row.

The weakest remaining link is **hue**, which is a fact about the column, so two tenants share one.
Deliberate — hue answers "who sent this arrow whose tail is off frame", a question about the
present, and no two tenants are ever present together. Nothing in the watched films exposed it.

### 8. Identity versus presentation slot

**Yes, and it is the round's most reusable result.** The distinction is now explicit in the types,
and everything semantic stayed on the identity side without a single call site changing: the anchor
model still addresses actors by declaration index, a prologue still reaches one by name, and
`activates: network` works exactly as it did. The whole of the change lives on the presentation
side.

### 9. Is the allocator reusable, or sequence-specific?

**The allocation is reusable; the notation is not.** `lifetimesOf`/`allocateLanes` mention nothing
about messages, lanes, or geometry — they are intervals in and slots out, and any visualisation that
lays out a fixed set of tracks against time could use them unchanged. What does not travel is
everything that makes the reuse *honest*: the terminator, the reserved arrival band, the rail, and
the cast row. Those are facts about a sequence diagram. Promoting the allocator without them would
be shipping the easy half.

Not generalised, on the sprint:9 precedent: one artifact pair is not evidence.

### 10. Counterexamples the simple policy exposed

- **Lifetime ranking breaks `tap`** (finding 5).
- **The cooling distance is load-bearing for the wrong reason** (finding 4, dragon:19).
- **Reclaimed columns are always leftmost, so newcomers land far from their counterparts**
  (finding 6).
- **`examples/deploy.yaml`'s prologue now counts eight parties over six plates.** True of the
  protocol and no longer true of the opening frame. Left alone: rewording the adversarial artifact
  to flatter the implementation is precisely what that artifact exists to prevent.
- **dragon:18 is loosened rather than resolved.** Nine actors now establish because only seven are
  ever in the opening row; nine *simultaneously live* actors are exactly as unshowable as before.

### 11. What to test next

In this order, and one at a time:

1. **dragon:19** — reclaim promptly, and choose the opening cast on purpose instead of inheriting it
   from the allocator. This is the experiment the round wants to have run, and it is a change to the
   cast row rather than to the allocator.
2. **Camera hysteresis**, now that lifetime-aware layout is fixed and its contribution is measured
   at exactly proportional. Whatever remains is genuinely the camera's.
3. **A protocol where reuse hurts** — a long exchange whose late phase talks constantly to a
   reclaimed leftmost column — to find out how expensive finding 6 gets.

### Recommendation

**Retain, on by default, as the current behaviour rather than as a settled one.** It cannot make a
protocol worse than it was — a cast with no reusable interval is provably the film it always was —
and on the two protocols where it does anything it takes a quarter off the width and reads cleanly.
What is not settled is the reclamation boundary, and dragon:19 says so with the numbers.
