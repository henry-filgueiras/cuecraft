---
id: drg_01KZA2RZJP5DB5EMFNZXMYM6RY
sequence: 1
kind: dragon
status: open
created: 2026-08-05
---

# Narration must be synthesized before video timing can be known

## Context

Slide duration derives from narration:
`max(minimum slide duration, pre_say + narration duration + post_say)` (decision:1).

Remotion needs each composition's duration in frames before it renders anything. So the render is
strictly downstream of synthesis: every `say` must be synthesized and measured before a single
frame exists.

## Question

What is the shape of the compile pipeline given this ordering constraint, and how much of it can
be made fast, incremental, and independently inspectable?

## Constraints

- Duration must come from the actual audio, not an estimate. A wrong estimate desynchronizes
  narration from slide changes, and the error accumulates.
- Synthesis is network-bound and paid, so a cold first render of a long deck is unavoidably slow.
  Caching mitigates repeat renders but does nothing for the first one (decision:3).
- Frame counts are integers; durations are not. The rounding rule must be defined once and
  applied consistently, or audio drifts against slides over a long deck.
- Iterating on visual design must not require re-synthesizing narration.

## Candidate direction

A two-phase compile:

1. **Resolve narration** — frozen asset, else cache, else synthesize — and measure durations,
   producing a fully-timed scene list.
2. **Render** from that timed list.

Phase one is cache-friendly and inspectable on its own; phase two is pure given its input, which
is what makes visual iteration cheap. The timed list is exactly the surface parked as an IR in
idea:3.

## Resolution criteria

Resolved when v0 renders a multi-slide deck with narration audibly aligned to slide changes, an
unchanged re-render performs zero synthesis calls, and the rounding rule lives in exactly one
place in the code.
