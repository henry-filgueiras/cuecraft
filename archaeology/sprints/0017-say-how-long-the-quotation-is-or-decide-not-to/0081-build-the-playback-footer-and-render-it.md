---
id: tsk_01KZJ2SE0DSYNEYY964XS6CW8X
sequence: 81
kind: task
status: closed
sprint: spr_01KZJ2SDZQC3NBVB2MPDSG90AS
created: 2026-08-08
closed: 2026-08-08
---

# Build the playback footer and render it

## Objective

Build the footer and render it, so the three-bar question is answered by a frame rather than by
argument.

## Acceptance criteria

- Label, rail and elapsed / total time in one row beneath the card, in the room the inset gave up,
  above the present slide's progress rule and clear of it.
- Time in the idiom cuecraft already uses on screen for a derived number: monospace, seconds
  (`figures.tsx`), not the CLI's timecode.
- The rail advances monotonically from the compiled interval, and is drawn thinner than a progress
  rule so weight distinguishes the three meanings.
- Nothing added to `RecalledCanvas`; the byte-equality render test still passes untouched.
- Rendered at 1920x1080 against `examples/retry.yaml` and looked at, with and without.
