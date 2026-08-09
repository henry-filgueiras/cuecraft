---
id: tsk_01KZMDCPT9S3NKSQ7NA6CBANMD
sequence: 155
kind: task
status: pending
sprint: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
created: 2026-08-09
---

# Draw the footage over the interval it was given

## Objective

Draw the footage over the interval the timeline allocated it, and nowhere else.

The mapping is one expression, and it is `RecalledCanvas`'s with a slope on it:

    mediaFrame = sourceFrom + (absoluteFrame - from) * rate

## Acceptance criteria

- The `exhibit` archetype gains a footage branch beside `drawing`: the medium in the room it was
  drawn for, contained, whole, under the heading — the same composition the picture branch gets.
- Playback is `<OffthreadVideo>` under a frame mapping derived from the compiled record. The
  renderer computes no durations and reads no clock of its own.
- No frame outside the allocated interval draws the medium, and no frame inside it draws anything
  else in its place.
- A pure unit test covers the mapping without a browser.
