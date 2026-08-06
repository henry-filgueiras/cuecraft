---
id: tsk_01KZA7TE5TJKJ6P73KHTJW3YMF
sequence: 6
kind: task
status: closed
sprint: spr_01KZA7T98B558R2DC03NZ9AS38
created: 2026-08-05
closed: 2026-08-05
---

# Derive slide timing from measured narration

## Objective

Make the ordering constraint of dragon:1 real: synthesize each `say`, measure it, and derive
every scene's length from what the audio actually is.

## Acceptance criteria

- A compiled presentation carries the slide, its narration artifact, the measured duration, the
  pre- and post-say padding, and the derived scene length — and nothing about frames or pixels.
- Scene length is `max(minimum, pre_say + narration + post_say)`, from measured audio.
- Seconds become frames in exactly one function, and the rounding rule is documented there.
- Narration starts after `pre_say`, and the next slide cannot begin before it ends.
- No frame count is expressible in the source.
- The narration seam is injectable, so the whole pipeline is testable without loading the model.
- Generated audio lands somewhere obviously disposable and stays out of Git.
