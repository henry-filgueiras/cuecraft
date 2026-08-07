---
id: drg_01KZCWNC9B3FNFV68KWKFQGZ63
sequence: 10
kind: dragon
status: open
created: 2026-08-06
---

# Is a figure two nouns, or the first two entries of a reflection API?

## Context

decision:27 built two figures and deliberately not a third. The obvious third is **presentation
state** — the entities of the deck moving between `future`, `hot` and `established` as the compiled
event stream advances — and it was the one the round was most excited about, because it contains
the delightful possibility that the state visualization shows the state of the node whose interior
you are currently inside.

It was not built, and the reason is worth recording rather than the omission.

`timing` and `anchors` are both **records**: a list of things that happened, each with a number
attached, each true independently of where it is drawn. `state` is not a record. It is what the
renderer is *currently doing*, and every archetype computes it locally from `anchorState` against
the frame it is on. To put it in a figure, one of two things has to happen:

1. The renderer's own activation state becomes a compilation fact — which it is not. It is a
   function of the frame, computed thirty times a second in eight different compositions, and
   promoting it to a frozen record would mean either freezing something that changes or exporting
   the function that computes it.
2. The figure re-derives it from the frozen anchors — which is honest, cheap, and *exactly what
   every other composition already does*. `anchorState(frame, anchor.frame)` is public and pure.

Option 2 works and is about forty lines. It was skipped on time, not on principle, and that is the
uncomfortable part: a `state` figure would be very easy and would look good, and neither of those
is an argument that cuecraft should have one.

## Question

Is `figure` a small closed vocabulary of two, or the beginning of a reflection surface?

## Constraints

Every kind added is cheap on its own. `state` is forty lines. After it, the obvious asks are
`composition` (which archetype each slide got, which the CLI already prints), `narration` (voices,
speeds), `source` (the deck's own YAML, which `code: file:` can already quote), and eventually a
count of something. Each is defensible; the set is a reflection API assembled one reasonable step
at a time, and the point at which that becomes obvious is well past the point at which it becomes
expensive to reverse.

The countervailing evidence is that the two that exist are genuinely good, and that the *reason*
they are good is not that they are compiler internals — it is that they are the two facts the
project's thesis is about. Measured time and resolved identity are what decision:1 claims cuecraft
does. A figure of the voice list would be a figure of an implementation detail.

## Candidate direction

Hold at two, and use that as the test for the third: a kind earns its place if a presentation about
**what cuecraft claims** cannot be made without it — not if a presentation about how cuecraft works
would be enriched by it. `state` plausibly passes that test, which is why this is a dragon and not
a decision to refuse.

Do not add a kind because it is easy. The first one added for that reason is the one that turns a
noun into an API.

## Resolution criteria

Close as **closed vocabulary** if two survives another showpiece unchanged; as **surface** if a
third and fourth are added and the pressure is clearly for a fifth, in which case the honest move
is to design the reflection boundary deliberately rather than to keep extending an enum.
