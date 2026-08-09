---
id: tsk_01KZKHF8DQ9F3K09ZCNV61QFE3
sequence: 114
kind: task
status: closed
sprint: spr_01KZKHF8BF2P8G72QXG4BH13G9
created: 2026-08-09
closed: 2026-08-09
---

# Declare the reduction on the frame

## Objective

Make a reduced slide say so on the frame, in counts rather than in a hint.

This is the condition of the feature existing. A pruned `Running` shows three exits where the
machine declares six, and a viewer who is not told believes something false about the system.
dragon:18 answered the same shape with a rail naming what the shot cut off; decision:49's ledger
says `+8 earlier` rather than an anonymous ellipsis. Same rule.

## Acceptance criteria

- A reduced slide states, on the frame: states shown of states declared, and transitions shown of
  transitions declared.
- Legible at the canonical overview, judged on a rendered frame rather than on a font size.
- Screen-fixed. It does not move, reflow, animate or accumulate for the length of the film.
- An unreduced slide gains nothing at all: no band, no zero counts, no reserved space, and its
  frames are unchanged.
- Whatever room it takes is taken off the graph's viewport before layout, as decision:49's rail is,
  so no state is ever drawn under it.

## What it says, and what it cost

Under the title, in the gutter the camera was never given:

    showing the narrated run
    6 of 9 states
    9 of 14 transitions

Three things it is not, and each was a live temptation. Not a **list** — dragon:18 already refused
a rail of sentences naming what a shot cut off, and a list of missing transitions is that rail with
the same problem. Not an **apology** — "showing the narrated run" says what the picture is, where
"5 transitions hidden" would frame the slide as a lossy version of a better one. Not in the
**accent**, because the one warm thing on a machine frame is occupancy.

Counts on both axes, because states and transitions prune by different amounts and either alone
understates it.

**The first render wrapped, and the wrap was the defect sprint:20 already recorded.**
`6 of 9 states, 9 of 14 transitions` broke after `9 of 14` and orphaned the word `transitions` onto
a line of its own — the same greedy-wrap failure that gave that round `downstream returns` / `429`.
A note about honesty that reads as a typographic accident is not doing its job, so the two counts
are now broken here rather than by the box, and the block's height stopped depending on a string.

**What it cost, stated rather than buried:** `railScopeBlock` is 104px, and the rail pays for it.
The reduced film's ledger is set at 23px against the unreduced film's 27px, still six rows and
still above the 20px floor. The reservation degraded type before rows, which is the ordering
`./ledger.ts` argues for, and it is the honest price of the declaration.

**An unreduced slide gains nothing, checked on pixels rather than asserted.** The closing frame of
`examples/leases.yaml` measures `x 447..1847, y 149..962` after this change and measured
`x 447..1847, y 149..962` before it.
