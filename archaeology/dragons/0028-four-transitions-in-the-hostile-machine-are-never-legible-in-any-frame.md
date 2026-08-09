---
id: drg_01KZJBFQ8D8F5AQHJV0296A802
sequence: 28
kind: dragon
status: open
created: 2026-08-08
---

# Four transitions in the hostile machine are never legible in any frame

## Context

`examples/leases.yaml` lays out at 3840 by 1332 world units. Fitted to the overview that is a state
name at 23 screen pixels — legible, just — and an **event label at 16**, which is not. So the
closing shot of the adversarial film shows the shape of the machine and the names of its states,
and none of the sentences on its edges can be read.

That is arguably correct: an overview is about shape, and the film has already shown every event
label the run touched at 23 to 36 pixels in its own shot. But four of the fourteen transitions are
never taken, which means **four labels in that film are never legible in any frame** — and those
four are exactly the "what else could happen" the composition claims to answer.

The machine is wide because it is a hub: six transitions leave `Running`, each to a different
state, and a rank has to hold all of them side by side. Nothing about the layout is wasteful.

## Question

What is the honest ceiling on a machine's *width*, expressed as something an author can check
before they write it — and what should happen when a machine exceeds it?

## Constraints

The transcript hit the same wall from the other side (dragon:18) and answered it with a rail: chrome
that names the parties the shot has cut off. A machine cannot do that, because what has been cut off
is not a party but a *sentence on an edge*, and the rail would be a list of sentences.

Shrinking the type is not available: `MACHINE.widest` is already derived from where a state name
stops being readable, and the overview is exempt from it precisely because the overview is the shot
that cannot be arrived at by moving closer.

Rendering the overview at a *smaller* label size and letting the untaken labels appear only in a
shot that visits them would mean the camera visiting states the run never enters, which is a camera
telling a story the scenario did not.

## Candidate direction

## Resolution criteria

Close as **inherent** if the answer is that a machine wider than about eight legible states cannot
be explained whole and the format should say so — in which case the ceiling belongs in the
documentation next to the grammar, not in a policy. Close as **fixable** if a treatment is found
that keeps untaken possibility readable in a wide overview without either shrinking the type or
sending the camera somewhere the run never went.
