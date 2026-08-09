---
id: tsk_01KZMDCPTQ0X5B5NCFCQ0YH40P
sequence: 157
kind: task
status: pending
sprint: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
created: 2026-08-09
---

# Render the atomic deck, and watch all of it

## Objective

The atomic deck, rendered and actually watched.

## Acceptance criteria

- `examples/kmeans/kmeans.yaml` introduces the algorithm, plays the computed animation whole, and
  continues narrating after it.
- `npm run check` passes; every existing example still parses and the shipped decks are unaffected.
- The MP4 is rendered and inspected at **its own scene boundaries and cue frames**, taken from the
  compiled timeline rather than by uniform sampling: opening, first frames of the medium, last
  frames of the medium, the cut back to narration, and the final slide to its last frame.
- Any perceptual defect found is recorded as a dragon rather than tuned around.
