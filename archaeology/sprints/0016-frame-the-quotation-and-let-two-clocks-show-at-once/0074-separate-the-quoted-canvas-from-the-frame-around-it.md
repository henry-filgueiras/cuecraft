---
id: tsk_01KZJ19WZAS9QC00QPE2W0TJMT
sequence: 74
kind: task
status: closed
sprint: spr_01KZJ18K655EV1A9690KY555BE
created: 2026-08-08
closed: 2026-08-08
---

# Separate the quoted canvas from the frame around it

## Objective

Separate the quoted canvas from the frame around it, so that "what is being replayed" and "how it is
presented" are two components rather than one — and so the byte-equivalence proof has a boundary to
be stated at.

## Acceptance criteria

- `RecalledCanvas` renders exactly what a recall renders today: the source slide at the mapped
  absolute frame, inside the sequence offset that reproduces its original local frame, plus the
  subtitle track. Full frame, no chrome, no transform.
- The current full-bleed `Replay` becomes `RecalledCanvas` mounted with no framing, so this task
  changes no pixel of any deck.
- The active recall at a frame is a pure function of `Scene.recalls`, exported from the compile
  layer and unit-tested without a browser. Nothing is added to the timeline for the renderer.
- `npm run check` passes and every existing test still passes untouched.
