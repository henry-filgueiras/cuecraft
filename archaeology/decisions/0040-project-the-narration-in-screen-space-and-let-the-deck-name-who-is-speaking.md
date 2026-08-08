---
id: dec_01KZHKJACY38FZ4BZCZBQ0M484
sequence: 40
kind: decision
status: accepted
created: 2026-08-08
---

# Project the narration in screen space, and let the deck name who is speaking

## Context

sprint:11 gave a deck a cast and refused, in its own non-goals, to let a viewer *see* who was
speaking: "if a viewer can see who is speaking, this round did something wrong." That refusal was
correct and it was about that round. Its claim was that identity could be added to a serial
narration stream for one word in the grammar and one argument to one synthesis call, and any
visible treatment would have made the claim unrecoverable — you could no longer tell whether the
audio worked, because the picture was telling you.

The claim was verified. The next thing that needs building is a two-narrator technical explainer,
and there a voice alone is not enough: a viewer who has just met two speakers cannot reliably tell
which one they are hearing, and asking them to learn a timbre before they can follow an argument is
asking them to do the wrong work.

Everything the feature needs was already compiled and none of it was reachable. A `SpeechClip`
carries its text, the declared narrator, the measured duration and the offset; `buildTimeline`
places it at an absolute frame for a measured length; `freezeFacts` already froze exactly this and
`clipAt()` already answered "which clip owns this frame" for the observatory's figures. decision:28
had already settled the hard *visual* question, on evidence, for narration projected as text: an
utterance shown while it is spoken behaves like a caption whether or not it was meant to, and
cutting one short is a claim about what was said.

So the round's question was never "can subtitles be built". It was whether **one tasteful
screen-space projection of what cuecraft already knows** is a useful explanatory layer, and what it
must be forbidden from becoming.

## Decision

**A subtitle is a projection of the compiled timeline. There is one clock, and a subtitle reads
it.**

```
authored narration -> synthesis -> measured clips -> compiled timeline -> subtitle
```

and never the other way. Six things follow, and each of them is a refusal as much as a choice.

### 1. One key, and nothing else in the format

```yaml
defaults:
  subtitles: true
```

A boolean, deck-wide, off unless asked. There is no size, colour, position, alignment, font,
duration or timestamp; there is no per-slide and no per-cue counterpart; a narrator declares a
voice and a speed and gains nothing here. This is the same stance as decision:22's refusal of a
`camera:` key and decision:10's refusal of a font size: a subtitle's words and its every frame are
*already derived*, and its typography is cuecraft's decision. Opt-in rather than on, because
persistent text is a real change to every composition in a deck and the existing films were framed
without it.

### 2. Derived at the freeze boundary, in the same statement as the facts

`render/subtitle.ts` is a pure function of the compiled presentation and the *finished* scenes,
called from the last statement of `buildTimeline` beside `freezeFacts`. That placement is the whole
of the safety argument and it is structural rather than a rule to remember: the track needs both
halves of an utterance — what was said and by whom, and where it landed — and by the time it can
read either, both are closed.

`Timeline.subtitles` is empty when the deck did not ask, so "off" is not a branch anybody
downstream has to remember.

### 3. Whole utterances, and no word timing

A cue appears on **exactly the frame the compiler placed its clip at** — not recomputed from
seconds, not offset by the measured onset — and holds until the next utterance of the same scene,
or the end of that scene's narration. Two consequences, both deliberate: an authored `pause:` is
**bridged** rather than blinked through, and a subtitle **never outlives its slide**, so nothing is
read over a composition that is fading or over the one after it. Nothing is shown during `pre_say`;
a film opens on its title.

There is no word-by-word reveal, and specifically no

```
word duration = clip duration / word count
```

which is available, cheap, and a lie with a plausible shape. Speech is not uniform across words,
punctuation, pauses or phonemes, and a highlight landing on the wrong word thirty times a second is
worse than none. decision:13 measures a clip's *onset* rather than assuming it for exactly this
reason; guessing inside the clip is the same mistake at a smaller scale. Real word times need a
forced aligner over the transcript and the WAV — idea:19 records the seam, which is the
*measurement* step after synthesis rather than the synthesis seam itself.

### 4. Screen space, and a band the composition gives up

decision:36 took the camera out of the world. This is that separation one layer further out: the
overlay is drawn by the composition root, above every scene, inside no `Frame`, under no camera
transform and inside no scene `Sequence`. Nothing an archetype does can reach it, so the sentence
explaining a world does not pan and zoom with the world.

Screen space alone would put the words on top of the slide, because cuecraft's compositions do not
leave a gap to be captioned into — they are *fitted* to the box they are given. So the room is
subtracted before anything is laid out: `Frame` grows its bottom padding by a derived band and
`bodyBox`/`codeBox` subtract the same, and a specimen, a formula or a figure is sized into what is
left. The band is deck-wide and derived from the fitted size, so the composition above never moves
between slides. It is zero unless the deck asked, which is what makes every existing film render
exactly as it did.

`atlas` and `transcript` cannot participate — they ask for full bleed because what they show
extends past all four edges — and are overlaid instead. dragon:21 holds that, with the evidence.

### 5. Typography, and no box

Left-aligned against the deck's own margin, wrapped to `HEADING_WIDTH` so it breaks on the same
text edge as every title, in the deck's face, at one size fitted across every sentence the film
will show. Nothing is centred, because cuecraft centres nothing and a centred subtitle is the
strongest single signal that captions were added to a video afterwards. Nothing is animated beyond
the deck's own opener and closer. The block is anchored by its **top** edge, so a one-line cue and
a three-line cue put their first line in the same place.

An utterance is never shortened. It wraps; when it will not fit the type steps down; below the
readable floor it takes the lines it needs (decision:28, unchanged).

There is no panel, card or scrim behind it. A gradient scrim is what a caption over video normally
uses for contrast and it was rejected on evidence cuecraft already had: `Frame`'s background is
flat because a soft highlight banded into visible arcs once encoded to H.264, and eight-bit
near-black has no more room for a vertical ramp than a radial one. Contrast is a tight three-pixel
halo in the deck's own ink, local to the glyphs, with nothing large enough to band.

### 6. A speaker is a name and a colour, and the label is withheld unless it means something

A cue carries the **declared narrator's name**, never the provider voice — `SpeechClip` has both
and only one of them is a fact about the film. A deck that names no cast displays no speaker at
all, and nothing may manufacture one out of `af_heart`.

Whether labels appear is **deck-wide and all-or-nothing**, and derived from the *film* rather than
from the cast: they appear when more than one narrator is actually heard. This is decision:37's
stance applied to a label — a derived notation is withheld rather than applied sometimes. A deck
that declares four narrators and uses one gets none, because there is nothing to disambiguate and a
name under every sentence of a one-voice film is noise with a colour on it.

Colour is the **second** carrier and never the only one. Four colours, assigned by order of first
appearance, every one of them already in the deck: the accent (so the opening voice is the deck's
own voice), then the three the figures use for authored, measured and derived. Past four the list
repeats — a limit rather than a failure, since the name is still written above every line. Nothing
authored reaches this, and there is no narrator colour key.

## Consequences

- **The timing invariant is a test, not a promise.** The same source compiled with and without
  subtitles produces identical synthesis requests and timelines identical in every field but the
  track — scene starts, durations, `narrationFrom`, anchors, spans, beats, calls, totals and
  `facts`. `render/subtitle.test.ts` asserts the whole record rather than a sample of it.
- **`CompiledPresentation` gained one boolean and `Timeline` gained one array.** Nothing in
  `compile.ts` branches on either; the flag travels the way `title` does.
- **`bodyBox` and `codeBox` gained an optional band, defaulting to zero.** That default is what
  makes "existing decks are untouched" true by construction rather than by inspection, and there is
  a test that says `bodyBox(t, 0)` is `bodyBox(t)`.
- **Fitting a wrap by counting characters needed a named fudge.** Every sizing rule here estimates
  a break by dividing a character count by an average advance, which is right for a measure and
  optimistic for a wrap — a real line ends at the last space that fits. A figure absorbs that by
  growing a row; a subtitle cannot, because its room was subtracted from the composition before
  anything was drawn. `SUBTITLE.wrapSlack` fits against 94% of the measure and is documented as
  what it is.
- **The renders showed the label is legible at a glance and the colour is legible at a thumbnail.**
  On a contact sheet of `examples/aside.yaml` at 1/4 scale the name is too small to read and the
  gold/blue distinction is still immediate — which is the argument for carrying identity twice,
  arriving from the direction nobody planned.
- **A long sentence sets the size for the whole deck.** `examples/onscreen.yaml`'s longest cue is
  167 characters, so every subtitle in it is set at 32px rather than 42px. Fitting per cue was
  refused (type resizing under every full stop is the most distracting thing that could happen down
  there); a three-line cap at full size was tried on paper and costs 294px of every composition.
  32px was checked on a rendered frame and reads.
- **A protocol under an active camera never lost a message to the overlay**, across twenty-five
  sampled frames of `examples/tap.yaml` — the camera keeps the active row above the middle and the
  bottom of the frame is field. The closest call is the settlement arrow in the last shot. That is
  evidence for leaving dragon:21 open rather than for closing it.
- **sprint:11's non-goal is not contradicted; it is superseded on its own terms.** That round's
  rule was that nothing downstream of `compile.ts` should know a narrator exists, so that the
  audio's claim could be tested alone. The claim was tested. What reaches the renderer now is the
  name the deck wrote, through a projection that cannot alter a frame of what was measured — which
  is the only way the two rounds could both be right.
- **Deliberately not built**: word-level reveal, karaoke, uniform fake word timings, forced
  alignment, recognition, subtitle timestamps in any spelling, a styling DSL, per-cue positioning,
  narrator fonts, an authored colour API, portraits, avatars, lip sync, speaker-driven camera
  behaviour, and WebVTT/SRT export — the last of which would now be about fifteen lines over
  `Timeline.subtitles`, and is still not this round's business.
