---
id: ide_01KZC3N0RKKXD5255QGTR49DKR
sequence: 7
kind: idea
status: parked
created: 2026-08-06
---

# Model-directed layout selection

## Problem

decision:10 selects compositions with three integer thresholds calibrated against one deck. They
are guesses. A model could look at the actual content — what the slide is about, whether the
bullets are parallel, whether one is the point and the rest are support — and choose better.

## Sketch

An inference step between content and archetype, proposing a composition (and possibly a
rewrite of the bullets to fit it) with the deterministic rules as fallback.

## Boundaries

This is the single most tempting way to ruin the project.

- A render would stop being reproducible. The same source would compile to different video, which
  contradicts decision:1's whole premise.
- It reintroduces a metered, credentialed, network-dependent step into the inner loop, which
  decision:8 spent a sprint removing.
- It hides the design language rather than developing it. Bad heuristics are visible and cheap to
  fix; a model's taste is neither.

If it is ever built it belongs at authoring time — a command that suggests an edit to the YAML,
which a human accepts and commits — never inside `render`.

## Evidence

Adopt only if the deterministic rules demonstrably cannot express a distinction that matters, and
only as an authoring aid whose output is source the author reviews.
