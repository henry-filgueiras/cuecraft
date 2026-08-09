---
id: dec_01KZJHJZGFGGK6G0BTFN79SRVQ
sequence: 49
kind: decision
status: accepted
created: 2026-08-08
---

# Let the map keep the tally and the rail keep the order

## Context

decision:47 gave a machine two answers to *how did it get here* and both are **spatial**. The wake
says which edges have been taken and how recently; the `×N` counters say how many times. Together
they are a complete aggregate history, they survive a pause, and sprint:19's frames showed them
working: at the closing overview a viewer can reconstruct the set of things that happened without
narration.

What neither can say, and what no amount of drawing on a map can say, is the **order**. A machine
that goes `Queued → Claimed → Running → Retry wait → Queued → Claimed → Running` draws exactly the
same wake as one that went round the other way, and the counts are identical. Order is not a
property of a place.

sprint:19 half-noticed this and answered it with a readout: the last four *states*, elided from the
left with `…`. Two things are wrong with that and the second is the serious one.

- **A state is not an occurrence.** Two parallel transitions between one pair of states produce the
  same two names, and what fires them is the only thing that tells them apart — which is precisely
  what a list of destinations drops. `examples/leases.yaml` has such a pair and the readout showed
  `Running › Retry wait` for both.
- **`…` is not an answer.** It says something happened and refuses to say what or how much. It is
  the one thing a history may not do, because it looks like an answer and is not one.

## Decision

**Aggregate history and chronological history are different devices with different jobs, and a
machine needs both.**

    on the graph    which edges, and how many times. Spatial, persistent, survives a pause
    in the rail     which occurrences, in what order. Chronological, screen-fixed, survives a pause

The ledger is a rail of transition **occurrences**:

    +8 earlier
     8  downstream returns 429   › Retry wait
     9  backoff expires          › Queued
    10  a worker takes the lease › Claimed

- **An ordinal**, because a repeated transition has to be distinguishable from itself. `claim`
  occurs three times in the leased runner and those are three rows, not one row with a count — the
  count is the graph's job and this is the other one.
- **What fired it**, because that is the transition's identity, and it is what a list of states
  cannot carry.
- **Where it arrived**, because that is what it did.
- **Overflow is a number.** `+6 earlier` is a fact a viewer can act on; an ellipsis is a shrug.
- **The inferred start is a row and is deliberately not shaped like an occurrence** — no ordinal, no
  event, no turnstile. Drawing it as a transition would be inventing one, which decision:46 refuses.

**It is a reservation, not an overlay.** `MACHINE.rail` is taken off the camera's window before
anything is laid out, and the graph layer is clipped to what is left. That makes "no state is ever
under the ledger" an invariant rather than a property of the two machines that exist — and the first
integrated render proved the clip is load-bearing rather than belt-and-braces, because a close shot
put four states and a dozen labels underneath the rail.

**It is neutral, and the accent appears nowhere in it.** decision:47 spent the deck accent entirely
on occupancy, and a rail that used warmth to mean *latest* would put a second warm thing on a frame
whose central claim is that there is exactly one. Age is carried by presence over a ramp that
flattens after three entries — three back and four back are both simply "earlier", which is what the
wake's own decay already assumes.

**It is fitted with foreknowledge, and it degrades by dropping rows rather than shrinking type.**
Every row the film will ever show is known before it starts, so one size is fitted across all of
them (decision:28's rule) — and across the **taken** labels only, which is a real saving rather than
a trick: a sixty-nine character label on a transition the run never takes never appears in the
ledger and has no business setting its measure. When the ladder of sizes runs out the row *count*
gives way. A rail of nine unreadable entries is not more history than four readable ones and a
number saying six more happened.

**It advances during the traversal.** The crossing is the only moment in an occurrence when
something is already moving, so a row arriving then costs nothing, and the stable window after the
arrival stays completely still. That is the phase budget (decision:50) being spent by a second
consumer, which is the first evidence that it is a real decomposition rather than a way of
describing one.

## Consequences

- The paused-frame test gains a fourth question — *which transition occurrence just happened?* — and
  it is answered twice, independently: by the live edge and flare on the map, and by the strongest
  row in the rail. On `examples/leases.yaml`'s frame 1250 the rail says `4 handler exceeds its
  deadline › Retry wait` and `8 downstream returns 429 › Retry wait`, which is the parallel pair
  told apart in a way no drawing of that graph can manage.
- **The counts stay.** They were suspected of being redundant once a chronology existed and they are
  not: the ledger keeps six entries and the counts are on every edge for the whole film, so the
  ledger answers *what just happened* and the counts answer *how often, ever*. Neither survives the
  other's deletion.
- **The rail costs a width-bound machine real legibility and a height-bound one nothing at all**,
  and the arithmetic is exact rather than approximate: a height-bound overview's scale is
  `viewportHeight / machineHeight`, in which the viewport's width does not appear. `elevator` is one
  and `leases` is the other, which is how the width was chosen and checked. See dragon:30.
- Scoped to `circuit`. Whether a transcript wants one is a real question and this does not answer it
  — idea:20's rule, and the same reason.
