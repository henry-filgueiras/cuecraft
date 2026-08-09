---
id: ide_01KZKKBD26A4KK8DK9P700S2HB
sequence: 21
kind: idea
status: parked
created: 2026-08-09
---

# Show elision stubs on only some plates

## Problem

A reduced slide marks every plate that lost edges. On `examples/leases-narrated.yaml` that is 2 of 6
plates for outgoing and 1 for incoming, with three carrying nothing — a density at which the marks
read as footnotes. But that density is a property of *this* machine and *this* run. A scenario that
grazes many states shallowly would mark nearly every plate, and at that point the marks stop
distinguishing anything: the same failure `MACHINE.railRows` guards against in the ledger, where
nine unreadable entries are not more history than four readable ones.

## Sketch

Show stubs on only some of the plates that lost edges. Two candidates, both named before sprint:23
rendered anything:

- **entry and terminal states only** — mark where the run enters and where it stops, on the theory
  that those are the boundaries a viewer questions, and intermediate states are read as
  pass-through;
- **a threshold** — mark only a plate that lost more than one edge, or more than some fraction of
  its declared degree.

## Boundaries

Not built, because the frames did not ask for it. A policy that thinned the notation further would
be removing information nobody complained about, and sprint:23's non-goals refused guessing at a
second policy in advance for exactly that reason.

Whatever comes back must still be a count and never a list (dragon:18), must stay out of the accent,
and must not become a per-machine tuning knob — the point of a policy is that it is one rule for
every machine.

## Evidence

What would bring it back is a specimen where a reduction marks most of its plates, and a **rendered
frame** showing the result is noise. Not an argument that it might be.

Recorded so that round starts from a list rather than from scratch — and so the *entry and terminal*
candidate is remembered as something proposed before the evidence existed, rather than invented
afterwards to fit it.
