---
id: tsk_01KZFHACWFBNAQJX1ZKPJ2CAXK
sequence: 47
kind: task
status: closed
sprint: spr_01KZFH96N7BQC1P54W511N83AX
created: 2026-08-07
closed: 2026-08-07
---

# Lay tenancy out, and make a handover visible

## Objective

Give the transcript layout a notion of *tenancy*: a slot is a column, and an actor holds it for a
stretch of the film. Draw the handover so it cannot be read as continuity.

## Acceptance criteria

- Lanes are placed at `slot * lanePitch`. The pitch is still uniform and still set by the widest
  name in the whole cast (decision:34 untouched).
- A slot's **first** tenant keeps today's treatment exactly: a plate in the cast row, a lifeline
  from the cast row down. It has held the column since before the film began, so there is nothing
  to establish.
- A **later** tenant takes possession in place: the outgoing lifeline stops with a terminator, and
  the incoming actor's plate is drawn immediately below it, at the head of its own lifeline.
- The handover gets **reserved vertical room of its own** in the row cursor, so a plate can never
  land on a crossing arrow or a label. The reserved band belongs to the row it precedes, so the
  camera frames the arrival with the message that caused it.
- A terminator is drawn **only** where a slot actually changes hands. An actor that keeps its column
  to the end keeps its lifeline to the end — "this column stops being this actor" is a fact the
  layout knows; "this actor is finished" is a claim about the protocol it does not get to make.
- `layout.cast` remains the first tenants' plate row, so the establishing shot and the rail's
  visibility rule are unchanged.
- `examples/tap.yaml` produces a layout numerically identical to the baseline, and there is a test
  that says so.
