---
id: tsk_01KZHY86VAGHNKAM9QZ3MMFK41
sequence: 68
kind: task
status: closed
sprint: spr_01KZHY6QMS7W4P3442GSSA9X8D
created: 2026-08-08
closed: 2026-08-08
---

# Resolve a recall backwards, and only ever to one thing

## Objective

Resolve `recall: <id>` to exactly one earlier slide's root-scoped `activates` cue, and turn every
other outcome into an error an author can act on.

Deck-wide, so it cannot live in the per-slide schema alone. Its own module, because "which anchors
are recallable" is a question about a presentation and not about a slide.

## Acceptance criteria

- `src/presentation/recall.ts` owns the rule, over a normalized surface read off each slide's
  authored `say`, and is used by both the validation walk and the build walk so there is one rule.
- Exactly one earlier root `activates` with that id resolves, and the cue carries the source slide's
  ordinal.
- Errors, each naming the slide and cue and each distinct:
  - nothing declares it — lists what *is* recallable
  - two or more earlier slides declare it — names the candidate slides
  - only this slide declares it — says a recall reaches back
  - only a later slide declares it — names the slide and says recall only reaches backwards
  - a `fills` of that id — says a population accumulates across a sentence rather than being
    reached at a moment
- An `activates` id declared twice in a deck that never recalls it is still legal.
- Tests for every branch, plus a deck with two same-named anchors and no recall.
