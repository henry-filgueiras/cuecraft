---
id: tsk_01KZJ19WZEG9XJY28HXW76JSHB
sequence: 75
kind: task
status: closed
sprint: spr_01KZJ18K655EV1A9690KY555BE
created: 2026-08-08
closed: 2026-08-08
---

# Render the candidate insets before choosing one

## Objective

Render two or three candidate inset scales against `examples/retry.yaml` and *look at them* before
committing a number, along with the scrim that puts the present slide behind the quotation.

The question the frames have to answer is not "which is prettiest" but "at which scale does a viewer
who does not remember slide 1 read this as evidence rather than as the next slide".

## Acceptance criteria

- At least three candidates rendered at 1920x1080 at the same recall frame, varying inset scale, with
  the scrim held constant, and at least one varying the scrim.
- The exposed outer margin is checked for the thing it exists for: both progress positions legible at
  once, the present one outside and the historical one inside.
- Whether the label's mark glyph actually renders in the deck's font stack is checked in a frame
  rather than assumed (dragon:4).
- The chosen constants are recorded with the reason, including what the rejected ones did wrong.
