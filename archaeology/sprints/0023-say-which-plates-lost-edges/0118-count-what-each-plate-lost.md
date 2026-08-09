---
id: tsk_01KZKJZXK832R9DM466ANPAFER
sequence: 118
kind: task
status: closed
sprint: spr_01KZKJZXJ4VSA798XRH4V88KQX
created: 2026-08-09
closed: 2026-08-09
---

# Count what each plate lost

## Objective

Compute, per surviving state, how many declared outgoing and incoming transitions the slide does not
draw.

## Acceptance criteria

- One exported function, deriving from the body's full declaration against what `machineOf` returns,
  so it cannot drift from the reduction.
- Zero for every state of a whole-scope machine, on both existing examples, asserted by a test.
- Correct on the reduced sibling: `running` 3 out, `claimed` 1 out, `queued` 1 in, and nothing on the
  other three.
- Self-transitions are counted as leaving and arriving, exactly as the layout counts them, so a
  dropped self-loop would be reported in both directions rather than neither.
