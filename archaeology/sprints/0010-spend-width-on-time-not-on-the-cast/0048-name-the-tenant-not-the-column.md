---
id: tsk_01KZFHACWKYVHWKCPYB7601FS3
sequence: 48
kind: task
status: closed
sprint: spr_01KZFH96N7BQC1P54W511N83AX
created: 2026-08-07
closed: 2026-08-07
---

# Name the tenant, not the column

## Objective

Make everything that names a column name the *current tenant*, and make an arrival read as an
arrival.

## Acceptance criteria

- The rail names, per visible slot, the actor holding it at the current step — never a name that
  is no longer in that column.
- A handover plate is established rather than merely present: it arrives with the step that brings
  its actor into the story, and it is legible as a new party rather than as a caption.
- Lifelines are drawn per tenancy rather than per column, terminators included.
- Activation bars, arrow hue and message labels all still resolve through the lane they belong to
  with no new state.
- The CLI's render summary reports the allocation per protocol slide — actors, slots, peak, reuses
  — because a derived decision an author cannot see is a decision they cannot argue with.
