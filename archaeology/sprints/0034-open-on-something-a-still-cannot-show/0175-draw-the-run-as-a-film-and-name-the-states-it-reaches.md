---
id: tsk_01KZMPQ0PB8MPQ2XS90RN4VA6A
sequence: 175
kind: task
status: closed
sprint: spr_01KZMPN6YTF45B7CDBMHDJNBWT
created: 2026-08-09
closed: 2026-08-09
---

# Draw the run as a film, and name the states it reaches

## Objective

Turn the recorded run into a film cuecraft can play, and name the states it reaches.

The picture has one job that nothing else in this repository has had: to make a backwards-moving
thing visible while everything in it moves forwards. A ring alone will not do that — the wave is
obvious in a time-space diagram and nearly invisible in a top-down loop watched for four seconds.
Both, side by side, on the same clock.

## Acceptance criteria

- `examples/phantom/ring.R` draws every frame with cairo, encodes with ffmpeg at
  `CUECRAFT_FPS`, declares one `video` output, and removes its frames afterwards — the whole
  contract `examples/kmeans/kmeans.R` already follows.
- Box and palette come from the environment and nothing else. Membership, state and emphasis are
  carried by shape, weight and the one accent, never by a colour the program chose
  (decision:42 across the process boundary).
- The film declares `#cuecraft moment` lines for the four named states, computed from the frames
  actually written and floored to the frame the program means — the `seconds_of` rule
  `examples/kmeans/kmeans.R` documents, and dragon:38's reason for it.
- Watched with the sound off and no narration, a stranger can see that the cars go one way and the
  stop goes the other. That is the acceptance test; if it needs a caption, the drawing is wrong.
- Nothing in the program knows where in a presentation the film will be placed, and there is no
  absolute timecode in it.
