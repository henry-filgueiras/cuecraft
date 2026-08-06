---
id: tsk_01KZC5821N5TCKFKCM81WY31AQ
sequence: 14
kind: task
status: closed
sprint: spr_01KZC58217DD56XN7FZ221N7EF
created: 2026-08-06
closed: 2026-08-06
---

# Link narration cues to slide elements semantically

## Objective

Let an author state that a moment in narration and an element on a slide are the same idea, and
let cuecraft work out when that happens.

## Acceptance criteria

- Slide elements can carry semantic identities; narration cues can reach them.
- No timestamps, frame numbers, durations or animation names appear in the source.
- Activation time derives from measured audio, including the clip's leading silence.
- Emphasis accumulates, so the slide builds rather than flashes.
- The compiled form keeps both ends of the link addressable rather than becoming a one-way
  animation command.
- Unknown references, duplicate identities and malformed names fail loudly, naming slide and cue.
- Slides without anchors are unchanged; narration is never clipped; scenes never advance early.
