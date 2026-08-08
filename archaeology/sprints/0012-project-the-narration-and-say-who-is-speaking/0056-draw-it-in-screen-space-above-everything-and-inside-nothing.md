---
id: tsk_01KZHJ5J43ARRHJDN0REQDZW66
sequence: 56
kind: task
status: closed
sprint: spr_01KZHJ3XFBSNP18B8VHNSZRCTC
created: 2026-08-08
closed: 2026-08-08
---

# Draw it in screen space, above everything and inside nothing

## Objective

Draw the track. One screen-space overlay, outside every camera and inside no composition, that reads
as part of cuecraft's design language rather than as a caption track pasted over a video.

## Acceptance criteria

- Rendered in the composition root, not inside a scene and not inside `Frame`, so that no camera
  transform, world scale, portal, or scene fade can reach it. Camera movement must not move it —
  demonstrated on a still from `atlas` and one from `transcript`.
- Typography is the deck's: existing face, existing colours, existing spacing rhythm, and
  `fitQuote`'s losslessness rule (decision:28). No word of an utterance is ever dropped, at any
  size, in any state.
- The block's position and its width are fixed for the whole deck. Neither may move because a
  sentence got longer or a speaker changed; a size is chosen once across every cue the deck will
  show, not per cue.
- Bounded measure, comfortable padding, sensible wrapping, enough contrast to survive a specimen, a
  world plate and a lit anchor behind it. No box unless the frames prove typography alone cannot
  carry it — and if a box appears, it is the least one that works.
- Narrator identity, when shown, is **name and colour together**: legible in grayscale, legible
  without the colour, and the label occupies its row for the whole deck so nothing shifts when a
  speaker changes.
- No animation beyond, at most, the deck's existing opacity primitive. Nothing that draws attention
  to the change itself.
- Placement is chosen against real frames from more than one archetype, and whatever it does not
  solve is written down.
