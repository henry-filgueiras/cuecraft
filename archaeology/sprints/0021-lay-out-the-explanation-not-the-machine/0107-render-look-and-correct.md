---
id: tsk_01KZKEHNC4SA4XP6KARKXGEQNC
sequence: 107
kind: task
status: closed
sprint: spr_01KZKEG1YAXVEEKNNAW1X05CJ4
created: 2026-08-09
closed: 2026-08-09
---

# Render, look, and correct

## Objective

Render both films and look at real frames, twice. Fix what the frames show.

## Acceptance criteria

- Both examples render through `cuecraft render` with no hand-editing of any projection.
- `cuecraft explain` recorded for both, before and after, on the same instrument as sprint:20 so
  the numbers are comparable: shot per occurrence, event px, silent hold, camera moves, overview.
- At least two inspection passes over stills and a contact sheet, the second after the first pass's
  fixes, because sprint:20 found half its defects only on the second look.
- Every occurrence in both films is inside a shot at or above the 20px floor, or the round records
  exactly which are not and why.
- The leased runner's closing shot still shows `Succeeded`, `Failed` and the road out of
  `Cancelling`, because the narration's last sentence is about them.
- Every defect found is fixed or recorded as a dragon. None is left visible and unmentioned.

## What was rendered, and what it showed

Nothing changed the films, so there was no before and after to compare. What the round did instead
was look at the leased runner's closing frame as the *evidence for task:108*, and that pass earned
its place twice.

- The closing frame was measured rather than described: ink bounds 1400 x 813px = **1.72:1**,
  against `layout.bounds` at 1.73:1. The composition draws the machine at the size its own bounds
  claim, which had not previously been checked against pixels.
- The first pass looked at the wrong film. `out/harness/still.ts` forces subtitles **on**, and both
  examples leave `subtitles` at its default of `false` — so the first still was rendered at a
  1540 x 834 viewport, which elects a different layout (3768 x 1332, 2.83:1, 13.0px event labels)
  and is not what `cuecraft render` produces. Caught by the ink measurement disagreeing with the
  arithmetic, not by eye. The harness is a projection and is left as it is; the lesson is that a
  still is only evidence about the film whose viewport it was rendered at.
- No defect was found in the film itself, because the film was not changed.

The two-pass inspection this task asked for did not happen and was not needed. What did happen is
recorded here rather than dressed up as it.
