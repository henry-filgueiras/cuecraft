---
id: tsk_01KZHY86VGBABNFH2YE65XXQ7H
sequence: 69
kind: task
status: closed
sprint: spr_01KZHY6QMS7W4P3442GSSA9X8D
created: 2026-08-08
closed: 2026-08-08
---

# Place a clip that was already measured, and synthesize nothing

## Objective

Put a recall on the narration track: no synthesis call, the source clip's measured duration, the
source clip's `src`, and a frame mapping the renderer cannot argue with.

## Acceptance criteria

- `compile.ts` gains `NarrationRecall` beside `NarrationCall` and `NarrationDwell`, placed on the
  same `offsetSeconds` cursor, and calls `synthesize` zero times for it.
- The duration is the source clip's complete `durationSeconds` — not its duration less its onset.
- `timeline.ts` gains `Recall` on `Scene`, walked on the same cursor as clips, calls and dwells, so
  a recall cannot drift against the speech in front of it.
- `Recall` carries `from`, `durationInFrames`, `sourceFrom` (the source clip's absolute frame, i.e.
  `Clip.from` and never `Anchor.frame`), `src`, and the id.
- `durationInFrames` equals the source clip's `durationInFrames` exactly, so the mapping stays
  inside the clip it replays.
- `narrationDurationInFrames`, the scene length and `totalFrames` all include it.
- Tests: zero synthesis calls; speech → recall → pause → speech ordering on the track; exact
  source-frame arithmetic at first, middle and last frame; total-frame accounting; a no-recall deck
  compiling to a field-identical timeline.
