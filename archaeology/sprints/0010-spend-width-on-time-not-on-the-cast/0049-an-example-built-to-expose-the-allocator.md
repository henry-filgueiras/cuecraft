---
id: tsk_01KZFHACWR7YN8017NJ6B4J2SF
sequence: 49
kind: task
status: closed
sprint: spr_01KZFH96N7BQC1P54W511N83AX
created: 2026-08-07
closed: 2026-08-07
---

# An example built to expose the allocator

## Objective

One small example built to exercise the allocator and nothing else: short-lived actors early that
permanently disappear, durable actors arriving late, overlapping lifetimes forcing several slots,
and enough traffic that visual death is a real question rather than a hypothetical one.

## Acceptance criteria

- Nine actors — one past dragon:18's stated ceiling — with a cast that never exists all at once.
- The early actors occupy the leftmost slots and vacate them, which is exactly the "disposable
  actors stake the best real estate" pathology, left in rather than designed around.
- At least two slots are genuinely reclaimed, and at least one interval pair is *close enough to
  reuse arithmetically but refused by the cooling rule*, so the example documents the cost.
- Small enough to read in one sitting, and honest as a protocol — not a synthetic shape wearing
  service names.
