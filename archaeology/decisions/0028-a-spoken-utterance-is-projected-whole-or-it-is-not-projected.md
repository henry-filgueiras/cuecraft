---
id: dec_01KZD01G6TQEZ03FNCJZNH4SGF
sequence: 28
kind: decision
status: accepted
created: 2026-08-06
---

# A spoken utterance is projected whole, or it is not projected

## Context

The observatory puts narration on screen as text while that narration is being spoken. Both of
decision:27's figures do it: `timing` shows the sentence you are currently hearing beside its
measured length, and `anchors` shows the sentence that resolved each relationship beside the frame
it resolved on. Nothing about either was designed as a caption, and both behave like one anyway —
the words appear in time with the voice, so a viewer starts reading along.

The first cut set them with a `shorten(text, measure)` helper: trim to a character count, append
an ellipsis. Watching the artifact, five of the sixteen clips and six of the eight anchors were
cut off, including every sentence that had a second clause. And the ellipsis was *permanent*. The
projection selects which facts to show and the renderer decides how they are set, but nowhere,
at any frame, in any state, were the missing words available. The viewer hears a full sentence and
watches half of it, and the half they can see is the half they have already heard.

That is a different failure from the one elision usually is. Quoting a *region of a source file*
and marking an omission is honest: the file is the evidence, the omission is visible, and idea:14
parks doing it properly. Cutting a spoken sentence short is a claim about what was said.

## Decision

**Spoken narration projected as text is lossless with respect to the utterance.**

It may wrap. It may be windowed — the `anchors` figure still shows a neighbourhood rather than
all thirty relationships. What it may not do is discard words from a sentence it is showing.

The mechanism is one function, `fitQuote`, and it is `fitHeading`'s move applied to prose:

```
set at FIGURE.quote                          if it fits in FIGURE.quoteLines
step the type down, two pixels at a time     until it does
stop at FIGURE.quoteMin and take more lines  if nothing fits
```

Fitted across every sentence that figure will ever show rather than one at a time, so the size is
a property of the figure and not of whichever cue happens to be lit; type that resized whenever
the narration moved on would be the most distracting thing on the frame.

The knock-on is that a row holding a whole sentence is as tall as that sentence needs, so
**how many rows the `anchors` figure shows is derived rather than fixed**. `FIGURE.rows` became a
maximum and `FIGURE.minRows` a floor; between them the answer is however many fit under the
heading, computed from `bodyBox(title)`. On the observatory that is three rather than five.
Selecting fewer relationships is a projection cost, and projection was always the renderer's to
make. Dropping half a sentence is not a projection, it is an inaccuracy.

## Consequences

- Every sentence in the observatory's narration now fits in two lines at full size. The ellipsis
  was never buying anything except the illusion of a fixed row height.
- The `anchors` figure lost two rows and gained a centred live row: `around(items, index, 3)` puts
  the sentence that is currently true exactly in the middle, which reads better than the
  off-centre window five rows gave.
- The current-clip block in `timing` is now given the height of the deck's *longest* sentence, so
  the rail above it stops shifting as the narration moves between a short cue and a long one. The
  measured duration beside it takes a fixed column for the same reason.
- The fitting is in `theme.ts` rather than in the composition, so it is a pure function tested
  without a browser — the same constraint `fitSpecimen` and `headingLines` work under.
- This says nothing about source evidence. A specimen may still elide, and idea:14 is still the
  right shape for it when it does.
