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

**Partly settled by decision:9.** Sprint 2 built the pipeline and rendered a two-slide deck, which
answered the structural half of this dragon:

- The shape is `read -> parse -> synthesize -> time -> render`, with a small compiled
  presentation in between. It is not the IR of idea:3, which stays parked.
- The rounding rule lives in one function, `framesFor()`, and is "a duration occupies every frame
  it touches". Scene lengths are integers computed independently, so scene starts are exact prefix
  sums and there is no fractional residue to accumulate.
- Phase two is pure given its input, so visual iteration re-renders without re-synthesizing.
- A renderer *can* silently alter derived timing, which was not anticipated: Remotion's
  `TransitionSeries` shortens the video by each transition's length. decision:9 forbids it — the
  timeline is the authority, and `renderPresentation` asserts the composition agrees with it.

Two things remain open, and they are the same thing seen from two sides.

**Incrementality.** There is still no cache. Every render synthesizes every `say` from scratch.
Local Kokoro made that cheap enough not to hurt — about a second per slide, against roughly seven
seconds to encode — so the pressure decision:3 anticipated never arrived on this fixture. It will
arrive on a deck of thirty slides, and it arrives immediately for any remote provider.

**Inspectability.** The compiled presentation exists as a value and is never written down. There
is no way to look at what the compiler derived without rendering, and no way to hand phase two a
timeline that phase one produced earlier.

## Question

What makes the compile incremental — and is a durable, inspectable compiled artifact the same
answer, or a different one?

## Constraints

- Duration must come from the actual audio, not an estimate. A wrong estimate desynchronizes
  narration from slide changes, and the error accumulates.
- A cache key must be derived from everything that determines the audio, explicitly and stably
  (decision:3). With local synthesis the inputs are provider, model revision, voice, speed, and
  text — Kokoro has no others (dragon:3).
- Local synthesis is free and offline (decision:8), which weakens the original economic argument
  for caching and leaves determinism and remote providers as the motivation.
- Narration resolution must stay ordered: frozen asset, else cache, else synthesize (decision:3),
  even though `freeze` does not exist yet (dragon:2).
- Whatever is written down must be a projection, not a second source of truth. A timeline file
  that can be hand-edited would make timing authorable, which decision:1 exists to prevent.

## Candidate direction

Content-address each narration artifact by its synthesis inputs and keep it under
`.cuecraft/`, so a re-render of an unchanged deck reuses audio and an edited `say` misses. That
is decision:3's cache, finally built, and it also gives the compiled presentation a natural
place to be serialized beside it — inspectable, deletable, and regenerable from source.

Worth resisting until a real deck is slow. The current implementation clears narration at the
start of every render precisely because it cannot tell a stale take from a current one; the cache
key is what would make that distinction possible, and building it before the key is right would
be worse than re-synthesizing.

## Resolution criteria

Resolved when an unchanged re-render performs zero synthesis calls, an edited `say` re-synthesizes
only its own slide, and the cache key derivation is documented and covered by tests that do not
require the model.

Structural resolution is already recorded in decision:9 and is not what remains.
