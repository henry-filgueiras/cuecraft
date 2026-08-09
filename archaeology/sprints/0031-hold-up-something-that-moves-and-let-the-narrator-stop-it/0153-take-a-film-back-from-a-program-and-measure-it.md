---
id: tsk_01KZMDCPSR39J437Z446YZ8FR1
sequence: 153
kind: task
status: pending
sprint: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
created: 2026-08-09
---

# Take a film back from a program, and measure it

## Objective

Add a fourth output type to decision:56's protocol — `video` — and read back what cuecraft has to
know about it: how long it runs, how large it is, and whether it carries sound.

Measured by cuecraft, at materialization, from the file itself. Not declared by the program on the
protocol line, for `pngSize`'s reason: a program that *said* eight seconds and wrote seven would
put a slide's worth of nothing on the end of the film, and the file settles it.

## Acceptance criteria

- `src/compute/mp4.ts` reads an ISO base media file's `moov` header — timescale, duration, track
  dimensions, and whether any track's handler is `soun` — without a decoder, without ffprobe, and
  without reading the payload. Walks boxes by their sizes, exactly as `pngSize` reads IHDR.
- A file that is not an MP4, has no `moov`, has no video track, or reports a zero duration is
  refused with a message naming the file and the fix.
- `R_OUTPUT_TYPES` gains `video`; the `ROutput` union gains an arm carrying `durationSeconds`,
  `width`, `height` and `hasAudio`.
- Unit tests cover a real fixture encoded during the test run (skipped when ffmpeg is absent) and
  hand-built byte sequences for each refusal.
