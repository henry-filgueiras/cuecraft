---
id: tsk_01KZC8RZ8BSMF4VYW0NY9RFBNQ
sequence: 19
kind: task
status: closed
sprint: spr_01KZC8JTE9C5CST3JCV1DNSQ3J
created: 2026-08-06
closed: 2026-08-06
---

# Write, render and revise the self-demo

## Objective

Write `examples/cuecraft.yaml`, render it, watch it, and revise it.

This is the deliverable, and the part of the round where judgement replaces specification. The
storyboard is a hypothesis about what will be watchable; only the render can settle it.

Two rules for the iteration:

1. **Rewrite prose before adding machinery.** If a cue sounds clipped, rephrase it. If a scene
   feels crowded, cut a word. Every capability added to make one scene work is a capability the
   next deck inherits whether it wants it or not.
2. **Look at it.** Stills and playback decide composition questions; unit tests cannot. Pull
   frames at the moments that matter — each anchor activation, each scene's settled state.

The example is also product documentation. A stranger should be able to read it top to bottom
and understand what the video will be, without knowing anything about the renderer.

## Acceptance criteria

- `examples/cuecraft.yaml` reads as a genuine presentation, not as a test fixture. No comment in
  it explains an implementation detail in order to look impressive.
- `out/cuecraft.mp4` renders and plays: roughly 60–90s, 1920x1080, 30fps, h264/aac.
- The render is watched end to end, with sound, before it is called done.
- Every anchor activation was checked against a still or playback at the frame it fires.
- No scene is accidentally empty, crowded, or indistinguishable from its neighbour.
- Narration sounds intentional: phrasing deliberate, pauses placed, no mispronunciation left
  standing that `pronounce` could repair.
- Revisions made in response to watching it are recorded, including anything the storyboard got
  wrong.
- Generated audio, frames and video stay out of Git.
