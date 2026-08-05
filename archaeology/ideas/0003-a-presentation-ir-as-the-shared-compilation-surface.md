---
id: ide_01KZA2RZJKFEGD9N7R2F69GA4A
sequence: 3
kind: idea
status: parked
created: 2026-08-05
---

# A presentation IR as the shared compilation surface

## Problem

v0 can reasonably go straight from parsed YAML to Remotion components. As scene types multiply
(idea:1, idea:2) and output targets diversify, that direct path becomes many-to-many: every
scene type would need to know about every output concern — visual, audio, and timing.

## Sketch

An explicit intermediate representation between source and render:

    semantic presentation source
              |
              v
       presentation IR
        /      |      \
     visual   audio   timing
        \      |      /
             render

The IR is a resolved, fully-timed scene list: defaults applied, narration resolved to concrete
audio with measured durations, and every scene's start and duration computed. Renderers consume
the IR; scene types produce into it.

## Boundaries

Not a v0 deliverable. An IR designed before there are two scene types will simply encode the
assumptions of the one that exists.

The seam to preserve now: keep timing resolution separate from React components, so that the
timed scene list can be *named* later without restructuring the compiler. dragon:1 arrives at
the same surface from the timing direction.

## Evidence

Adopt when a second scene type (idea:1, idea:2) or a second output target makes the direct path
visibly awkward.
