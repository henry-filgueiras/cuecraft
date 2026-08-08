---
id: tsk_01KZFHACWACEM0828B3PZWPCZ6
sequence: 46
kind: task
status: closed
sprint: spr_01KZFH96N7BQC1P54W511N83AX
created: 2026-08-07
closed: 2026-08-07
---

# Derive actor lifetimes and allocate physical slots

## Objective

One pure pass: authored protocol in, `actor -> physical slot` out. Derive `first_use`/`last_use`
per actor, therefore a live interval, and colour the interval graph greedily under a stated
reclamation rule. No geometry, no Remotion, no camera.

## Acceptance criteria

- `lifetimesOf(steps)` gives every actor a `first`/`last` step index. Every declared actor is used
  (the parser already guarantees it), so there is no empty interval to reason about.
- `allocateLanes(actors, steps)` returns, for each actor, one slot index; plus the tenancy list per
  slot in time order, the peak count of simultaneously live actors, and the reuse count.
- Slots are assigned in *arrival* order — `first` ascending, declaration order breaking ties — and
  each actor takes the lowest-numbered slot it may. Nothing is sorted by lifetime length.
- Reclamation requires strict semantic non-overlap **and** a cooling distance stated in rows and
  taken from a constant that already means "how far back a shot can see". A slot whose previous
  tenant's traffic could still share a frame with the newcomer's is not free.
- Tests: overlapping actors never share a slot; a protocol with no reusable interval allocates one
  slot per actor in declaration order (the `tap` shape); a protocol with a wide enough gap does
  reuse; the result is identical across repeated runs; adding an actor that changes nothing about
  the traffic does not move any other actor.
- Reported peak live count is the interval graph's clique number, so the distance between it and
  the slot count is readable as the cost of the cooling rule.
