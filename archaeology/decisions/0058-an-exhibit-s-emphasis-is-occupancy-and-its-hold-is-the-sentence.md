---
id: dec_01KZKTZ2BYX9WZZ0KRFP7F16B2
sequence: 58
kind: decision
status: accepted
created: 2026-08-09
---

# An exhibit's emphasis is occupancy, and its hold is the sentence

## Context

decision:57 shipped emphasis on a computed picture as a veil over everything but the region being
talked about, driven by `heat` — the transient decision:17 introduced, `ANCHOR_TIMING`'s rise 3,
hold 5, fall 16. Reusing the existing envelope was the right instinct and it produced the wrong
film.

**Every other consumer of `heat` changes the colour of a small thing**: a bullet, a matrix term, a
state plate igniting. This one changes the luminance of two thirds of the frame. At that magnitude
an eight-tenths-of-a-second in and out does not read as emphasis — it reads as a blink. The screen
darkens, a box appears, and it is over before the eye has decided what happened. decision:23's rule
("spend the contrast on the moment") was being applied by a mechanism strong enough to be a *state*
rather than a moment.

Stretching the envelope was tried on paper and makes it worse: two consecutive sentences would then
both be hot, and the veil's opening would cut from one region to the other at full strength.

## Decision

**An exhibit's veil is occupancy, not heat** — decision:47's rule, applied to a picture: persistent,
exclusive, released. One region is in focus at a time, from the frame its sentence lands on until
the narration has moved on.

**The hold is derived from the sentence, not chosen.** An anchor knows its `clipIndex` and every
clip was measured, so how long the chart stays emphasized is how long the sentence about it lasts.
Rewording the narration changes it; there is no constant to set and no key to write. That is
decision:35's move — derive what a duration is worth — applied to a different question.

**An interrupted release is not a release.** Two claims merge into one continuous hold when the
second begins before the veil would have finished settling. Overlapping each claim's own ramps was
tried first and pulses: a fall crossing a rise dips to two thirds at the handover, which is a
smaller version of the artefact being removed. Merging states the intent directly instead of hoping
the arithmetic produces it.

**The opening travels rather than cutting**, over `EXHIBIT.focus.move`. A cut at full veil is a
second flash, and attention moving across a chart is what is actually happening.

What is left behind is unchanged: the quiet accent mark on a region that has been spoken about still
comes from `degree`, and that half of decision:23 stands. **Contrast is spent on the moment; the
moment is just longer than a bullet's, because the moment is a sentence.**

The veil is shallower — 0.66 to 0.55 — because it now persists. What is bearable as a flash is
oppressive for three seconds, and `anchor.ts` requires a recessed thing to stay legible rather than
hidden.

## Consequences

- **Nothing global changed.** `ANCHOR_TIMING` and `WORLD_TIMING` are untouched and every other
  archetype's activation is identical. This lives in `render/exhibit.ts` because it is what *one*
  archetype costs, not a defect in the activation model — a third global envelope would be claiming
  otherwise.
- **A slide's emphasis is now readable from its narration.** How long the chart stays lit is the
  length of the sentence, so an author who wants it held longer says more, which is the only lever
  this format has ever offered and the right one.
- **`heat` is now unused by this archetype.** The exhibit reads `degree` for its mark and derives
  its own envelope for the veil; `anchorStatesFor` is still used, and only half of what it returns.
- **The merge threshold is `fall`.** It is not a separate constant, and that is deliberate: "the
  next claim arrived before the veil finished settling" is the definition, not an approximation of
  one.
- **This partially supersedes decision:57.** Regions, `shows:`, the protocol and the subtractive
  mechanism all stand exactly as recorded; only what drives the veil's strength changed.
