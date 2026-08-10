---
id: tsk_01KZMFGXQ8YGMFQ3JS5QBRY49C
sequence: 160
kind: task
status: pending
sprint: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
created: 2026-08-09
---

# Freeze k-means on a pass, explain it, and resume

## Objective

Make the k-means demonstration prove it, and inspect the result.

## Acceptance criteria

- `examples/kmeans/kmeans.R` declares a moment for each pass it drew and for convergence, computed
  from the frames it actually wrote rather than from constants restated somewhere.
- The deck subscribes to a genuinely explanatory one and says something about what is visible in
  the frozen frame.
- The rendered film shows: narration, animation, the exact frame freezing, explanation over the
  held frame, the animation resuming from the same local position, completion, ordinary narration.
- Inspected at the compiled boundaries — the last moving frame, the freeze, the first frame after
  resume — rather than by uniform sampling.
- `npm run check` and `scarp doctor` pass, and every existing deck is unaffected.
