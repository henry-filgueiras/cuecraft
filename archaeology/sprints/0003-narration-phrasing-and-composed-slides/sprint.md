---
id: spr_01KZC2QHEAGF95JM6BR7PCSP02
sequence: 3
kind: sprint
status: closed
created: 2026-08-06
closed: 2026-08-06
---

# Narration phrasing and composed slides

## Goal

Make `out/witnessglass.mp4` worth showing someone. Two specific weaknesses in the First Light
artifact, and nothing else:

1. **Narration delivery.** The second slide reads as one flat run-on. Give authors deliberate
   control over phrase boundaries and silence.
2. **Slide composition.** The frames are clean and empty — a styled bullet template using a
   third of a 1920x1080 canvas. Make slides that look designed.

The pipeline itself works and is not the subject of this sprint.

## Rationale

sprint:2 answered "can this produce a video at all". The answer was yes, which makes the next
question the only one that matters: is the video any good? That is not answerable from
archaeology — it needed something to watch, and now there is something to watch.

Both weaknesses point at the same gap. The source expresses semantics — a title, some bullets,
some words to say — and the compiler currently maps each one to exactly one presentation
mechanically. A title becomes a heading. A bullet becomes a list row. A `say` becomes one
opaque call to Kokoro. Nowhere does anything make a *presentational* decision.

The bet is that a small amount of structure on the authoring side, plus opinionated choices on
the rendering side, buys most of the distance to "designed" without turning cuecraft into either
a markup dialect or a layout engine.

## Success criteria

- `say` accepts an ordered list of narration cues — speech and explicit pauses — and a bare
  scalar `say` still works unchanged as one speech cue.
- Cues are separate Kokoro calls placed on the Remotion timeline; no WAV bytes are concatenated
  by hand.
- Narration total duration is measured, includes authored pauses, and still drives slide timing.
- Three or four curated composition archetypes exist, chosen deterministically from the shape of
  the content — bullet count, bullet length, title length. No coordinates, sizes, or layout names
  in the YAML.
- A deliberate typographic scale lives in code, and content is sized to be read from across a
  room rather than from a laptop.
- The canonical example exercises at least two archetypes and sounds noticeably more deliberate.
- Normal tests stay fast and invoke neither Kokoro nor Chromium.

## Non-goals

SSML, emphasis or intonation tags Kokoro cannot honour, word-level synchronization, remote
inference of any kind, images, diagrams, a layout constraint solver, author-controlled geometry,
a public layout API, themes, a general animation DSL, captions, `freeze`, and TTS caching.

The layout machinery stays internal. We are learning what works, not publishing an interface.
