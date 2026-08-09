---
id: tsk_01KZJ8SKGSD9H0P76QW0D4MBZC
sequence: 92
kind: task
status: closed
sprint: spr_01KZJ8R3RA1F5J5HEEJ40Z6GSP
created: 2026-08-08
closed: 2026-08-08
---

# Render, look, and correct

## Objective

Render both films, look at real frames, and let what they show change the result.

## Acceptance criteria

- Both render to completion through `cuecraft render`, and the exact commands and output paths
  are recorded.
- Frames extracted covering initial topology, mid-traversal, arrival, a revisit, a repeated or
  parallel transition, the self-loop, and the closing overview, for both films.
- Each frame checked for collisions, clipping, ambiguous arrows, unreadable labels, camera
  thrashing, lost occupancy, deceptive terminal styling, and history drowning topology.
- At least one defect found by looking and fixed, with what was wrong and what changed recorded.
- The paused-frame test answered honestly, per film, including if the answer is no.
