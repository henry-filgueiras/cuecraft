---
id: tsk_01KZFC38VNKE0PXQJJXA32Z00W
sequence: 45
kind: task
status: closed
sprint: spr_01KZFC13DGXRSF95PKWG894JMA
created: 2026-08-07
closed: 2026-08-07
---

# The experiential report

## Objective

The experiential report. What fought the architecture, what fell out of it for free, and what the
finished artifacts say about the thesis.

Answered concretely, from what happened, with the measurements attached: which pieces mapped onto
existing abstractions; what needed sequence-specific machinery; whether narration-to-visual
synchronisation lowered into the cue and anchor model or fought it; which automatic layout policies
sufficed; which visual defects needed special cases; whether the camera turned out to be a reusable
abstraction; whether optional narration exposed a general concept; what is reusable for state
machines and pipelines; what must not be generalised yet; where declarative simplicity cost
disproportionate implementation complexity; where an author-facing knob was tempting and what
avoided it; and whether the thesis looks stronger, weaker, or merely different.

Failure counts. If it took seventeen special cases, the report says seventeen.

## Acceptance criteria

- Decisions recorded for the choices that will constrain later work, dragons for what is open, and
  ideas for what was deliberately parked — including whatever the sequential model learned about
  parallelism.
- The sprint closed against its own success criteria, with an honest account of any it missed.
- `scarp doctor` clean.
