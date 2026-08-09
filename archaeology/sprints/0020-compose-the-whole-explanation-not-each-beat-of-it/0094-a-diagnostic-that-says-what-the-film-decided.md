---
id: tsk_01KZJDMQMJ69BQ51QYN03SWT05
sequence: 94
kind: task
status: closed
sprint: spr_01KZJDK32M4VSS1AC8R169WAWK
created: 2026-08-08
closed: 2026-08-08
---

# A diagnostic that says what the film decided

## Objective

A developer-facing diagnostic that says what a `circuit` film decided: every occurrence's timing
phases, and every shot the planner considered, chose, and refused. Reachable from the CLI so the
evidence is reproducible rather than a script somebody wrote once.

## Acceptance criteria

- One command emits, for a presentation containing a machine, a per-occurrence table of the
  camera / traversal / arrival / narration / hold intervals in frames and milliseconds, and a
  per-occurrence camera record of candidates, selection, measurements and the reason.
- It also reports the film's totals: pre-roll, narration, post-roll, and how much of the post-roll
  is travel against how much is a settled overview.
- It reads the same compiled artifact the renderer reads, and derives nothing the renderer does not
  — a diagnostic that computes its own answer is a second implementation, not an instrument.
- Nothing about it is reachable from the presentation grammar.
