---
id: dec_01KZKFJ71FT080SYJTQVG3SAYZ
sequence: 53
kind: decision
status: accepted
created: 2026-08-09
---

# A machine is laid out in one pass, and the picture stays an atlas

## Context

decision:52 elected a machine's layout from a 144-candidate grid and left dragon:28 open: the leased
runner's event labels come out at 16.3px in the shot that has to show the whole machine, the floor
is `MACHINE.eventPx` = 20, and no candidate cleared it.

sprint:21 was opened to test a different shape of answer, and it came from noticing that the search
space had never contained the obvious idea. dagre places every node in one pass over a global
ranking; nothing in `rankdir x ranker x labelMeasure x spread x weight` can say *keep these six
states together*. So decision:52's conclusion — that this is a property of the machine — was
measured against a space that could not express the alternative.

The alternative is worth stating precisely, because it is a good idea and the measurements below are
what kill it rather than an argument. `examples/leases.yaml` runs thirteen occurrences over **eight
of its fourteen transitions and six of its nine states**. Those six states are two overlapping
circuits sharing a `Queued -> Claimed -> Running` spine. Laid out *alone*, as if they were the whole
machine, they come out **1602 x 1146 = 1.40:1** against a 1.426:1 frame — a near-perfect fit, giving
**29.9px** event labels where the whole machine gives 16.3px.

The three states the run never occupies are worth seventeen pixels of state name:

    as shipped                       9st 14tr  3011x1736 (1.73:1)  23.9px name / 16.3px event
    less the two terminal branches   7st 12tr  2531x1736 (1.46:1)  28.4 / 19.3
    less the orphaned detour         8st 11tr  2505x1356 (1.85:1)  28.7 / 19.5
    less all three never occupied    6st  9tr  1755x1188 (1.48:1)  41.0 / 27.9
    less an OCCUPIED leaf (control)  8st 13tr  2968x1378 (2.15:1)  24.2 / 16.5

The control is the part that matters: dropping an *occupied* leaf buys 0.3px. This is not "fewer
nodes are smaller". It is specifically the counterfactual material that is expensive.

## Decision

**A machine's layout stays a single dagre pass over the whole machine, and the picture stays an
atlas.** Not because seeding was judged wrong, but because it cannot be drawn.

Every lever the dependency has was measured over the full grid, at the frame each film actually
gets. Both floors have to be met at once — a shot on the run's own territory at or above 20px, and
an atlas no worse than today's 16.3px:

    leases                       best atlas   best territory shot
      flat (today's search)         18.2px       17.7px
      compound cluster              14.0px       16.9px
      cluster + weight 50            9.2px       21.9px   <- clears one floor, ruins the other
      minlen 2 / 3 / 4          18.3/18.7/15.6   14.9/15.9/15.9
      cluster + minlen              13.6px       16.1px

**Not one of 4 x 144 configurations meets both.** Compound clustering works exactly as documented —
it evicts the intruder from the core's rectangle and every transition stays routed — and it buys
nothing, because a cluster constrains order *within* a rank and dagre assigns ranks globally. The
core keeps spanning every rank the machine spans, and the cluster boundary adds detours. Traversal
weight was swept to 150 and saturates at 2.

`examples/elevator.yaml` behaved as the control was written to behave: clustering five of its six
states moves its atlas by 0.4px and its territory shot not at all.

**The alternative to dagre is a bespoke placer, and that is refused.** This repository does not
implement layout machinery, and a second layout dependency needs a decision of its own with a
demonstrated need behind it. A finding that the library will not do it is a finding.

### And the shortfall is not only a layout problem, which is the more useful half

Instrumenting decision:51's planner while testing this changed the diagnosis. Occurrences #9, #10
and #11 of the leased runner are three consecutive **silent** ones, and their move windows are
**14 and 11 frames against `MACHINE.minTravel` = 16**. They cannot move at all. So the shot chosen
at #9 must hold all three — which is `MoveWindow`'s documented consequence working as designed.

The union of those three occurrences' *essential* bounds, with no context and nothing croppable, is
**3078u = 17.0px**. **Even a perfect shot on that trio is under the floor.** The planner's DP had
the candidates, priced them correctly, and parked on the atlas because every alternative was
infeasible rather than merely expensive.

So the shortfall is the intersection of three things: a recurrent cycle that spans the map, a run of
three silent occurrences that cannot afford a move between them, and a layout engine with no way to
compact a subgraph. Only the third was in scope for this round, and it is the one that will not
move.

### decision:52's gap is left open, deliberately

decision:52's formal invariant is *"a pure function of the topology and of how many times each
transition is taken"*, and seeding is a function of exactly that — a core is the set of transitions
whose count is not zero. Its prose refuses *"no transition is hidden, demoted, dropped or drawn
differently for never being taken"*, and placement-by-relevance is a soft demotion. **The invariant
permits what the prose forbids.**

This round does not resolve that, and pretending otherwise would be inventing a decision it did not
have to make. The atlas-versus-explanation question — whether the picture should be shaped by what
is being explained, so that the same machine narrated two ways draws two ways — is live and
unanswered. What is recorded is that it was not answered *here*, and why: the implementation that
would have forced the choice is unavailable, so the choice never came due.

If a later round finds a way to draw a seeded layout, the prose is what has to be re-argued, and
this decision is not evidence against it.

## Consequences

- No production code changed for the layout. `layoutMachine`, `audition.ts` and `DEFAULT_LAYOUT` are
  untouched, and both films render exactly as they did.
- **The de-emphasis half of the same proposal turned out to be already built, and measured.** Off
  the rendered closing frame of `examples/leases.yaml`, peak text luminance of the never-occupied
  states against the visited ones is **158 against 202 of 255 — a 21.8% difference**. `StatePlate`'s
  claim that `possible` is "a real contrast, not a hint" holds under measurement. On the edges the
  wake carries it further still: an untaken caption sits at half the alpha of a taken one. Nothing
  was added, because it was there.
- dragon:28's diagnosis is now much stronger and its number is unchanged. It is not a layout that
  was never searched, and it is not a camera that chose badly. It is a nine-state machine with
  fourteen labelled edges, whose recurrent cycle spans it, being explained by a run that goes quiet
  for three occurrences in the middle.
- One real defect was found and fixed (task:110): the planner reported `no move worth 9px` for holds
  whose window was never priced at all. It now distinguishes a move refused on price from one with
  no room, and a test asserts both.
- Five probes are left in `out/harness/` — `core.ts`, `rank.ts`, `cluster.ts`, `twostage.ts` and
  `contrast.ts`. Projections, gitignored, and reproducible from the command line.
