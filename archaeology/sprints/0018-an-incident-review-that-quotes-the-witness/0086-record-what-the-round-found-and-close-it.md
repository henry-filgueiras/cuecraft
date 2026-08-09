---
id: tsk_01KZJ4F0ZY2MJX3CB792F4BFN8
sequence: 86
kind: task
status: closed
sprint: spr_01KZJ4E57ZVCGV27EXP5PT6CJE
created: 2026-08-08
closed: 2026-08-08
---

# Record what the round found, and close it

## Objective

Record what the round found — including anything the deck exposed that `examples/retry.yaml` could
not — and close the sprint against its success criteria.

## Acceptance criteria

- Artifact-level friction recorded as a dragon or written into the sprint outcome, with the frame
  or the number that shows it. Nothing under test is modified to make it go away.
- The rendered duration, the composition each slide was given, and every post-watch wording change
  written into the sprint outcome.
- `npm run check` and `scarp doctor` pass; the working tree is clean; every task closed.
