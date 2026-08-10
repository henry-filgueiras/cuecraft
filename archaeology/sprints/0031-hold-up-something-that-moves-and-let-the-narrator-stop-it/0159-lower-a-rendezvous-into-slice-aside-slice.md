---
id: tsk_01KZMFGXPZXMB42RZ2W9DGVJ8Y
sequence: 159
kind: task
status: closed
sprint: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
created: 2026-08-09
closed: 2026-08-09
---

# Lower a rendezvous into slice, aside, slice

## Objective

Lower a rendezvous into ordinary temporal leaves. This is the architectural heart of the round.

Given a film of 8.1s, a moment at 4.07s, and a sentence subscribed to it:

    slice[0.00 .. 4.07]   <the aside's own cues>   slice[4.07 .. 8.13]

Three occupants of the one serial cursor. Nothing downstream learns a new concept, and in
particular the renderer learns nothing at all: the freeze is the hold `buildTimeline` already
derives between two slices.

## Acceptance criteria

- The lowering is a function of the cue list and the film's moments, run where the measurements
  are, and it produces cues that are indistinguishable in kind from the atomic case.
- Several cues subscribed to one moment form **one** rendezvous with the narrative order the deck
  wrote, not a freeze-and-resume per cue.
- The slices' endpoints agree to the frame: the media frame a slice ends on and the one the next
  begins on are the same number, so a split produces neither a gap nor a repeat.
- The aside's duration extends the presentation and the film's own consumed duration is unchanged:
  the slices still sum to exactly the medium's length.
- The frozen interval displays the frame the film resumes from, so the medium stops on the state
  being discussed and carries on from it.
- No renderer change. If the renderer needs one, the lowering was wrong.
