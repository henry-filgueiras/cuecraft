---
id: tsk_01KZJ19X064HKEVPHP35W6RWP0
sequence: 80
kind: task
status: pending
sprint: spr_01KZJ18K655EV1A9690KY555BE
created: 2026-08-08
---

# Judge the specimen, and supersede the chrome claim

## Objective

Render `examples/retry.yaml`, judge it at the five frames that matter, and record the verdict —
including a decision that supersedes decision:43's claim that a recall has no chrome, rather than
editing that claim out of the history.

## Acceptance criteria

- The five frames inspected at full size: immediately before the recall, the first recall frame, a
  middle recall frame, the first returned frame, and the silent pause after the return.
- Judged against what the round was for: does it read as quoted evidence without remembering slide 1;
  is the present slide still recognizable; is the quoted content and its subtitle comfortably
  legible; are the two progress positions distinguishable; is the label restrained; is the return
  clean; is any subtitle duplicated or left hanging.
- Audio and total duration confirmed unchanged against the sprint:15 cut.
- A decision recording the treatment and explicitly superseding decision:43's "no flashback chrome",
  with what the rendered frames showed as the reason.
- If the static card is judged ambiguous, the frame that shows it is recorded before anything is
  added.
- `npm run check` and `scarp doctor` pass; sprint:16 closed against its success criteria.
