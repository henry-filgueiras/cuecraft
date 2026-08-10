---
id: tsk_01KZMPQ0QCR2R273PWGF76RX2D
sequence: 179
kind: task
status: closed
sprint: spr_01KZMPN6YTF45B7CDBMHDJNBWT
created: 2026-08-09
closed: 2026-08-09
---

# Put it in slot one, and correct the order behind it

## Objective

Give the deck the slot it was written for, and leave the README's argument in the order it claims
to be in.

## Acceptance criteria

- Showpiece 1 is the new deck, written in the register the other seven use: what the source says,
  what cuecraft worked out, and the one moment that is the reason to keep watching.
- `tap.yaml` keeps its entire section, one slot lower, with its siblings (`deploy`, `coldstart`)
  intact. Every subsequent slot number and every cross-reference is corrected.
- The stale "Seven videos" count is fixed, and `examples/kmeans/` gains at least a mention so the
  mechanism's own test artifact is findable.
- `runme/upload-phantom.md` exists, follows `runme/upload-pivot.md`'s shape, and includes the
  what-to-check-before-attaching list for the two computed slides.
- `out/upload/phantom.mp4` is under 10 MB via `npm run compress:upload`, and its size, duration and
  crf are recorded in the runme table.
- `npm run check` and `scarp doctor` pass. No generated artifact is committed.
