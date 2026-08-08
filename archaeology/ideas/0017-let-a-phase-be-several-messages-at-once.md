---
id: ide_01KZFF0Y91J05F1KKF6XD4VH7J
sequence: 17
kind: idea
status: parked
created: 2026-08-07
---

# Let a phase be several messages at once

## Problem

Real protocols fan out. A coordinator invalidates three caches at once; a scheduler binds three
pods; a broadcast goes to every replica. The sequential model draws those as three consecutive
messages, which is not what happens and — more to the point — is not what the author meant. There
is currently no way to say "these are simultaneous", and the film says "then, then, then".

`examples/deploy.yaml` has the case in it, undisguised: three `bind orders-… to node-…` messages in
a row that a scheduler issues together.

## Sketch

The spelling is already fairly clear, and it is the one the sprint was told not to build:

```yaml
- parallel:
    - from: coordinator
      to: cache-a
      message: invalidate
    - from: coordinator
      to: cache-b
      message: invalidate
  say: The coordinator broadcasts the invalidation.
```

One `say:` over the whole phase, because a phase is one thing happening.

## Boundaries

**What the sequential implementation says about it, having been built.** Three observations worth
having before anybody starts:

1. **The lowering is easy and the layout is easy.** A phase is one beat and one cue — narrated or
   dwelled, exactly as a step is — and its rows share a `y`. Neither `./beat.ts` nor the cue model
   nor the timeline needs anything new: a beat already covers an interval and already owns the
   stage until the next one. This is the part that looks free, and it probably is.
2. **The camera is the part that is not free.** `stepBounds` frames one pair of lanes widened to a
   minimum span. A phase has *n* pairs, and the union of them is frequently the whole cast — so
   every parallel phase becomes the widest shot in the film, whether or not it deserves to be. The
   hold policy then keeps that shot afterwards, and one broadcast in the middle of a protocol pulls
   the rest of it back to establishing distance. Something has to decide when a fan-out is worth
   a wide shot and when it should be framed on its source, and nothing in the current model has an
   opinion about that.
3. **The reply stack has no answer for it.** decision:37 already withholds the notation on anything
   that does not balance, and a fan-out of three calls answered in an arbitrary order does not
   balance in the sense `readReplies` checks. So parallelism arrives with the reply notation
   already switched off, which is either a relief or a warning depending on whether dragon:17 gets
   resolved first.

**What must not come with it.** A phase is a set, not a control structure. No condition, no guard,
no join semantics, no failure branch, no ordering *within* a phase, and no nesting — the moment a
phase can contain a phase this stops being a notation and becomes a process calculus, which is the
same line `series` holds against loops (decision:33).

## Evidence

Not built, and deliberately not anticipated: nothing in `./protocol.ts`, `./beat.ts` or
`render/protocol.ts` was shaped around the possibility, and no seam was left open for it. If it
turns out to need a different step model, that is a finding rather than a regression.
