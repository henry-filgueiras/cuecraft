---
id: tsk_01KZHY86VP10TW1TBA7W7X22XP
sequence: 70
kind: task
status: closed
sprint: spr_01KZHY6QMS7W4P3442GSSA9X8D
created: 2026-08-08
closed: 2026-08-08
---

# Replay the earlier picture, and cut back

## Objective

Replay the earlier picture over the recall's frames, and hard-cut back.

The recalled slide is rendered exactly as it was: same composition, same anchor states, same
retreated progress rule, same sequence-local frame — because the local frame is what every entrance
animation in `layouts.tsx` reads, and re-deriving it against a shifted origin is how the picture
would quietly stop matching the sound.

## Acceptance criteria

- The scene motion arithmetic (`appearAt`, `fadeIn`, `fadeOut`) is derived once and shared, rather
  than restated for the replay.
- The replay layer is mounted above the current slide and below the subtitles, opaque, with no
  fade, no transition and no chrome of its own.
- `Slide` receives `absoluteFrame = recall.sourceFrom + (frame - recall.from)`, and the recalled
  composition's own `useCurrentFrame()` matches what it was at that absolute frame.
- The original WAV is placed a second time, at `recall.from`, for `recall.durationInFrames`.
- The progress rule visibly retreats to the earlier slide's ordinal and returns.
- A render test over the specimen.
