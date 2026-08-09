---
id: tsk_01KZJ19X021TW06CTY0MP9461B
sequence: 79
kind: task
status: closed
sprint: spr_01KZJ18K655EV1A9690KY555BE
created: 2026-08-08
closed: 2026-08-08
---

# Record what an anchor actually recalls

## Objective

Record what a recall's window actually is, why the obvious widening of it is unsafe, and correct any
documentation that implies otherwise. Do not design the fix.

## Acceptance criteria

- A dragon recording that `recall:` quotes exactly one measured speech clip — its whole duration,
  leading and trailing silence included — and that an adjacent authored `pause:` and the speech
  around it are outside the window.
- The motivating case is written out: an anchored sentence, a pause, and a second sentence that an
  author would reasonably read as one piece of evidence.
- Why "from the activation to the next activation, or to the end of the narration" is unsafe:
  `activates` is a point and not an interval boundary; the following cue may be unrelated; the next
  activation may be arbitrarily far away or absent; and adding an unrelated activation later would
  silently shorten an existing recall.
- The shape of the likely creature — an explicitly named half-open narration segment that may contain
  speech and pauses — is noted as a direction, with no syntax chosen.
- README and any module comment that could be read as "an anchor recalls the passage it introduces"
  says one utterance instead.
