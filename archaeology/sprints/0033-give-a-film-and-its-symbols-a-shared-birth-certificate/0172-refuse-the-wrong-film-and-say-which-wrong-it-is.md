---
id: tsk_01KZMMTH6K70N2970TCTPCV0V2
sequence: 172
kind: task
status: closed
sprint: spr_01KZMMSQ1XA0QK02A337P2PJNM
created: 2026-08-09
closed: 2026-08-09
---

# Refuse the wrong film, and say which wrong it is

## Objective

Refuse to extract frames from a film the symbols do not describe, and say what to do instead.

## Acceptance criteria

- `snapshot` and `snapshots` verify before extracting anything, once per invocation.
- A mismatch exits non-zero having written no image, and names the fix.
- The existing `media.file` basename check becomes the *diagnostic* — it distinguishes "you pointed
  this at the wrong film" from "this film has been re-rendered since" — rather than a second gate.
- Unknown proceeds, with one line on stderr so a pipeline's stdout is unaffected.
- `inspect` is untouched and still needs no ffmpeg.
