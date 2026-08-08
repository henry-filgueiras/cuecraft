---
id: tsk_01KZFHACWXRQD0F0CS0ZCW4NDY
sequence: 50
kind: task
status: closed
sprint: spr_01KZFH96N7BQC1P54W511N83AX
created: 2026-08-07
closed: 2026-08-07
---

# Render, watch, and report the A/B

## Objective

Preserve the baselines, render all three examples, watch them, and answer the aesthetic gate
honestly — including the outcome where the allocator gained little.

## Acceptance criteria

- Baseline `tap` and `deploy` preserved before anything changes, and both re-rendered after.
- All three watched end to end, not sampled.
- Reported per example: semantic actors, physical slots, peak simultaneous live, reuses.
- Explicit answers on: whether `tap` is unchanged, whether `deploy` reads as better use of width,
  whether any reuse implied false continuity, whether arrivals feel intentional, and whether the
  camera improved without being touched.
- Anything the round learned that contradicts the hypothesis is written into the sprint before it
  closes.
