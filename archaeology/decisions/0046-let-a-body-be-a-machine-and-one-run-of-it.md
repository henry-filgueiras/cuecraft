---
id: dec_01KZJBBGXF1VRXD4KWTWX2PE3G
sequence: 46
kind: decision
status: accepted
created: 2026-08-08
---

# Let a body be a machine, and one run of it

## Context

Twelve bodies in, cuecraft's closed union splits cleanly in two. A **structure** is true all at once
and narration tours it: a world exists, a formula holds, a population has a size, a specimen is a
state of a file. A **sequence** is nothing but order and carries its own narration, because a step
and the sentence about it are one thing said twice (decision:34). The two want opposite things and
the format has kept them apart deliberately.

A state machine is both, and that is why it is worth building rather than merely possible. Its
topology is a structure that exists before anything is said — `world`'s claim exactly. Its execution
is an ordered list of occurrences with its own derived clock — `protocol`'s claim exactly. Nothing
in the format had ever been asked to hold both at once, and whether the two halves compose or
whether one of them quietly eats the other is a real question about the vocabulary rather than
about state machines.

There is also a specific, tempting failure available here, and it is what the round was built to
avoid. The short spelling is a list of transitions each with a sentence and no topology at all. It
is fewer lines, it renders, and it is a **different artifact**: an animated event log. Nothing in
it can say that the door *could* have given up, so nothing in it can say why the door not giving up
matters.

## Decision

**A body may be a machine: what could happen, and one ordered run of what did. The two are declared
separately and neither is derivable from the other.**

```yaml
machine:
  states:
    closed: Closed
    opening: Opening
    open: Open

  transitions:
    call-accepted: { from: closed, to: opening, on: call accepted }
    opened:        { from: opening, to: open,   on: open limit reached }

  scenario:
    - take: call-accepted
      say: A call releases the door from its closed state.
    - take: opened
```

- **A transition is timeless and an occurrence happens at a time.** `on:` is required and describes
  the edge forever; `say:` lives on the *occurrence*. That is not a placement convenience — it is
  the only spelling in which the same transition can occur four times and be narrated differently,
  or silently, on each of them. A `say:` on the transition could not express it, and a `say:` on
  neither would be the event log.
- **`on:` is required and `say:` is not**, which is `message:`/`say:` one role on and right for the
  same reason plus one more: two transitions may join the same ordered pair of states, and what
  fires them is the only thing that tells them apart.
- **States and transitions share one namespace**, and `take-N` is reserved against both. An
  occurrence's identity is the compiler's — the `step-N` precedent (decision:34), which is the
  `change` precedent (decision:19) — so an author writes no identity anywhere in this body.
- **Nothing is initial, final, accepting or terminal.** The run's start is the first occurrence's
  `from`; its stop is the last occurrence's `to`; both are inferred and neither is authorable. A
  machine that could declare a final state would let the film assert that where the *explanation*
  stopped is where the *system* was going, which is a claim about the world and very often false.
- **Continuity is checked, and connectedness is not.** Every occurrence must leave the state the
  last one arrived at, and the diagnostic says where the run actually was and what leaves there —
  because a run that teleports would render as a traveller crossing an edge that is not on the map.
  An *unreachable state* is allowed, unlike a world's stranded entity: a world refuses one because
  the camera would fly across empty space to reach it, and a machine's camera only visits states
  the run occupies. "This exists and this explanation never gets you there" is often the point.
- **Declared-but-untaken topology is load-bearing** and there is no trace-only shorthand. This is
  the refusal the whole round turns on, and it is refused in the sprint's non-goals rather than
  discovered late.
- **A machine may not be an entity's interior**, in either spelling — not `detail:`, not `child:`.
  What stops it is not the nesting but that the chamber would have to run a second camera inside
  the one already looking at it, and quietly half-supporting that is worse than refusing it.

**Nothing new was needed underneath.** States and occurrences publish into `bodyElements` by the
rule actors and steps already follow, so a prologue reaches a state by name and cannot reach into
the lowering. `buildTimeline` grew no second path: both bodies with occurrences produce beats
through one expression that chooses which addresses to look up.

## Consequences

- The closed union reaches thirteen, and `circuit` is the thirteenth archetype and the third with a
  camera. decision:30's pause on the vocabulary is lifted for this role for the same kind of reason
  decision:34's was: not to add a way of arranging existing content, but because a *family of
  explanation* — "here is what can happen, and here is one thing that did" — had no body at all.
- **decision:35's derived clock turned out never to have been about arrows.** Its four rules
  transferred to a machine without a constant changing, because none of them is about messages: the
  label is whatever the picture asks a viewer to read, the transit is whatever crosses the frame
  first, and the run decay is a fact about silence. `dwellFor` now takes a label and a run position,
  `dwellMs` is the protocol's name for it, and a test asserts the two agree at every run depth
  rather than merely agreeing today. That is the strongest single piece of evidence this round
  produced about which of cuecraft's policies are real.
- What did **not** generalise is as informative. The *lowering* is eleven lines in each body rather
  than one function with a strategy, because every noun differs: which list is walked, what identity
  an occurrence gets, and what text the dwell measures. A parameterised version would take four
  callbacks and be longer than both.
- **A machine can be introduced and not concluded.** An entry-level `say:` becomes a prologue,
  spoken before the run; there is no epilogue, because the occurrences append after it. Both
  examples end on a closing sentence written into the last occurrence, which works and is not the
  same thing. See dragon:27.
- dragon:8 asked whether a semantic world is a durable cuecraft body or one very good specimen, and
  named "two dependencies bought for one composition" as its first reason for doubt. dagre now has
  a second caller on strictly harder input. That does not close dragon:8 — the question was about
  *worlds* — but it removes its cheapest objection.
