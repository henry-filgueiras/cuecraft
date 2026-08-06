---
id: ide_01KZCAESGYMR32HV9BWKTZG364
sequence: 8
kind: idea
status: parked
created: 2026-08-06
---

# Build decision:3's narration cache for freeze, not for speed

## Problem

decision:3 designed a content-addressed narration cache and every round since has deferred
building it, on the assumption that repeated local synthesis would eventually become the thing
that made iteration painful.

This round was the first with enough narration to test that assumption, and it did not hold.

## Sketch

The measurement, from `examples/cuecraft.yaml` — six slides, twenty-four speech cues, about
sixty-five seconds of speech:

```
synthesis   ~14s      (24 cues, sequential, one resident Kokoro graph)
render      ~29s      (bundle + 2539 frames + encode)
total       ~43s wall
```

Synthesis is **a third of the render**, not a multiple of it. The model is loaded once per
process and generates at roughly five times real time, so the cost that was expected to dominate
is smaller than webpack's. Caching every clip perfectly would take a 43-second iteration to about
30 seconds.

That does not mean decision:3 is wrong. It means the *reason* to build it has changed. The cache
earns its place when narration is promoted to source — `freeze`, the other half of decision:3 —
because then the content address is the identity of an asset a human approved, not an
optimisation. Speed is a side effect of that, not the motive.

## Boundaries

Not a performance problem today, and building it as one would produce the wrong design: a
speed-motivated cache wants to be invisible and evictable, and a freeze-motivated one wants to be
inspectable and durable.

## Evidence

Adopt when `freeze` is built, or when a deck is long enough that synthesis stops being a third of
the render — measured, not assumed. The measurement above is the baseline to compare against.

During this round's five full renders of the self-demo, waiting for narration was never the thing
that slowed iteration down. Waiting for *frames* was, and the answer to that was to stop
re-rendering the whole video and pull stills from the last one instead.
