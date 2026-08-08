---
id: dec_01KZFEE6AF2SCB1HA6VD0JREN5
sequence: 36
kind: decision
status: accepted
created: 2026-08-07
---

# Take the camera out of the world

## Context

The atlas's camera was written as part of the atlas, in `render/world.ts`, next to dagre. That was
right at the time: there was one composition larger than the frame, and everything the camera knew
was about a world. decision:24's hold policy, decision:29's composed arrival, `interpolateZoom`'s
path and the pacing that follows from it were all measured against worlds and lived among nodes and
edges.

A protocol needs every one of those and has no graph to offer. It has lanes and rows.

## Decision

**Split the camera from the space it was looking at.**

`render/camera.ts` holds everything about *looking at a rectangle* and mentions no node, edge or
entity:

```
bounds + world       ->  a viewport that frames it        fitTo
current + bounds     ->  hold, pan, or recompose          shotFor
current + subject    ->  hold, or arrive properly         composedShot
two viewports        ->  how long the move should take    paceOf
keys + frame         ->  where the camera is now          cameraAt
viewport + frame     ->  one CSS transform                viewportTransform
```

`render/world.ts` keeps everything that mentions a node: `targetBounds`, `chamberFor`, the portal
machinery, and `cameraPlan`, which walks a graph traversal. It re-exports the moved names, so no
other module's imports changed and the history of what used to live there stays legible.

A second composition then writes its own planner — `transcriptPlan`, about forty lines — and reuses
every primitive.

## Consequences

- **decision:24 turned out to be about frames, not about worlds.** Repeated traffic between two
  lanes of a protocol holds the shot, and no rule was written to make that happen: the second
  message is already well inside the frame the first one produced, so `shotFor` declines. Writing a
  transcript-specific "do not bounce" rule would have been writing the same rule twice. That is the
  strongest single piece of evidence this round produced about which of cuecraft's abstractions are
  real.
- Two defaults did **not** transfer, and both were given options rather than being changed:
  `CAMERA.pad` and `CAMERA.widest` were measured against a subject that is a *plate in an open
  field*, and a protocol's subject is a *band* that already carries its own margins. Padding it
  again spent about a quarter of every frame. `shotFor` now takes an optional pad and widest; the
  hold and pan tests are untouched, because they are fractions of the frame actually being held and
  know nothing about how it was arrived at.
- What did **not** move is as informative. `targetBounds` — "frame the thing plus as much
  established context as fits" — reads like a general rule and is not: it is about *neighbours in a
  graph*. The transcript's equivalent question ("how much of the cast, and how much history") has a
  completely different answer, and putting both behind one signature would have produced a
  parameter nobody could name.
- The split is a boundary, not an abstraction: nothing was made generic, nothing gained a strategy
  object, and the two planners share no control flow. If a third composition wants a camera, the
  test of whether this was right is whether it also writes forty lines and reuses the rest.
