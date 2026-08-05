---
id: ide_01KZA2RZJFYJ4GG56JSC43Z2FC
sequence: 2
kind: idea
status: parked
created: 2026-08-05
---

# Additional scene types beyond slides

## Problem

A slide with bullets is one visual vocabulary. Real technical presentations also want terminal
sessions, images, diagrams, charts, and captions. Each is a plausible extension of the same
source-to-projection model, and each arrives with its own scope pressure.

## Sketch

Candidate scene types, roughly in expected-value order: images, terminal recording/replay,
diagrams, charts, generated captions derived from narration text, and WitnessGlass-derived
visualizations of agent sessions.

All share one shape — a scene contributing visual content and a duration to the timeline, with
narration handled uniformly across types.

## Boundaries

Not v0 (decision:2). Parked as one artifact rather than six, because the interesting question is
not which of these to build but whether the scene seam holds once a second type exists at all.
Generated captions are probably the cheapest test of that, since they need no new visual
vocabulary.

Explicitly not designing a plugin system in advance.

## Evidence

Adopt individually, each with its own decision, once a concrete presentation is blocked on it.
