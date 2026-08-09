---
id: tsk_01KZJ8SKGB59Y7Z28VWTCTHWSB
sequence: 89
kind: task
status: pending
sprint: spr_01KZJ8R3RA1F5J5HEEJ40Z6GSP
created: 2026-08-08
---

# Lay the topology out once, and plan the camera over it

## Objective

`src/render/machine.ts`: lay the topology out once with dagre on genuinely harder input than
`world` has ever given it — multigraph, edge labels, cycles, self-loops — and answer where the
camera stands for one occurrence.

## Acceptance criteria

- Layout is a pure function of `states` and `transitions`. A test permutes the scenario and
  asserts every node rect is identical, and a second test asserts two layouts of the same machine
  are byte-identical.
- Parallel transitions between one ordered pair get distinct routes and distinct label boxes.
- Self-transitions get reserved room of their own above the state, so a loop can never be drawn
  over an incoming edge or somebody else's label.
- Bounds contain every plate, every route, every label box and every self-loop, so the closing
  overview cannot cut through the machine.
- Polyline geometry that `world.ts` already owns is *moved* to a module both callers import
  rather than copied, with `world.ts` re-exporting so no existing importer changes — decision:36's
  boundary rule, applied a second time because a second caller demonstrated the sharing.
- `occurrenceBounds` frames the source, the routed transition, the destination, and the
  destination's other exits when they fit — nearest first, stopping when the shot would exceed the
  widest legible one.
- `machinePlan` opens on the whole machine, decides every later shot with `shotFor`, lands each
  move before the traversal it is about to show, and pulls back to the whole machine at the end.
  A test asserts a scenario that stays in one neighbourhood emits no camera keys after the first.
