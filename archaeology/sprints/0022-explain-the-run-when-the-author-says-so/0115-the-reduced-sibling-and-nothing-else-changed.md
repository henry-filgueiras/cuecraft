---
id: tsk_01KZKHFTHK3PZDDFT5C8PHD866
sequence: 115
kind: task
status: closed
sprint: spr_01KZKHF8BF2P8G72QXG4BH13G9
created: 2026-08-09
closed: 2026-08-09
---

# The reduced sibling, and nothing else changed

## Objective

Give the leased runner a reduced sibling, so both pictures of the same machine exist and can be
compared, and leave every existing film alone.

## Acceptance criteria

- A film exists that sets `scope: narrated` on the leased runner's machine, with the same states,
  transitions and scenario as `examples/leases.yaml` declares.
- `examples/leases.yaml` keeps `scope: whole` and renders exactly as it does today.
- `examples/elevator.yaml` does not set the flag and does not change, for the reason its own header
  gives.
- The new file carries no coordinate, colour, duration or camera instruction, like every other
  example, and its comment says what the flag is for and what it costs.

## The sibling, and the criterion it corrected

`examples/leases-narrated.yaml`: the same states, the same transitions, the same scenario and the
same sentences as `examples/leases.yaml`, differing by one key. `cuecraft explain` on the pair:

    scope: whole      9 states, 14 transitions, 3011x1736 (1.73:1)   23.9px / 16.3px   6 moves
    scope: narrated   6 states,  9 transitions, 1755x1188 (1.48:1)   41.0px / 27.9px   0 moves

**Building it corrected the criterion, which is the value of building rather than measuring.** The
first implementation kept only the transitions the run *takes*, and that dropped `resumed`
(`Cancelling -> Running`) even though both its endpoints were still on the map. Two things were
wrong with that. It made `Cancelling` look like a state with one exit when the machine says it has
two — a lie about a state the reduction had chosen to *keep*, which is worse than the omission it
was already declaring. And it deleted the referent of this film's own closing sentence, which says
"and so is the road back out of cancelling".

So the criterion is the **induced subgraph**: the run chooses the states, and the machine then
contributes every transition it declares between them. Nine transitions rather than eight, 27.9px
rather than 29.9px, and a picture that does not misrepresent anything it draws.

decision:54's Context quotes the 9-transition figure from the probe and its Decision section
described the 8-transition rule. The induced subgraph is what shipped and what the numbers
throughout refer to; the discrepancy is recorded here rather than edited out of the decision.

`examples/elevator.yaml` and `examples/leases.yaml` are untouched, and their `explain` output is
identical to what it was before this sprint.
