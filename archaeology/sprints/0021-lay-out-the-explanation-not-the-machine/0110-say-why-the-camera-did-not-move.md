---
id: tsk_01KZKFD4YF0XG3Q8ZC0NN1JQC9
sequence: 110
kind: task
status: closed
sprint: spr_01KZKEG1YAXVEEKNNAW1X05CJ4
created: 2026-08-09
closed: 2026-08-09
---

# Say why the camera did not move

## Objective

Make `cuecraft explain` say why the camera held, when the reason was that it *could not* move.

task:103 found the planner reporting `no move worth 9px` for occurrences whose move window was 14
and 11 frames against `MACHINE.minTravel` = 16. Those moves were never priced; they were infeasible.
A diagnostic that reports a judgement the planner did not make is worse than one that says nothing,
because it sends the next round to tune `movePrice`.

## Acceptance criteria

- A hold caused by an unaffordable window says so, and reports the capacity it had against the
  minimum it needed.
- A hold caused by the move not being worth its price keeps saying that, unchanged.
- The two are distinguishable in `cuecraft explain` output for `examples/leases.yaml`, where both
  occur.
- No change to any shot, any view, or any plan. Diagnostics only, and a test says the plan is
  unchanged.
