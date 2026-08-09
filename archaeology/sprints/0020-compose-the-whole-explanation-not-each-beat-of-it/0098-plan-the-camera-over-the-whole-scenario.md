---
id: tsk_01KZJDMQNCA3EKGJWV5P5ZSZMS
sequence: 98
kind: task
status: closed
sprint: spr_01KZJDK32M4VSS1AC8R169WAWK
created: 2026-08-08
closed: 2026-08-08
---

# Plan the camera over the whole scenario

## Objective

Plan the camera over the whole scenario, against a named shot vocabulary, with an exact canonical
overview and a deadband that refuses perceptually pointless moves.

## Acceptance criteria

- A shot is one of: the canonical overview, the shot currently held, or a materially closer
  transition-neighbourhood shot. The canonical overview is one exact composition, reused by
  identity.
- The film opens on the canonical overview and finishes on the same one, exactly.
- Candidate selection accounts for containment in the current shot, the scale improvement a local
  shot actually buys, how much of the machine it already contains, clipped topology, travel and
  zoom cost, and what the next occurrences want.
- A move is refused when a near-future occurrence would immediately undo it.
- Hysteresis prevents numerically different but perceptually equivalent frames from triggering a
  move, and the elevator stops taking marginally zoomed, marginally off-centre shots.
- Planning is deterministic and inspectable, and the diagnostic reports why each shot was held or
  taken.
- Tests: overview identity and reuse, marginal shots snapping to overview, deadband suppression,
  determinism, and camera-before-traveller ordering.
