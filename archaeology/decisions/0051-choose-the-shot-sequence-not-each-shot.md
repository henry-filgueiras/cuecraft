---
id: dec_01KZJHNFNYJCX8MPF0EYC3J6DC
sequence: 51
kind: decision
status: accepted
created: 2026-08-08
---

# Choose the shot sequence, not each shot

## Context

decision:24's hold policy is three comparisons and a preference for doing nothing, and it has now
worked in a world, a transcript and a graph. decision:48 recorded that a machine needed nothing
added to it, and treated that as the result.

`cuecraft explain` says otherwise, and the numbers are not subtle:

    leases     11 moves in 13 occurrences. Ten of them pans at an identical scale (3092 units),
               each buying nothing measurable at all
    elevator   5 moves in 8. The last recomposed to 3628 units against an overview of 3628 —
               a move to nowhere, immediately followed by a 130-frame pull-back over it

Every one of those decisions is individually defensible under decision:24, which is the point.
`shotFor` is asked *is the shot I am holding good enough for what just happened*, it answers
honestly each time, and the sequence is restless — because a greedy planner cannot see that four
small moves in a row are one wrong decision rather than four right ones. It also cannot see the
opposite failure: a shot that ought to be wider *now* because three occurrences from now nothing
will be able to move.

Both are failures of **locality**, and locality is not forced here. A machine film knows its whole
graph, its whole scenario, every narration duration and therefore exactly which occurrences can
afford a camera move at all, before a frame is rendered.

## Decision

**The shot sequence is chosen as a sequence, over a named vocabulary, by minimum cost.**

    overview    the canonical whole-machine composition. One viewport, computed once, compared by
                value. The film opens on it and finishes on exactly it
    retained    the shot already being held. Costs the viewer nothing
    local       a materially closer look at a transition and its neighbourhood

Candidates are the overview plus one shot per run of consecutive occurrences within
`MACHINE.horizon`, and then two folds:

- **A candidate wider than `MACHINE.overviewSnap` of the overview *is* the overview.** This is the
  elevator's last shot, made unrepresentable. A frame at ninety-four percent of the overview's width
  with the centre slightly off is neither a look at a transition nor a look at the machine, and the
  only thing its being a different rectangle achieves is a camera move at each end of it.
- **Two candidates within the deadband are one candidate.** Hysteresis as *identity* rather than as
  a penalty: a perceptually pointless move is not a thing the planner can choose badly, it is not a
  thing the planner can choose. A threshold expressed as a penalty is a number somebody will later
  tune; expressed as identity it is a property a test asserts.

The cost has two terms and both are in screen pixels of event label, so the trade is legible:

- **each occurrence pays** the shortfall between the label it gets and comfortable, *bent at the
  legibility floor*. Above the floor a label is read and a wider shot costs only comfort; below it
  the label is not read and the shot has stopped answering the question it is for. That bend is not
  a refinement, it is the difference between a working planner and a broken one — priced linearly,
  the leased runner held its canonical overview for **twelve of thirteen occurrences**, because at
  fifteen pixels a word every move looked like it was buying comfort and twelve comforts do not
  outweigh eleven moves.
- **each move pays a fixed price**, and that single number is the whole hysteresis policy. A move
  happens exactly when it buys more readable frames than it costs, summed over every occurrence it
  serves. Nothing in the planner says "do not bounce"; bouncing is simply expensive.

Feasibility is separate and hard: a shot must *contain* the essential bounds — source, route, label,
destination — of every occurrence it covers, and a move must fit in that occurrence's window
(decision:50). The window is what makes the lookahead necessary rather than decorative: a run of
silent occurrences has no room for a move between them, so whichever shot opens the run must contain
all of it, and there is no way to know that without having read the rest of the scenario.

**Two rules from sprint:19 are retired rather than kept.** "The overview is not a shot the run may
hold" is gone: the overview is an ordinary candidate that costs legibility on every occurrence, so
the planner leaves it when that is cheaper and returns when it is not, which is what the special
case was approximating. And the closing pull-back is no longer `CAMERA.revealTravel` flat — it is
paced, because most of that move now covers no distance.

**And the chrome band is gone, which is dragon:29's own alternative taken.** The 216-pixel strip
along the top charged a *tall* machine about a third more width in every shot, for a caption present
for one second of an establishing shot; the execution ledger needed a rail down the left anyway
(decision:49), so the title moved into it and the reservation became entirely horizontal. The
asymmetry reverses and improves: a height-bound machine now pays nothing (elevator's state names
26.5 → 37.5px) and a width-bound one pays the gutter (leases 23.4 → 23.9px, after the audition).

## Consequences

- **Whole-scenario planning beat local planning, and the margin is large.** leases 11 moves → 3–6,
  every one of them buying 4–14 screen pixels of event label; elevator 5 → **0**, because at 25px
  event labels in the canonical overview there is nothing left to buy. A camera that does not move
  at all for sixty-seven seconds is the correct answer to a six-state machine that fits legibly
  whole, and it is not an answer a greedy planner could have reached — it dived on its first
  occurrence and never came back.
- The occurrences shown below the legibility floor in `examples/leases.yaml` went from **10 of 13 to
  1 of 13**, and the last step of that came from letting a machine's move be as quick as its own
  traveller's crossing rather than inheriting `CAMERA.minTravel`, which was measured for a world.
- **The planner is `./camera.ts`'s fourth caller and still shares only rectangles.** `fitTo`,
  `paceOf`, `viewRect`, `marginOf`, `union`, `fitWidth`, `cameraAt` unchanged; `shotFor` is no
  longer called by `circuit` at all, because the ladder it embodies is exactly the greedy policy
  this replaces. decision:36's split holds: the two other compositions are untouched.
- A camera-plan diagnostic prints candidates, the selection, the measurement and the reason for
  every hold and every move (`cuecraft explain`). It is proportional and it is developer-facing;
  nothing in the grammar can reach it.
