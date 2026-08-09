---
id: tsk_01KZKEHNBCEWTDJ71QQNZFQM4T
sequence: 103
kind: task
status: closed
sprint: spr_01KZKEG1YAXVEEKNNAW1X05CJ4
created: 2026-08-09
closed: 2026-08-09
---

# Find out whether dagre will hold a core together

## Objective

Find out whether dagre will keep a named subset of nodes spatially together, before anything is
decided or built on the assumption that it will. A spike in `out/harness/`, not shipped code.

The candidate mechanism is dagre's compound-graph support: `{ compound: true }` and `setParent`,
which is the library's own answer to "these nodes belong together". If that holds the core
contiguous and still routes the untaken edges into the states they actually connect, the round
proceeds. If it does not, sprint:21's second non-goal applies and the round stops and says so.

## Acceptance criteria

- A probe that lays `examples/leases.yaml` out with the scenario's core as a cluster, and reports
  the core's own bounds, the whole machine's bounds, the shot each would take, and whether every
  untaken edge is still routed to its declared endpoints.
- The same probe run on `examples/elevator.yaml`, whose core is six of seven transitions, as the
  control: clustering nearly everything should change nearly nothing.
- A plain answer recorded in the task: does dagre hold a core, and at what cost in routing quality.
- If the answer is no, alternatives *within* the existing dependency are checked and reported
  before the round stops. Writing a placer is not among them.

## The answer

**No.** dagre will keep a core *contiguous*, and that turns out not to be the thing that was
needed.

Compound clustering works exactly as advertised: `{ compound: true }` plus `setParent` evicts the
one non-core state that had been sitting inside the core's rectangle, and all thirteen non-loop
transitions stay routed to their declared endpoints. It is not a routing failure. It is that
contiguity buys nothing, because **dagre assigns ranks globally and a cluster only constrains order
*within* a rank.** The core therefore keeps spanning every rank the whole machine spans, and the
cluster boundary adds detours for the edges that have to get past it.

Every lever the dependency has, over the full 144-point grid, measured at the frame each film gets
(1540 x 1080 after the ledger rail). Both floors have to be met at once: a core shot at or above
`MACHINE.eventPx` = 20px, and an atlas no worse than today's 16.3px.

    leases                       best atlas   best core shot
      flat (today's search)         18.2px       17.7px
      compound cluster              14.0px       16.9px
      cluster + weight 50            9.2px       21.9px   <- clears the core floor, atlas ruined
      minlen 2 on untaken edges     18.3px       14.9px
      minlen 3                      18.7px       15.9px
      minlen 4                      15.6px       15.9px
      cluster + minlen              13.6px       16.1px

    elevator (control)
      flat                          25.5px       25.2px
      cluster                       25.1px       25.2px   <- unmoved, as a six-state machine should be

**Not one of 4 x 144 configurations meets both floors.** The single configuration that gets a core
shot over the floor pays seven pixels of atlas for it, which is the closing shot the leased
runner's last sentence is about. Traversal weight was swept to 150 and saturates at 2: dagre reads
weight in the ranker and the ordering pass, and neither compacts.

The elevator behaved exactly as the control was written to behave — clustering five of its six
states moves its atlas by 0.4px and its core shot not at all.

## What the probe found on the way, which matters more

The premise was that the leased runner's shortfall is a layout defect the camera then inherits.
Instrumenting decision:51's planner says it is narrower and harder than that.

Occurrences **#9, #10 and #11 are three consecutive silent ones**, and their move windows are
**14 and 11 frames against `MACHINE.minTravel` = 16**. They cannot move. So the shot chosen at #9
has to hold all three — which is `MoveWindow`'s documented consequence working as designed, not a
bug.

The union of those three occurrences' *essential* bounds — no context, nothing croppable — is
**3078u = 17.0px**. So even a perfect shot on that trio is under the floor. The planner's DP had
the candidates, priced them with the bent shortfall correctly (overview 22.0 against a hypothetical
19.0), and parked on the atlas because every alternative was infeasible rather than merely
expensive. **The planner is right, and no camera policy can fix this.**

That is the finding: the shortfall is the intersection of a recurrent cycle that spans the map, a
run of three silent occurrences that cannot afford a move between them, and a layout engine with no
way to compact a subgraph. Only the third was in scope, and it is the one that will not move.

## One defect found, not fixed here

`cuecraft explain` reports `no move worth 9px` for #10 and #11. That is untrue: a move there was
not *affordable*, at 14 and 11 frames against a 16-frame minimum, and was never priced at all. The
reason string reads as a judgement the planner did not make. Recorded rather than fixed, because
fixing diagnostics is not what this task was for.
