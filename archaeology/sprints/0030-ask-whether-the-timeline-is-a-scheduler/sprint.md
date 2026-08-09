---
id: spr_01KZMB06WDSJMNNW2MEEH53GV8
sequence: 30
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Ask whether the timeline is a scheduler

## Goal

Answer one question with evidence from the code rather than from the vocabulary:

> Is cuecraft's presentation timeline usefully understood as the execution trace of cooperatively
> scheduled temporal producers, such that making the scheduler explicit would let a temporal medium
> yield presentation time back to the narration and resume from where it stopped?

Produce a GREEN / YELLOW / RED verdict, and implement **only** on GREEN.

The hypothesis being tested is a specific one, and it has three separable parts that are worth
failing independently:

1. **Scheduling.** That the existing implementation is a degenerate case of run / block / yield /
   finish over temporal producers, and that naming those states exposes something latent.
2. **Rendezvous.** That `activates:` (narration → representation) has a dual — a medium reaching a
   semantic state and handing the floor back — and that the two are the same relation read in
   opposite directions.
3. **Lowering.** That yield points can be resolved into ordinary sequential segments *before*
   absolute frames are assigned, so nothing downstream of `buildTimeline` learns a new concept.

## Rationale

The observation that prompted this is real and is visible in `compile/timeline.ts:482`: four kinds
of occupant — speech clips, `Call`s, dwells, recalls — are merged into one list and walked on one
cursor, and the comment above the merge already reaches for the vocabulary ("two kinds of occupant
of one serial track"). `stackProblem` validates that flattening a *tree* of narrations preserved
the tree. That looks like a scheduler with the states filed off.

Four open dragons also look, from a distance, like one symptom of a missing ownership model:
dragon:24 (two narrators cannot interrupt), dragon:15 (a fill and its boundary timed by different
clocks), dragon:27 (a body can be introduced but not concluded), dragon:12 (the length of a descent
is neither authored nor derived — `ENTER_MS = 1900` is literally "what does a yield cost"). If one
architecture closes several, that is a far stronger claim than any feature. **Testing that cluster
hypothesis is the round's main job**, because it is the part most likely to be wrong and most
expensive to be wrong about later.

Against it stands the thing this round must not talk itself out of: cuecraft has **no temporal
media at all**. No `<Video>`, no `OffthreadVideo`, no animation with a time axis; an exhibit is a
PNG, an SVG or a table. decision:2 scopes v0 to slides and narration, and idea:1 and idea:2 park
exactly the scene types this would serve. So the abstraction is being evaluated for a producer that
does not exist, which is the classic shape of a design that is correct and premature.

dragon:24 has already written down the failure mode in the project's own words: "two parallel
narration tracks that a composition would have to reconcile — that is a timeline engine, and
decision:5 says cuecraft does not build one of those."

## Success criteria

- Every producer and consumer of presentation time is inventoried, with the stage at which its
  duration becomes known and whether it can extend the timeline. Complete enough that a reader can
  say what would happen to each if an unexpected duration were inserted.
- The current implementation has been modelled against READY / BLOCKED / DONE explicitly, and the
  places where the model *breaks* are written down rather than smoothed over.
- The cluster hypothesis is tested dragon by dragon and the result is recorded either way. "None of
  the four is closed by this" is an acceptable and valuable outcome.
- The lowering question is answered concretely: earliest stage, latest safe stage, what is known
  when, and what the renderer would actually cost.
- A verdict artifact exists that a future round can act on without re-reading the codebase, and
  that states what evidence would change it.
- On GREEN and only on GREEN: a rendered film in which a medium freezes at a semantic state, the
  narration speaks over the frozen frame, and the medium resumes from the same position.

## Non-goals

- **No scene type.** A video or animation scene crosses decision:2's line and needs its own decision
  first. If the verdict is GREEN, that decision is the first task and not an implementation detail.
- **No preemption, no overlap, no second track.** dragon:24's overlap question is adjacent and is
  not being answered here. Anything that lets two things sound at once is out.
- **No live/interactive execution.** The local/logical/global distinction is being used as an
  analytical tool to find absolute-time assumptions, not as a requirement to satisfy.
- **No refactor for its own sake.** Renaming the cursor loop into scheduler vocabulary while it
  keeps doing exactly what it does today is a cost with no result, and is explicitly refused.
- **No widening of `framesFor`.** Whatever comes out of this, one rounding rule in one place is not
  negotiable (decision:9).

## Outcome

**YELLOW.** decision:63 carries the verdict and the archaeology; idea:27 carries the design that was
not built. No production code changed, and the last success criterion — a rendered film in which a
medium freezes, is narrated over, and resumes — was deliberately not attempted, because it was
gated on GREEN and the round did not reach GREEN.

The round ended somewhere other than where it aimed, in a specific and useful way. It set out to
find a latent scheduler and found that **the scheduler already ran, at parse time, and left no
trace to expose**. `bindNarration` inlines a descent before anything is measured; `stackProblem` is
a test-only assertion that the flattening preserved the tree; by `buildTimeline` there is a flat
list of five leaf kinds walked by one cursor, every duration known before the cursor arrives, and
BLOCKED unreachable. The only genuine block in cuecraft is `compilePresentation` awaiting the
synthesizer, which is dragon:1's build-time ordering and not a scheduling state.

The three parts of the hypothesis came apart cleanly, which is the result worth keeping:

- **Scheduling — refused.** Nothing is exposed by naming states in a straight line with one
  producer.
- **Rendezvous — sound, and survives.** The dual of `activates:` is a real relation, and because
  compilation has complete foreknowledge the yield set is `annotations ∩ subscriptions`, computed
  once, with no runtime.
- **Lowering — viable, and already the house idiom.** It is what `enter:` does, at the earliest
  possible stage. A yielding medium is five leaf cues on the existing cursor.

**The cluster hypothesis failed, four for four**, and that was the round's main job. dragon:12,
dragon:15, dragon:24 and dragon:27 stay open; none is closed by an ownership model, and dragon:15
would be made *worse* by one, because closing it requires the camera to request time and that
inverts a dependency decision:22 and decision:9 both hold. What the round did buy is a sharper
shared characterisation of dragon:12 and dragon:15 — *a consumer that cannot ask for time* — which
is where a future round should look instead of at scheduling.

The decisive fact, and the one the briefing could not have known: cuecraft contains **no temporal
medium at all**. The abstraction was being evaluated for a producer that does not exist, and the
scene type that would supply one is parked behind decision:2 in idea:1 and idea:2. That is why
idea:27 is gated behind a scene-type decision rather than behind decision:63 — the scheduling
question turned out to be the small part.

Two incidental findings were recorded rather than acted on. `cue.ts` claims a recall borrows call
semantics; the implementation is a leaf with a borrowed duration, and decision:63 is now the place
that says so. And `RecalledCanvas`'s proven-byte-identical time remap, `sourceFrom + (frame -
from)`, is the primitive a freeze needs with its slope set to zero — so the instant-replay stretch
goal is already present in the codebase under a different noun.

Every non-goal held. Nothing was renamed, no clock was added, and `framesFor` is untouched.
