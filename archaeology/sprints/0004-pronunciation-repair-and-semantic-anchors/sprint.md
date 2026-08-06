---
id: spr_01KZC58217DD56XN7FZ221N7EF
sequence: 4
kind: sprint
status: closed
created: 2026-08-06
closed: 2026-08-06
---

# Pronunciation repair and semantic anchors

## Goal

Two things, one small and one speculative.

1. **Repair a mispronunciation.** "WitnessGlass records the work" says *REK-erdz*, the noun.
   Find out where that comes from before deciding what to do about it, and fix it with the
   smallest honest mechanism that exists.
2. **Probe semantic synchronization.** Let an author state that a moment in narration and an
   element on the slide are the same idea, and let cuecraft work out when that happens. No
   timestamps, no frame numbers, no animation commands in the source.

## Rationale

The pronunciation defect is worth more than the annoyance it causes: it is the first time the
narration path has been wrong in a way that has nothing to do with prosody, and the diagnosis
tells us something about which layer we can actually influence.

The synchronization question is the real subject. Every presentation tool that animates on
narration does it by timestamp, which makes the source unmaintainable — reword a sentence and
every number after it is wrong. cuecraft already has something better available: decision:11
made narration an ordered list of separately-measured fragments, so the compiler already knows
exactly when each fragment begins. If an author can name the relationship instead of the time,
the timestamps stop existing.

That is worth probing precisely because it may not be worth keeping. A cue boundary is a coarse
instrument, and cuecraft may not be able to do better without machinery it should not have.

## Success criteria

- The root cause of the mispronunciation is established from evidence rather than assumed, and
  recorded.
- Whatever upstream override mechanisms exist are found and evaluated before anything is built.
- An author can repair one occurrence without a global dictionary and without disfiguring prose.
- A slide element can carry a semantic identity, and a narration cue can say it reaches it.
- Activation time is derived from measured audio, never authored and never estimated from text.
- Anchors are validated statically: unknown reference, duplicate identity, malformed name.
- Emphasis accumulates, so the slide builds rather than flashes.
- The compiled representation keeps the link as a relationship, not as an animation command.
- Slides without anchors are unaffected; narration is never clipped; scenes never advance early.

## Non-goals

Forced alignment, any second model, word-level synchronization, an animation DSL, arbitrary graph
relationships, a pronunciation dictionary system, interactive playback, captions, and the
generalized IR.

The working nickname for the synchronization idea is *triggered wormholes*. It is not proposed as
API vocabulary and should survive here rather than in the source format.
