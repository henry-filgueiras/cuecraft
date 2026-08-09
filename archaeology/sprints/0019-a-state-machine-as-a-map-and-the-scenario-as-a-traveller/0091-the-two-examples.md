---
id: tsk_01KZJ8SKGNB10E4CJJ1VRRXRR5
sequence: 91
kind: task
status: pending
sprint: spr_01KZJ8R3RA1F5J5HEEJ40Z6GSP
created: 2026-08-08
---

# The two examples

## Objective

Two source examples in the final grammar, written to be watched rather than to pass.

## Acceptance criteria

- `examples/elevator.yaml` — six states, seven transitions, an eight-occurrence scenario that
  loops, revisits, repeats a transition, narrates four occurrences and leaves four silent, and
  leaves the failure branch visible and untaken. It ends at a state the film does not call final.
- `examples/leases.yaml` — nine states and at least thirteen transitions including a self-loop, a
  parallel pair, a long label, a high-degree hub and a reclamation cycle; a scenario that reaches
  the hub, takes the self-loop, retries out and back twice through different parallel edges, and
  cancels.
- Neither example's coordinates or geometry are special-cased anywhere in the implementation.
- Both carry a header comment in the house style saying what is authored and what is derived.
