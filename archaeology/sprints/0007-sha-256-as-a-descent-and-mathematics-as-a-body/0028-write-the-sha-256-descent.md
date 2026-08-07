---
id: tsk_01KZEM684AXCEZ98EPMY64KGX2
sequence: 28
kind: task
status: pending
sprint: spr_01KZEM4QE178Q5JP12M201A7Y5
created: 2026-08-07
---

# Write the SHA-256 descent

## Objective

Write the four files, and make the descent carry an explanation rather than a tour.

    examples/sha256/sha256.yaml       anything -> padded -> blocks -> squeezed -> sixty-four characters
    examples/sha256/compression.yaml    sixteen words, stretched, sixty-four rounds, folded back
    examples/sha256/schedule.yaml         how sixteen words become sixty-four
    examples/sha256/round.yaml            what one round actually does

The opening is provenance, not bits: git names a file by its contents, change one character and
the name changes completely. Somebody who has typed `git commit` has already met the thing this
video is about and does not know it yet.

Three formulas, all inline `detail:` bodies rather than modules, because a formula has no
narration of its own — it is what the sentence around it is pointing at. `smear` in the schedule
carries the two sigmas; `choose` and `majority` in the round carry Ch and Maj. Those two are also
the artifact's real test of the round: they are the only place where the algorithm stops being
plumbing and starts being a specific idea.

And the sentence the whole piece depends on: *one round barely hides anything; sixty-four is what
turns a shuffle into a hash.* If that does not land, the video has taught the mechanism and
missed the point.

## Acceptance criteria

- The root file references one child; the child references two, entered in sequence.
- Every claim about SHA-256 is correct: the padding rule, sixteen words to sixty-four, the eight
  working variables, the round constant, the shift, and the final addition.
- No jargon survives that the picture does not explain. No `\Sigma`, `W_t` or "message schedule"
  in spoken narration.
- Both formula portals open from a cue reaching a line inside them, and close on the next cue
  that reaches something else — decision:25's rule, unmodified.
- Iteration is addressed out loud, in both scopes where it happens.
- Renders end to end with the command recorded, and runs between 100 and 150 seconds.
