---
id: tsk_01KZFC38V63Y4RX4TJMGX5TQDP
sequence: 41
kind: task
status: closed
sprint: spr_01KZFC13DGXRSF95PKWG894JMA
created: 2026-08-07
closed: 2026-08-07
---

# The transcript composition, and its choreography

## Objective

The composition. A protocol drawn as a place the camera moves through, with a choreography derived
from the beats.

The visual policy this task is defending:

- what has not happened yet is not drawn, because a message that has not been sent is a spoiler
  rather than context — the same rule `targetBounds` already applies to relations;
- history stays, and decays to a legible floor, so causality survives without competing;
- the active transition is the brightest thing on the frame and is the only thing that moves;
- an actor's name is reachable at all times, including once the actor row has scrolled off.

## Acceptance criteria

- A `transcript` archetype, in the composition switch, drawn bleed like the atlas.
- A camera plan built on `render/camera.ts`, holding on repeated traffic and travelling on migrating
  attention, with the active step framed together with enough recent history to read the causality.
- The actor identity is available at every moment of the film.
- Everything in the composition derives from the body, the beats and the camera. No constant in it
  names an example.
- Choreography tests: hold on A-B-A-B, travel on A-B-C, and the shot containing both endpoints of
  every step.
