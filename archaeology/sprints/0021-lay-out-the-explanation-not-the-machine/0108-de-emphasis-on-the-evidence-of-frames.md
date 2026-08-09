---
id: tsk_01KZKEHNCA66Q7S72JB9AH1RJG
sequence: 108
kind: task
status: closed
sprint: spr_01KZKEG1YAXVEEKNNAW1X05CJ4
created: 2026-08-09
closed: 2026-08-09
---

# De-emphasis, on the evidence of frames

## Objective

Decide, on rendered frames, whether untaken material should be drawn with less emphasis — and
refuse it if the frames do not support it.

## Acceptance criteria

- Candidate treatments are rendered and looked at, not reasoned about. At minimum: unchanged, and
  one reduced-contrast treatment.
- Nothing changes size, position or wrapping. Weight, colour and contrast only.
- In the closing shot of `examples/leases.yaml`, the three untaken things the narration names are
  still legible as text a viewer would read if asked to.
- Adopted or refused on the evidence, and recorded either way. A refusal here is a result, and the
  treatment is removed rather than kept as an unexercised option.

## Refused, because it was already there

No treatment was built. The frame said one was not needed, and then said the composition's existing
claim about itself is true.

Measured off the closing frame of `examples/leases.yaml` (`out/harness/contrast.ts`), peak text
luminance per state plate, out of 255:

    visited          queued 192   claimed 209   running 212   retry 199   cancelling 200
    never occupied   orphaned 168   succeeded 157   failed 151

    visited 202   never occupied 158   difference 44 of 255, or 21.8%

`StatePlate`'s docstring claims `possible` is "a real contrast, not a hint". Under measurement it
is: a fifth of peak luminance. An eye reading the frame at a glance calls the two groups identical,
and the eye is wrong — which is exactly why this task said to render rather than reason.

On the edges the separation is larger still and is carried by decision:49's wake: an untaken caption
sits at 0.5 alpha against up to 0.84 for a taken one, and in the closing frame "the reaper reclaims
it" and "result committed" are plainly recessive against "handler begins x3".

So de-emphasis of never-taken material exists, on both plates and edges, and it is proportionate.
Raising it further would have been tuning a constant against no evidence, which is the failure mode
sprint:21 refused in its last non-goal. Nothing was added and nothing was left in the tree.

One thing this pass did establish, and it is worth keeping: **the existing treatment is
retrospective.** The wake dims what has not been taken *yet*, and reaches its full separation only
at the end. Marking never-taken material from frame one is available to a compiler with the whole
scenario, and would spoil the film — `examples/leases.yaml` closes on "succeeded and failed are
still sitting there", which is a reveal that a grey plate in the opening shot would have given away
an hour earlier. Foreknowledge is not always worth spending.
