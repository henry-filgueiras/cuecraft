---
id: tsk_01KZFC38TPM74675TJ949HB1JX
sequence: 37
kind: task
status: closed
sprint: spr_01KZFC13DGXRSF95PKWG894JMA
created: 2026-08-07
closed: 2026-08-07
---

# Lower a step into a cue, and derive the dwell

## Objective

Lower a protocol's steps into the one serial cue list everything downstream already consumes, and
derive how long a step with nothing to say gets.

A narrated step becomes a speech cue that activates the step's derived address — so its frame comes
from the anchor machinery decision:14 already built, at the onset decision:13 already measured. A
silent step becomes a **dwell**: a silence with a cause, in the same sense `enter` and `exit` are
silences with a cause, carrying the address of the step it belongs to and a duration derived from
what the step has to show.

The pacing policy is the experiment. It must be deterministic, derived from content, and unwritable
by an author.

## Acceptance criteria

- A `dwell` cue kind exists in `./cue.ts`, is never authorable, and behaves on the narration track
  exactly as a pause does.
- A protocol slide's narration is the entry's `say:` (optional, and a prologue when present)
  followed by the cues its steps lower to. The entry-level `say:` may still reach actors.
- The dwell for a silent step is a stated function of its message text and its position in a run of
  silent steps, with a floor and a ceiling, both reasoned.
- `npm run check` passes; the lowering is unit-tested against cue order, scope, and duration.
