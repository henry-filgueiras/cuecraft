---
id: tsk_01KZFC38THET5RE7S17Y3BP9YN
sequence: 36
kind: task
status: closed
sprint: spr_01KZFC13DGXRSF95PKWG894JMA
created: 2026-08-07
closed: 2026-08-07
---

# The protocol body, and what a step is

## Objective

Add `protocol` to the closed body union: actors, and an ordered list of steps. Parse it, validate
it, and give it a place in the element ordering `bodyElements`/`bodyAddresses` publish, so that
everything downstream resolves against it with no new addressing scheme.

An actor is written as a label; its identity is derived from the label by the same rule an author
would have typed, and `from:`/`to:` name it. A step declares no identity — it gets a structural
one (`step-1`, `step-2`, ...) the way `change` declares `CHANGE_ELEMENT_ID` on the author's behalf,
because the compiler already knows which part of itself the narration is about.

## Acceptance criteria

- `src/presentation/protocol.ts` owns the vocabulary, the identity rule and the validation, and
  imports nothing from the parser.
- `protocol` is a `SlideBody` kind; `chooseLayout` returns a new archetype for it.
- `bodyElements` and `bodyAddresses` publish actors then steps, in one flat list, in that order.
- Refused with a message an author can act on: fewer than two actors, a step naming an undeclared
  actor, a duplicate actor identity, an empty `steps`, an unknown key, a step with neither
  `message` nor `say`.
- `from` equal to `to` is accepted and means a message an actor sends to itself.
- Tests cover every refusal and the element ordering.
