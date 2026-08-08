---
id: tsk_01KZFC38TTBT9YEJ2T9ERTET4M
sequence: 38
kind: task
status: closed
sprint: spr_01KZFC13DGXRSF95PKWG894JMA
created: 2026-08-07
closed: 2026-08-07
---

# Compile a step into a beat

## Objective

Give a step a compiled record on the frame timeline — a **beat** — so that the renderer is told
when each transition happens rather than inferring it.

A beat is the merge of the two ways a step can get a frame: an anchor when it was narrated, a dwell
when it was not. Merging in `buildTimeline` keeps the one rounding rule in the one place, and hands
the composition a single list in step order.

## Acceptance criteria

- `Narration` carries dwells with measured offsets, placed on the same cursor as clips and calls.
- `Scene` carries `beats: readonly Beat[]`, one per step, in step order, each with the absolute
  frame its transition begins and how long it holds the stage.
- A beat's duration runs to the next beat, and the last one runs to the end of the narration.
- Nothing outside a protocol slide gains a beat; every existing timeline is byte-identical.
- Tested: narrated and silent steps interleaved, a prologue, and the frame arithmetic against
  `framesFor`.
