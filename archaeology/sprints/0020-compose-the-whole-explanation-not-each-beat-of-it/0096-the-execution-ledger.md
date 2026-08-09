---
id: tsk_01KZJDMQN1C77PZBRV10WH5JEB
sequence: 96
kind: task
status: closed
sprint: spr_01KZJDK32M4VSS1AC8R169WAWK
created: 2026-08-08
closed: 2026-08-08
---

# The execution ledger

## Objective

Replace the readout's route breadcrumb with a chronological execution ledger: a screen-fixed rail
of transition **occurrences**, not a list of states.

## Acceptance criteria

- Rows carry the occurrence ordinal, what fired the transition, and where it arrived, in
  chronological order.
- Two occurrences of one transition are two rows; two parallel transitions between one pair of
  states are distinguishable by what fired them.
- The latest row is the strongest; older rows quiet without becoming unreadable.
- Overflow states what it dropped, as a count of earlier entries. No anonymous ellipsis anywhere.
- The rail is screen-fixed, and the graph viewport is reduced by the region it occupies, so no
  state is ever drawn under it.
- Adding a row moves no node and recomposes no shot: the reserved region is a constant for the
  film, derived before layout.
- The inferred starting occupancy is represented if that reads better, and is not drawn as a
  transition.
- Tests cover overflow, long labels, repeats, parallel pairs, and the final fully populated state.
