---
id: tsk_01KZHRVYY1FKK9TZ0Z3SX25Q59
sequence: 65
kind: task
status: closed
sprint: spr_01KZHRVYW57XJRGBFQYN90SGCS
created: 2026-08-08
closed: 2026-08-08
---

# Frame the world above the band

## Objective

Stop the atlas printing world nodes on the sentence, without teaching the camera anything about
time.

## Acceptance criteria

- The atlas frames its world into `1920 x (1080 - band)` and translates the shot up by the band, so
  the strip the narration owns is not part of the picture the camera composes into.
- `band` is zero without subtitles, so `tap`, `order`, `cathedral` and `observatory` render
  byte-identical.
- No `CameraKey`, shot count, travel duration or beat moves. The camera is given a smaller viewport,
  not a different schedule.
- `transcript` gets the same treatment if it costs the same; if its lane arithmetic assumes the full
  frame, that is recorded rather than forced.
- dragon:21 is closed or re-scoped with the frame that decided it.
