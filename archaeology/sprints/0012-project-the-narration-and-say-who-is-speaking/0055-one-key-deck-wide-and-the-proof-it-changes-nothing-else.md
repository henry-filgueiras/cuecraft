---
id: tsk_01KZHJ5J3ZBBQDJXHN76Q137SV
sequence: 55
kind: task
status: closed
sprint: spr_01KZHJ3XFBSNP18B8VHNSZRCTC
created: 2026-08-08
closed: 2026-08-08
---

# One key, deck-wide, and the proof it changes nothing else

## Objective

One key, deck-wide, opt-in, in a location the format already has; and the proof that turning it on
changes nothing except that a track exists.

## Acceptance criteria

- `defaults.subtitles: true`, boolean, optional, defaulting to off. Strict validation rejects
  anything else with a message an author can act on, and the allowed-key list is read off the schema
  as every other one is.
- Nothing per-slide, per-cue, or per-narrator. No size, colour, position or styling key exists
  anywhere in the format after this task.
- The flag reaches the renderer through the compilation, not around it: it travels the same path the
  title does, and no render option is invented for it.
- **The invariant test.** The same source compiled with and without subtitles produces identical
  synthesis requests (text, output, voice, speed, and their order), identical clips, offsets,
  measured durations and scene lengths, and identical timelines in every field except the subtitle
  track: scene starts, durations, `narrationFrom`, `narrationDurationInFrames`, anchors, spans,
  beats, calls, total frames and `facts`.
- Every existing example still parses and compiles unchanged; the examples test proves it.
