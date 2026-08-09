---
id: tsk_01KZJ19WZXA7H05NN107ZYCT31
sequence: 78
kind: task
status: closed
sprint: spr_01KZJ18K655EV1A9690KY555BE
created: 2026-08-08
closed: 2026-08-08
---

# Move the proof rather than lose it

## Objective

Keep sprint:15's exact proof by moving where it is asserted, and add evidence for what the chrome
newly claims.

The old assertion — final composition frame during a replay equals final composition frame during the
original — must now be *false*, because the composition genuinely differs. Replacing it with a
snapshot or a tolerance would throw away the only exact thing the round had.

## Acceptance criteria

- A diagnostic surface renders `RecalledCanvas` unframed, using the same component the card uses, so
  the assertion is about the real path rather than a parallel implementation.
- The proof survives verbatim in strength: the unframed recalled canvas at a replay frame is
  **byte-identical** to the composition at the corresponding source frame, at more than one offset.
- New evidence that the final rendered recall is deliberately framed: the framed frame differs from
  the unframed canvas, and the accent outline is present where the card's edge is.
- New evidence that the recalled subtitle is not drawn twice: the deck band region outside the card
  carries no subtitle during a replay, checked against pixels rather than asserted.
- The render test says in its own words why the old equality no longer holds.
