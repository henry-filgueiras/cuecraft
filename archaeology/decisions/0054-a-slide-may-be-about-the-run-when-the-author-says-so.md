---
id: dec_01KZKHH49XNRZST81M3EZ9M419
sequence: 54
kind: decision
status: accepted
created: 2026-08-09
---

# A slide may be about the run, when the author says so

## Context

`../presentation/machine.ts` argues against this decision, in its own words, and the argument is
good:

> The tempting spelling is the one this refuses: a list of transitions, each with a sentence, and no
> topology at all. It is shorter, it renders, and it is a different artifact — an animated event
> log. What makes this a state machine explainer is precisely the transitions the scenario **does
> not take**: the branch the elevator did not go down is the reason the branch it did go down means
> anything.

That paragraph is why decision:52 and decision:53 both refused to let untaken material be demoted,
and it still holds. What has changed is that sprint:21 measured what holding it costs on a machine
that cannot afford it, and found the cost is not a layout deficiency that a better search could pay
off.

`examples/leases.yaml` is nine states and fourteen labelled edges. Six of its thirteen occurrences
are shown at 16.3px against a 20px legibility floor, and sprint:21 established in three independent
ways that this is not fixable: arrangement is exhausted (the best-aspect candidate of 144 reaches
18.2px and beats the area-preserving ideal), seeding cannot be drawn (4 x 144 configurations, not
one meets both floors), and the run goes silent across three consecutive occurrences whose union is
17.0px, so no camera policy reaches it either.

Meanwhile the same machine, drawn as only what its scenario touches, measured through the real
pipeline rather than a layout score:

    leases                states     atlas    camera moves   below the 20px floor
      as shipped          9st 14tr   16.3px      6 / 13            6 / 13
      narrative reduction 6st  9tr   27.9px      0 / 13            0 / 13

The reduced film needs no camera at all. Thirteen occurrences at 28px from one held overview, which
is the result decision:51 recorded as its strongest evidence when the elevator produced it.

## Decision

**An author may declare that a machine slide is about the narrated run rather than the whole
machine, with `scope: narrated`. The compiler then draws exactly the states and transitions the
scenario touches, and the frame says that it has.**

Three things make this a projection rather than a retreat to the animated event log, and all three
are load-bearing.

**It is declared, never inferred.** The compiler does not decide that a machine is too wide and
quietly reduce it. There is no threshold, no heuristic, and no condition under which `scope: whole`
produces anything but today's picture. What the paragraph above protects — that the untaken branch
is the reason the taken one means anything — remains the default, and every existing deck renders
byte-identically.

**It is whole or nothing.** No per-state emphasis, no weighting, no "keep the interesting ones", no
radius around the run. A slide is about the machine or about the run, and both are honest pictures
of different things. A partial reduction would be the compiler having an opinion about which
possibilities matter, which is precisely what decision:52 and decision:53 refused and this does not
reopen.

**And it declares itself on the frame.** This is a condition of the feature existing rather than a
nicety. A pruned `Running` shows three exits where the machine declares six, and a viewer who is not
told believes something false about the *system*, not merely something incomplete about the film.
dragon:18 met the same shape from the other side and answered it with a rail naming the parties the
shot had cut off; decision:49's ledger says `+8 earlier` rather than an anonymous ellipsis. So a
reduced slide states its counts — states shown of states declared, transitions shown of transitions
declared — and if that cannot be made legible, the reduction is not shipped.

### The criterion, and the three that were measured and refused

**Touched by the scenario**: the transitions the run takes, and the states those transitions touch.
Safe by construction — the run's path is connected and contains wherever it stopped — and it is the
only candidate that is both safe and worth anything. Recorded so the next round does not re-derive
them (`out/harness/subsets.ts`):

    reachable from the start   9/9 states   buys nothing. Every state in both examples is
                                            reachable; an unreachable state is a bug in the
                                            machine, so this criterion is empty in general.
    on a circuit               6/9 states   unsafe. Drops `Cancelled` — the state the film ends
                                            in — and `drained`, a transition the run takes. It
                                            also keeps `Orphaned`, since Claimed -> Orphaned ->
                                            Queued -> Claimed is a genuine cycle.
    on a circuit + terminals   9/9 states   the identity function, on both examples.
    touched by the scenario    6/9 states   41.0px name / 27.9px event.

The lesson underneath is worth keeping: **no graph-theoretic criterion shrinks the picture.** Only a
narrative one does. There is no smaller universe in a well-formed machine — there is only a smaller
story, which is why this is an authoring decision and could never have been a layout policy.

### Why it must be opt-in, argued from the examples

`examples/elevator.yaml` gains 5.6px from the reduction and loses `still-blocked`, and its own
header says what that costs:

> `still-blocked` below is declared and never taken: the doors *could* give up, and the reason the
> run coming back to Closed means anything is that it did not have to.

So the showcase must refuse this flag and the adversarial specimen wants it. That the two examples
set it differently is the evidence that it is a real choice about what a slide is for; a flag both
set the same way would have been a constant that had been set wrong.

## Consequences

- One key on `machine:`, with two values and `whole` as the default. It carries no coordinate, size,
  position, colour, duration or camera instruction, and it is not a door to naming a state, a
  transition or a region — the grammar's refusal of geometry and time (`../presentation/machine.ts`)
  is unchanged.
- **No layout change whatsoever.** `layoutMachine`, `audition.ts`, `DEFAULT_LAYOUT` and the scoring
  are untouched. This works entirely by handing dagre a different machine, which is exactly why it
  is available when decision:53's seeding was not.
- The reduction is applied at one call site, so layout, camera, ledger, chrome and `cuecraft
  explain` never disagree about which machine they are describing.
- dragon:28 becomes a property of `scope: whole` specifically. A reduced slide has no illegible
  transition; an unreduced wide machine still does, and the ceiling still wants writing down next to
  the grammar.
- A viewer of a reduced slide cannot learn the machine's full shape from it. That is the cost, it is
  accepted knowingly, and the counts on the frame are what keep it from being a deception.
