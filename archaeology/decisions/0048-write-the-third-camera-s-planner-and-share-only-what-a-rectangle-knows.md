---
id: dec_01KZJBE8ERAAEW9DJCADNMKEJF
sequence: 48
kind: decision
status: accepted
created: 2026-08-08
---

# Write the third camera's planner, and share only what a rectangle knows

## Context

decision:36 split the camera out of the world and set an explicit test for it: *if a third
composition wants a camera, the test of whether this was right is whether it also writes forty
lines and reuses the rest.* A machine is the third composition. It is also the first one that is a
**graph** like the atlas rather than a band like the transcript, which makes it the harder test —
the temptation is not to duplicate `camera.ts` but to reach for `world.ts`.

dagre is also under test. `layoutWorld` uses it in the easiest mode available: a simple digraph of
unlabelled edges, in which cycles are permitted and the one shipped artifact has none. dragon:8's
first reason for doubt was that two dependencies had been bought for one composition. A state
machine is the hard input — cycles by definition, backward edges, parallel transitions between one
pair, required labels of wildly unequal length, self-loops, and a high-degree hub.

## Decision

**A machine writes its own layout and its own planner, reuses every primitive that is about
rectangles or polylines, and shares nothing that mentions a domain.**

    reused unchanged     fitTo, shotFor, composedShot, paceOf, cameraAt, viewportTransform,
                         union, fitWidth, centreOf, distance          (./camera.ts)
    moved, then reused   smoothPath, polylineLength, exitPoint, trimToBoxes, pointAlong
                         (./polyline.ts, out of ./world.ts, re-exported)
    written fresh        layoutMachine, occurrenceBounds, machinePlan, runProgress   (~sixty lines
                         of planner and the same again of layout)

What was **not** shared is the informative half. `targetBounds` frames a hot entity plus its
*established* neighbours, and it is wrong here twice: a machine has no notion of established, and
the subject of a shot is not a node but an **edge and the two nodes it joins**. `wrapLabel` is
right for a card and wrong for a pill and for a line of running text, and the difference is two
constants — which is a reason to write the ten-line search again, not to thread a `plateAspect`
parameter through a call site that reads it from a token anyway.

Three findings came out of building it, and all three were measured rather than reasoned.

**1. Top to bottom, and the frame decided it.** A world is laid out left to right because a
transformation reads along the axis text does. Inheriting that was the obvious move and it is
wrong: laid out left to right, the elevator — six states in a cycle — comes out **10:1**, because a
chain of `n` states with labelled edges spends `2n − 1` ranks on its own length. Fitted to a 16:9
overview that is a state name at **18.6 screen pixels**, under the legibility floor, in the one
shot that has to show the whole machine. Top to bottom the same machine is 0.9:1 and the same name
is 33 pixels. The adversarial specimen is a hub rather than a chain and is unmoved either way —
21.8 against 22.8 — because a hub fans wide whichever axis it fans along. So a chain pays
enormously and a hub pays nothing, and the surviving direction is the one every statechart is drawn
in anyway. Rank is still not progress: dagre's greedy pass broke the cycles to get one, and the
edges it reversed route visibly the long way round.

**2. Three quarters of dagre transfers, and the quarter that does not is cheaper to draw.**
Multigraph with an edge name per transition gives parallel transitions two routes and two label
boxes. Giving each edge the size of its wrapped label makes dagre reserve a rank for it, which is
what keeps a sixty-five character label off everything else. Cycles are the feedback-arc pass, and
its answer is right. **Self-edges are not**: what dagre draws is a crossed ribbon that reads as a
routing bug. So the loop is drawn by hand and only the *room* for it goes through dagre, as extra
width on the state's box — which is a collision policy that actually holds, because the space is
space no rank can be given. Under a top-down layout that room has to be beside the state and not
above it: above is where its incoming edges arrive.

**3. A shot wide enough to read a state is not wide enough to read an event.** The first version
used one `widest` for everything, and arriving at the leased runner's six-exit hub all five of its
alternatives fitted inside it — so the shot that was about one transition silently became the
overview an act early, at seventeen pixels a word. There are now two numbers: `widest`, derived
from a state's name, caps any shot; `context`, derived from an event label, caps what may be
*added* to one. The essential subject — source, route, label, destination — is exempt from the
second, because a long back edge legitimately needs a wide shot and cropping one would put the
traversal off the frame.

**Two rules the planner has that the other two do not**, and both earn their place:

- **The overview is not a shot the run may hold.** It contains every later subject comfortably, so
  the hold policy would keep it for the whole film. The first occurrence composes properly and
  every one after it is decided against *that*. The transcript learned this on its first render;
  this is the same lesson arriving a second time, which suggests it belongs to establishing shots
  in general rather than to either space.
- **A move lands before the traversal, not on it.** `MACHINE.lead` is the one genuinely new camera
  constant, and it is not a framing rule — a camera still settling while a traveller crosses an
  edge produces two motions the eye has to separate, and it separates them badly.

**And one rule that was not written, which is the actual result.** A run that stays in one
neighbourhood — a hub taking its self-loop four times, a pair of states bouncing — emits no camera
keys at all after the first, because each occurrence is already well inside the shot the last one
produced. decision:24's hold policy was measured against a world, transferred to a protocol
untouched, and has now transferred to a graph with cycles in it untouched again. Writing a "do not
bounce on a revisit" rule would have been writing the same rule a third time.

## Consequences

- **decision:36's test passes**, on the composition most likely to have failed it. The planner is
  sixty lines and shares no control flow with either of the others; nothing was made generic;
  nothing gained a strategy object. The split is still a boundary rather than an abstraction.
- **`./polyline.ts` is decision:36's rule applied a second time**: the geometry moved when a second
  caller demonstrated it was shared, not in anticipation, and `world.ts` re-exports so no importer
  changed and the history of what used to live there stays legible.
- **dagre now has a second caller on strictly harder input.** dragon:8's cheapest objection is gone;
  its actual question, about worlds, is untouched.
- **The chrome band is a real cost, paid for an invariant.** The composition's title and readout
  live in screen space over a bleeding frame, and the first render printed the title across the
  first transition's label. decision:26's answer for the atlas — fade the caption by how much of the
  world is on screen — does not transfer, because a machine's chrome is most necessary exactly when
  the whole machine is on screen. So the camera is handed a viewport that stops short of the chrome,
  which is `useSubtitleBand`'s trick at the other end of the frame. A tall machine's shots come out
  about a third wider and a wide one's are untouched. What it buys is that no machine, however it
  lays out, can put a state under the chrome.
- The layout is a pure function of the topology and a test permutes, reverses, empties and doubles
  the scenario to say so. That is the composition's one claim on a viewer and the only property in
  the module that is not allowed to be renegotiated by a rendered minute.
