---
id: tsk_01KZHY86V33F096F758HBMHHQN
sequence: 67
kind: task
status: closed
sprint: spr_01KZHY6QMS7W4P3442GSSA9X8D
created: 2026-08-08
closed: 2026-08-08
---

# Give the narration one more word, and refuse everything it is not

## Objective

Add `recall:` to the cue vocabulary as its own kind, and make the parser refuse everything it is
not — before any of it can reach a timeline.

The cue carries the id the author wrote and, once resolved, the slide the anchor was found on. It
carries **no duration**, because the duration is a measurement taken elsewhere and a field for it
here would be a field somebody could fill in wrongly.

## Acceptance criteria

- `NarrationCue` gains a `recall` kind: `{ kind, scope, target, sourceOrdinal? }`, documented beside
  the other four with why it is not an `enter`.
- `recall:` with any other key is rejected, naming the keys.
- `recall:` whose value is not an `ANCHOR_ID` is rejected with the identity hint.
- `CUE_HINT` names it, so an unknown cue's error lists it.
- A `say` of nothing but a `recall` is valid; a `say` of nothing but pauses is still not.
- A `recall` written inside a child module's `say` is rejected where module narration is bound,
  with a message saying a recall belongs to a slide's own narration.
- Tests in `parse.test.ts` for each of the above.
