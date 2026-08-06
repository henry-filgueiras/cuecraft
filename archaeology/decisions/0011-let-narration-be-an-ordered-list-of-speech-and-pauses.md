---
id: dec_01KZC3KAXE1FDMMGCA8QPX15YN
sequence: 11
kind: decision
status: accepted
created: 2026-08-06
---

# Let narration be an ordered list of speech and pauses

## Context

The First Light deck's second slide sounded worse than its first, and the reason turned out to be
three separate things, only one of which was technical.

The text was:

> WitnessGlass turns that invisible work into structured events that can be inspected after the
> session.

Measuring the rendered WAV's silence structure and mapping the gaps back onto the text by
speaking rate puts Kokoro's two internal breaks at:

    "WitnessGlass turns that | invisible work into structured events tha | t can be inspected..."

The first break splits a determiner from its noun phrase. That is not a phrase boundary; it is
the model guessing, and guessing wrong, because there was nothing to guide it — the sentence has
fifteen words, two different `that`s doing two different jobs, a passive relative clause, and
exactly one piece of punctuation, at the very end. eSpeak's phonemization is fine
(`WitnessGlass` correctly becomes `wˈɪtnəs ɡlˈæs`); the prose is what was wrong.

The structural problem is separate. One `generate()` call produces one intonation contour. A
fifteen-word sentence has to be held under a single declarative arc, so its tail has nowhere to
go but flat. Slide one, with two sentences and a comma, got three punctuation-driven boundaries
and sounded better for it.

Reading kokoro-js's source turned up a mechanism neither decision:8 nor dragon:3 recorded
correctly. Both describe `style` as "a 256-float voice tensor, selected by name". It is not.
`af_heart.bin` is 522,240 bytes, which is 510 x 256 x 4, and the runtime selects a slice by
**token count**:

    const offset = 256 * Math.min(Math.max(tokenCount - 2, 0), 509);

Each voice is a table of 510 style vectors, one per utterance length, and the length of what you
ask for changes which prosody embedding you get. Measured, the effect on speaking rate between a
68-token and a 132-token utterance is small — the same sentence occupies 3.64s alone and 3.68s
inside a longer call — but the mechanism is real and it is the reason splitting an utterance is
not merely a way of inserting silence.

## Decision

`say` accepts an ordered list of **narration cues** instead of only a string:

```yaml
say:
  - "WitnessGlass records every tool call as a structured event."
  - pause: 300ms
  - "Which tool ran, how long it took, and what came back."
```

A cue is exactly one of two things: prose to speak, or `{ pause: <duration> }`. A scalar `say`
remains valid and means one speech cue, so every deck written before this still renders.

Each speech cue is its own synthesis call and its own clip. Clips are placed on Remotion's
timeline at frames the compiler computed; pauses are the gaps between them. Nothing is mixed or
concatenated here — decision:5 gives that to Remotion, and it does it.

Narration duration is speech plus authored pauses, measured end to end, and still drives slide
timing exactly as before. Clip positions accumulate in whole frames rather than being converted
from seconds independently, because `ceil(a) + ceil(b)` can exceed `ceil(a + b)` and would let a
clip start a frame before the previous one ended.

**What is deliberately absent**: emphasis, intonation, rate, pitch, style, and any inline markup.
Kokoro cannot honour any of them (dragon:3), and a control that silently does nothing is worse
than no control. decision:6 rejected a bespoke prosody dialect and this does not build one — there
is no syntax inside the prose, and a cue list is a YAML list.

## Consequences

- Splitting a `say` genuinely changes delivery rather than only spacing it: each cue gets a
  complete intonation contour, ending in a real declarative fall. Measured, every cue in the
  reworked deck ends with 460-480ms of natural decay.
- **Authored pauses compose with Kokoro's own edge silence.** Every generated clip carries about
  300ms of leading and 460-480ms of trailing silence. Two cues with no pause between them already
  sit about 780ms apart; `pause: 400ms` yields nearer 1.2s of real silence. The authored number is
  therefore *additional* silence between clips, not total silence, and small values go a long way.
  Trimming the edges would mean processing audio here, which decision:5 says we do not do.
- Punctuation remains Kokoro's real phrasing interface. Every internal break in the reworked
  narration lands on a comma. Commas and full stops inside a cue are as load-bearing as the cue
  boundaries themselves.
- Prose is still the largest lever. The bad break in the original survived being split into its
  own sentence, because it was caused by the wording. No amount of structure rescues a sentence
  that is hard to say.
- More synthesis calls per deck, each cheap. The absent cache (decision:3, dragon:1) now has more
  to cache, and the natural cache key is a cue rather than a slide.
- Cue text still passes through the 420-character guard individually, which makes the guard easier
  to live with rather than resolving it. dragon:3 stays open.
