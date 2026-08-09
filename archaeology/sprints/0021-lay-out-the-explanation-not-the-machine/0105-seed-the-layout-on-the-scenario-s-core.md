---
id: tsk_01KZKEHNBTB7Y8WF8FHQPFQ8TY
sequence: 105
kind: task
status: closed
sprint: spr_01KZKEG1YAXVEEKNNAW1X05CJ4
created: 2026-08-09
closed: 2026-08-09
---

# Seed the layout on the scenario's core

## Objective

Seed the layout on the scenario's core: the transitions the run takes and the states they touch,
laid out as one group, with the untaken remainder attached around it and fully routed.

## Acceptance criteria

- `LayoutPolicy` gains one seeding axis and no more. The core is computed from the scenario inside
  the render layer; no caller passes a state name, and no authored key reaches it.
- A machine with no scenario, or whose scenario touches everything, lays out exactly as it does
  today. Byte-identical where the core is the whole machine.
- Every declared transition is present, routed to its declared endpoints, and captioned at the same
  size it would have had unseeded.
- Permuting, reversing and rotating the scenario changes no coordinate, and the existing
  determinism test is extended to say so under seeding.
- `examples/elevator.yaml` gains no crossing and strands no occurrence. A test asserts it.
- No new dependency.

## Abandoned, on task:103's evidence

Not attempted. task:103 measured every lever the dependency has — compound clustering, edge weight
to 150, `minlen` exile, and their combinations — across the full 144-point grid on both films, and
not one of 4 x 144 configurations met both floors at once. The only configuration that got a
territory shot over 20px cost seven pixels of atlas, which is the closing shot the leased runner's
last sentence is about.

Building this against that evidence would have meant writing a placer, which sprint:21's second
non-goal refused in advance and `CLAUDE.md` refuses generally. The acceptance criteria below are
recorded unmet rather than rewritten, because the constraint they encode is what made stopping the
right answer instead of an admission. See decision:53.
