---
id: tsk_01KZEFMY3EYWTMB7HM6HSQQQ6F
sequence: 26
kind: task
status: closed
sprint: spr_01KZEFJJVPNCDAJ6MJHYZCN95M
created: 2026-08-07
closed: 2026-08-07
---

# Record the decision, the limits, and the dragons

## Objective

Write down what the implementation taught us, including where it disagreed with the plan.

decision:25 said an interior may not be a world. This round makes an exception to that, and an
exception recorded only in code is a contradiction. The decision that comes out of this has to say
what changed, what did not, and why a file boundary was the thing that made the difference.

The archaeology has to keep four things apart, because conflating them is how an experiment turns
into a promise: what is demonstrated, what is deliberately deferred, what this exposed that is now
open, and whether any of it deserves to be a supported feature rather than a probe.

## Acceptance criteria

- A decision records the child-module surface, the call/return rule, the addressing scheme,
  inheritance, and the diagnostics — and states explicitly how it narrows decision:25.
- The README documents the experimental surface at the altitude the rest of it is written at.
- Dragons exposed by the round are opened; dragon:9 is updated with what a second and third
  interior actually said.
- The sprint is closed against its success criteria, with the finding from task:29 written into
  it whichever way the comparison came out.
- `scarp doctor` is clean and no artifact is left floating.
