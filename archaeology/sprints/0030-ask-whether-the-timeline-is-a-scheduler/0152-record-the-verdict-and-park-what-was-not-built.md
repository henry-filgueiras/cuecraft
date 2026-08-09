---
id: tsk_01KZMB1K2589MV1B0DGSJYGZN8
sequence: 152
kind: task
status: closed
sprint: spr_01KZMB06WDSJMNNW2MEEH53GV8
created: 2026-08-09
closed: 2026-08-09
---

# Record the verdict, and park what was not built

## Objective

Record the round's verdict as a decision, with the archaeology behind it, so a future round can act
without re-reading the codebase — and park the design that was not built, with the gate that would
unpark it.

## Acceptance criteria

- A decision artifact states the verdict, the model of presentation time the archaeology found, and
  what is refused.
- The design for a yielding medium is parked as an idea, complete enough to build from, with an
  explicit statement of what evidence would earn it.
- Every claim in both artifacts is traceable to a file and a stage rather than to the briefing.
- `scarp doctor` and `npm run check` pass, and the sprint is closed against its success criteria
  including the ones it failed to satisfy.
