---
id: tsk_01KZMB1K1YFGXYE5GQF4HH4NC6
sequence: 151
kind: task
status: closed
sprint: spr_01KZMB06WDSJMNNW2MEEH53GV8
created: 2026-08-09
closed: 2026-08-09
---

# Answer the lowering question, and price the renderer

## Objective

Answer whether yield semantics can be lowered into ordinary sequential segments before absolute
frames are assigned, concretely enough to build from: earliest stage, latest safe stage, what is
known when, and what the renderer would actually have to do to freeze a medium and resume it.

## Acceptance criteria

- The earliest and latest lowering stages are named as real functions in real files, with the
  ordering argument for each.
- It is established whether narration durations, media duration and media semantic timestamps are
  all available at the chosen point, and what has to move if they are not.
- The renderer cost is measured against what Remotion already provides rather than estimated.
- Camera and choreography planning are checked against the lowered form: whether a plan built from
  anchors and calls at absolute frames survives having a segment inserted between two cues.
- The invariants the lowering would violate are listed, including any that are non-negotiable.
