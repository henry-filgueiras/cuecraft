---
id: tsk_01KZKHFTHSJ0T9YYPRMWS0DXNP
sequence: 116
kind: task
status: closed
sprint: spr_01KZKHF8BF2P8G72QXG4BH13G9
created: 2026-08-09
closed: 2026-08-09
---

# Render, look, and correct

## Objective

Render, look at real frames, twice, and fix what they show.

## Acceptance criteria

- Every film renders through `cuecraft render` with no hand-editing of any projection.
- `cuecraft explain` recorded for the reduced film and for the unreduced one, on the same
  instrument, so the claim in sprint:22's rationale is checked rather than assumed: 27.9px atlas,
  zero camera moves, nothing below the 20px floor.
- At least two inspection passes, the second after the first pass's fixes.
- The question a spreadsheet cannot answer is answered on a frame: **how a reduced map reads against
  a ledger that still lists every occurrence.** If the ledger and the map disagree about what the
  film is about, that is a defect and it is recorded.
- The declaration from task:114 is checked at the canonical overview in a real frame.
- Every defect is fixed or recorded. None is left visible and unmentioned.

## Two passes, one defect fixed, two recorded

Rendered through the ordinary pipeline at the real viewport — subtitles off, as both examples
declare, which is the trap task:107 fell into last round.

**The claim in the rationale is confirmed, not approximated.** 6 states and 9 transitions at
1755 x 1188, a canonical overview of 1878 units, 41.0px state names and **27.9px event labels**, and
**zero camera moves across all thirteen occurrences, every one of them on the overview at 28px**.
Nothing below the 20px floor. The silent holds improved as a side effect: 39-52 frames
(1300-1733ms) against the unreduced film's 20-52 (667-1733ms), because a camera that never moves
never takes a move out of an arrival.

**Pass one found the declaration wrapping badly.** Fixed in task:114 and re-rendered.

**Pass two, on the corrected frame.** Every event label is legible at a glance, including
`visibility timeout expires...`'s absence — the sixty-five character caption is one of the five
transitions that left. The recurrent cycle reads as a cycle.

The question a spreadsheet could not answer, answered: **a reduced map against a full ledger is not
a contradiction.** The rail still lists all thirteen occurrences and still says `+8 earlier`,
because the scenario did not change — only the map did. The two are describing different things
and always were: the ledger is what happened, the map is where. Nothing in the frame suggests the
run did fewer things than it did.

One property worth recording because it was not designed: **the reduction does not flatten the
taken/untaken distinction, it narrows the universe the distinction operates in.** `cancellation
withdrawn` is the one untaken transition still on the map, and decision:49's wake still draws it
recessive against `an operator cancels` beside it. A reduced slide is still a machine with
possibility in it.

Two defects recorded, not fixed:

- **The ledger still wraps greedily** — `downstream returns` / `429`, `a worker takes the` / `lease`
  — which is sprint:20's defect in the rail rather than in the title, still unfixed there. This
  round made it marginally more likely by taking the rail from 27px to 23px, and fixing the rail's
  wrap is not what this sprint is for.
- **The bidirectional pair `an operator cancels` / `cancellation withdrawn` routes as two long
  near-parallel lines** across the width of the map. Legible, unambiguous, and not pretty.
