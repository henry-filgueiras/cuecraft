---
id: dec_01KZJHPWS48MZPZQNV10KWMPSJ
sequence: 52
kind: decision
status: accepted
created: 2026-08-08
---

# Elect a layout, and let the scenario be evidence but never a coordinate

## Context

decision:48 asked dagre for one layout and took the answer. That is the right thing to do the first
time, and it produced an elevator that photographs well and an adversarial specimen at 2.88:1
against a 16:9 frame — 23.4px state names and **15.9px event labels** in the one shot that has to
show the whole machine, which is dragon:28.

The available responses to that were both refused in advance. Shrinking the type is refused because
`MACHINE.namePx` is already where a name stops being readable. Sending the camera closer is refused
because a local magnification cannot rescue an atlas that was never intelligible whole — and
decision:51's planner proves it arithmetically rather than rhetorically: on the incumbent layout,
ten of the leased runner's thirteen occurrences have **no shot at all** that shows their label
legibly, because their transitions span most of the map.

There is a third response, and it is available only to a compiler. A layout is not one answer, it is
a search, and everything the search needs is known before a frame is rendered: the whole topology,
every label's text, the parallel and bidirectional pairs, the self-loops, the complete scenario, the
final aspect ratio, and how much of the frame the chrome and the ledger have already taken.

## Decision

**A machine's layout is elected from a deterministic candidate grid, scored on legibility and
integrity, and the audition is drawn.**

144 candidates over four axes — `rankdir`, `ranker`, `labelMeasure`, `spread` — plus, on probation,
scenario weighting. The incumbent is one of them and is always reported, so the round can say what
the search bought rather than merely that it ran.

**The axis that matters is not the one that looks like it should be.** `labelMeasure` is how many
characters an event label wraps to, and it is not typography: it is the graph's aspect ratio with a
different name. Narrow it and every label grows a line, every rank gets shorter, and the machine
gets taller and thinner. The overview fits `max(W, H · frameAspect)`, which is smallest exactly when
the machine's aspect equals the frame's — so the elevator (too tall) and the leased runner (too
wide) want the measure moved in **opposite directions by one rule**. `spread` does the same trade on
the part of a hub's width that is gaps rather than text. That two examples want opposite values of
the same knob is the strongest available evidence that this is an objective and not a constant set
wrong: a constant that improved both films could only have been wrong.

**The objective is legibility, penalised by integrity failures, and it is not area.** The compact
layout is the one that stacks six sibling branches into two columns and puts a long label across a
plate. Node overlap, label overlap, label-on-plate, label-on-route, crossings, ambiguous parallel and
bidirectional pairs, and self-loop collisions are priced *against* the headline in the same units,
so the trade reads as "this candidate is worth two pixels of state name and is paying six for a
caption lying across a state". Node-layout defects are scored apart from routing and label
placement, because a better arrangement with unreadable captions is not victory.

**And the scenario is legitimate layout evidence, which sprint:19 refused.** Two channels, and they
were adopted for different reasons and on different strength of evidence:

- **`framable`** — what fraction of the run's occurrences have *any* shot that shows their label
  legibly. This is the layout being scored on whether decision:51's camera will be able to do its
  job, and it is a question only something that can see the whole scenario before laying anything
  out is in a position to ask.
- **traversal weighting**, on probation and adopted narrowly. dagre is told a transition matters
  `1 + 2n` for `n` traversals, which pulls the recurrent core together. The measured effect on
  `examples/leases.yaml` is that occurrences shown below the legibility floor go from **10 of 13 to
  5 of 13** — and that is a film-level result rather than a scalar, taken from the actual camera
  plan under each rival layout.

**So sprint:19's invariant is weakened, deliberately and precisely.** It was *the layout never sees
the scenario*; it is now:

> A layout is a pure function of the topology and of **how many times each transition is taken**.

Permuting, reversing and rotating the run still move nothing, and a test says so — because a
multiset of traversals is invariant under reordering. What is still refused is everything the old
invariant was actually protecting: no transition is hidden, demoted, dropped or drawn differently
for never being taken, every declared edge is on the map, and the run cannot rearrange the machine
to make itself look linear.

**The audition is drawn, and the drawing overturned the scalar.** `./auditionsheet.ts` writes a
labelled SVG panel per distinct candidate geometry at the exact canonical overview, so a caption
unreadable in the panel is unreadable in the film. It earned its place on first use: the score
preferred a tangled candidate by a point and a half over one with two fewer crossings and 1.7 more
pixels of type, the panels made the knot around the six-exit hub obvious, and `CROSSING_PRICE` went
up as a result. A layout score nobody looks at is a layout nobody chose.

## Consequences

- Measured, against the frame each film actually gets (1540 × 1080, after the gutter):

      elevator   incumbent 33.1px state / 22.5px event   elected 37.5 / 25.5   tb-simplex-m26-s1.8
      leases     incumbent 19.1px state / 13.0px event   elected 23.9 / 16.3   tb-simplex-m20-s0.5

  The elevator's elected policy leans `spread` the *opposite* way from the leased runner's, which is
  the objective working rather than a coincidence.
- **`examples/elevator.yaml` is the control and it is load-bearing.** A test asserts the elected
  layout gains no crossing and strands no occurrence on a six-state machine, so a change that helps
  the adversarial specimen by making a small machine awkward fails.
- **dragon:28 is not closed.** The best achievable overview for the leased runner is about 24px
  state names and 16px event labels; four transitions in that film are still never legible in any
  frame. The audition improved it by roughly a quarter in world units and the ledger took some of
  that back. What changed is the *diagnosis*: it is now known to be a property of a nine-state
  machine with fourteen labelled edges rather than a layout that was never searched.
- 144 dagre runs cost about 200ms and happen once per film, memoized on the machine. No dependency
  was added; dagre now has a third use and a much harder one.
