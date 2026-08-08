---
id: dec_01KZHNQZAS9QV3TFDDY6NPXM5W
sequence: 41
kind: decision
status: accepted
created: 2026-08-08
---

# Reserve the narration's second row, and mark it when nobody signed

## Context

decision:40 shipped a subtitle and two specimens immediately disagreed about it.

`examples/aside.yaml` was pleasant. A small tracked uppercase name in the narrator's colour, the
sentence under it, and the eye reads the pair as *one component in a register the slide is not
using*. `examples/witnessglass.yaml` was not. On the `index` slide, "what it returned," sat at the
same left edge, in the same weight and near enough the same size as the four list rows above it,
directly beneath the list's own closing hairline — a fifth row of the list, with the number missing.

The obvious reading of that difference is "speaker names are good", and it is wrong. What the named
form actually bought was **two typographic registers stacked into one block**: a short mark in a
colour nothing near it was using, then prose. Identity was the *content* of the upper register, not
the reason it worked. decision:40 charged that register only to a deck that changed speaker
(`labelled`), so the band's height — and therefore the row a sentence landed on — became a function
of whether a cast happened to exist. Two films of the same deck, one of which handed over once, put
their narration on different rows.

sprint:13 rendered the alternatives rather than arguing about them: a stable bottom scrim, the
metadata row reserved and left empty, and the row reserved and marked, against `witnessglass`,
`aside` and `tap`.

## Decision

**The metadata row is unconditional.** `subtitleBand` reserves it for every subtitled deck, so a
subtitle occupies the same slot in every film cuecraft renders, and `subtitleFit` no longer reports
whether anybody was named — the fit is a fact about the sentences, which is all it was ever
measuring.

**What the row holds varies; that it is there does not.** A film that changes speaker puts the
narrator's declared name in it, in their colour, exactly as before. A film that does not puts the
deck's own opening mark in it: the 88x6 accent bar `Rule` draws at the top of every slide, saying
the one thing that remains true when nobody was named — *a block begins here*.

The mark is deliberately not an identity. No "NARRATOR", no deck title, no voice id. decision:40
forbade the subtitle layer from inventing facts about the film and a stand-in name is exactly that;
a mark that marks a beginning invents nothing, and it is already in the vocabulary.

**There is no scrim**, and the reason is structural rather than a matter of taste. A bottom-anchored
ramp to `rgba(10, 13, 18, 0.55)` was built and measured: it moved the darkest pixel beneath it by
*one level*, on `witnessglass` and on `tap`'s lit transcript world alike. `COLORS.ink` is already
the darkest thing cuecraft ever puts on a frame, so a darkening scrim is ink painted over ink and
there is nothing below it to darken toward. A lightening one is visible and looks like a smudge on
the lens against a background that is flat by decision. decision:40 rejected a scrim on inherited
banding evidence; this round rejected it on its own measurement, for a better reason.

## Consequences

- **A single-narrator subtitle stops reading as slide content.** The mark is the only accent-coloured
  object at the frame's left margin below the composition, and it is in the same place on every
  frame of every film, which is what the previous treatment had no way to say.
- **A camera makes the point for free.** On `tap` the transcript world pans under a stationary mark
  and a stationary sentence. The narration reads as HUD *because* everything else moves — the
  clearest evidence the round produced, and it required no change to `render/camera.ts`.
- **Named narration is untouched.** `aside` renders byte-identical to before, frame for frame. The
  round cost the pleasant specimen nothing, which was its condition for touching the other one.
- **Every unlabelled subtitled deck's composition gives up one more row** (`SUBTITLE.labelGap` plus
  the label's line box, 41px). `witnessglass` absorbs it on all four archetypes. dragon:7's
  height-bound specimens are in decks that do not ask for subtitles, so nothing there moved.
- **The mark comes and goes with its cue**, because it is part of the cue rather than frame
  furniture. A slide with nothing being said shows nothing, which is decision:40's rule about
  `subtitleAt` returning nothing rather than the most recent thing, applied to the whole component.
- **dragon:21 is unchanged.** `atlas` and `transcript` still overlay, and the band the overlay
  occupies is now one row taller. Watched on `tap`, that is still field rather than content.

### What was rendered and rejected

- **A hairline above the narration.** The deck's other structural device, and wrong here for the
  specific reason the defect exists: `index` already draws hairlines between its rows, so a rule
  above the subtitle is one more of them and makes the "fifth row" reading *stronger*, not weaker.
- **Reserving the row and leaving it empty** (the variant the round expected to win). It fixes the
  proximity — the sentence no longer hugs the list's closing hairline — and delivers none of the
  hierarchy. Rendered, it is a sentence floating slightly lower, and on the `statement` slide, which
  has nothing near the bottom to be confused with, it is indistinguishable from doing nothing.
- **A lighter or shorter mark** (48x4, 88x3). Both were rendered. The thin one reads as a stray
  underline and the short one as apologetic. The deck already decided what a mark weighs.
