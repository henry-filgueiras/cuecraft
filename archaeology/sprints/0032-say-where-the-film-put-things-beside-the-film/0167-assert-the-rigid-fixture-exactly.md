---
id: tsk_01KZMJB3P4CRVB339Z8152YGMR
sequence: 167
kind: task
status: closed
sprint: spr_01KZMJ9XPH1NF6T6JRPXBD0HBF
created: 2026-08-09
closed: 2026-08-09
---

# Assert the rigid fixture, exactly

## Objective

Make the motivating regression impossible to reintroduce silently, with a fixture whose frame
arithmetic can be worked out by hand.

## Acceptance criteria

- A rigid fixture with a deliberately very short final slide, whose every duration is stated rather
  than measured, asserted in the ordinary suite with no TTS and no browser.
- Exact assertions on: one slide symbol per slide, order, contiguity, non-overlap, no omission, the
  short final slide's presence, every representative frame inside its slide's inspectable interval,
  the final slide's representative frame before EOF, frames matching the timeline exactly, seconds
  matching frames over fps, byte-identical output across repeated projection, and stable keys across
  a re-compilation that changes durations.
- Assertions for every additional exported kind.
- A rendered end-to-end test extracts one frame per slide by key and asserts the count equals the
  slide count, the short final slide is among them, and the extracted frames differ from one
  another.
