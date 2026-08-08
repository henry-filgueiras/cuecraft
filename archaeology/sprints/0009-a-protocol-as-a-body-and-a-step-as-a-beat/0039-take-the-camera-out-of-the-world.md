---
id: tsk_01KZFC38TY1NF4GHPD5Q6PWMBD
sequence: 39
kind: task
status: closed
sprint: spr_01KZFC13DGXRSF95PKWG894JMA
created: 2026-08-07
closed: 2026-08-07
---

# Take the camera out of the world

## Objective

Move the frame-agnostic camera out of `render/world.ts` into `render/camera.ts`, unchanged, so a
second composition can have a camera without importing a graph layout engine to get one.

This is a move, not a redesign: `Viewport`, `fitTo`, `shotFor`, `composedShot`, `viewRect`,
`marginOf`, `occupancyOf`, `union`, `CameraKey`, `cameraAt`, `paceOf`, `viewportTransform`,
`smootherstep` and the `CAMERA` constants describe *looking at a rectangle*, and none of them
mentions a node, an edge or an entity. `targetBounds`, `chamberFor`, `cameraPlan` and the portal
machinery stay with the world, because they are about worlds.

The question this task answers for the report is whether the atlas's camera was a camera or was
the atlas.

## Acceptance criteria

- `src/render/camera.ts` exists and imports nothing from `world.ts`.
- `world.ts` re-exports what it used to export, so no other module's imports change.
- `paceOf` becomes exported, because a second planner needs the same pacing.
- Every existing camera test passes unchanged.
