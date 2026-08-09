---
id: tsk_01KZHY86W0WJCP6QSWJ3RW13VY
sequence: 72
kind: task
status: closed
sprint: spr_01KZHY6QMS7W4P3442GSSA9X8D
created: 2026-08-08
closed: 2026-08-08
---

# Print what was recalled, and from where

## Objective

Make a recall inspectable from the command line, the way a descent already is.

## Acceptance criteria

- `cuecraft render` prints, for each recall: the slide that recalls, the id, the slide recalled, the
  timecode it happens at, its length, and the source timecode it replays from.
- Silent on every deck that never recalls.
- A test on the formatting function.
