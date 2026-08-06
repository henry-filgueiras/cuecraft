---
id: tsk_01KZA7TE5YKS8K6BMJNSGK77ST
sequence: 7
kind: task
status: closed
sprint: spr_01KZA7T98B558R2DC03NZ9AS38
created: 2026-08-05
closed: 2026-08-05
---

# Render the compiled presentation with Remotion

## Objective

Produce frames worth looking at: one opinionated built-in slide look, one restrained
transition, and an MP4 that plays anywhere.

## Acceptance criteria

- 1920x1080 at 30 fps, H.264 video and AAC audio, rendered through Remotion rather than
  hand-orchestrated ffmpeg.
- Each slide's narration is placed at the frame the timeline assigned it.
- One built-in look — strong typography, generous whitespace, high contrast — and no theming
  system. The frame reads well as a still.
- Entrance motion is restrained and finishes before narration is carrying the point.
- One transition, and it neither clips narration nor changes total duration.
- Fonts resolve without any network fetch at render time.
- Chromium arrives through Remotion's documented mechanism and is never committed.
