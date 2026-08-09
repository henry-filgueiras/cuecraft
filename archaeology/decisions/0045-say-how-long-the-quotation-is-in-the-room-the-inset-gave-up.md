---
id: dec_01KZJ358XGG2TZE69G3X09TF5J
sequence: 45
kind: decision
status: accepted
created: 2026-08-08
---

# Say how long the quotation is, in the room the inset gave up

## Context

decision:44 framed a recall as a quotation card and settled that a viewer can now tell evidence from
progression. It left one question the card cannot answer: **how long is this hold?**

That is not a cosmetic gap. A quotation suspends the present, and a suspension of unknown length
reads as an interruption rather than as evidence — the viewer is holding an open question while
trying to listen to a sentence. Everything needed to close it was already compiled: a `Recall` has a
first frame and a measured duration, and the current frame is the third number.

The risk was equally specific, and named before anything was rendered: the frame would then carry
**three horizontal accent bars** — the present slide's deck position along the bottom edge, the
quoted slide's deck position inside the card, and recall-local progress between them. Three bars
with three meanings is the "chrome-heavy" failure this could have been, and it is not decidable from
a description.

## Decision

**The quotation card gains a footer in the room the inset already gave up**, immediately beneath it:
the derived label, a short rail, and elapsed / total recall-local time.

    ▬— RECALL · SLIDE 1   ▬▬▬▬▬▬▬————   3.6s / 7.1s

**The label moved down into it**, out of the margin above the card. That was not the point and is the
better side of the change: the card's top edge is now uninterrupted, and the two things that describe
the quotation sit together.

**Every value is a reading of the compiled interval.** `frame - recall.from` over
`recall.durationInFrames`, clamped, and the elapsed count divided by the deck's fps. Nothing is
stored, no field was added, and the footer cannot extend or shorten what it reports.

**No controls and no affordances.** No play mark, no pause mark, no handle on the rail, no shape that
invites a click — a rendered MP4 cannot honour any of them, and cuecraft has never drawn a control it
does not have.

**It sits outside `RecalledCanvas`.** The byte-equality proof is untouched and still passes: what is
being quoted is unchanged, and the footer is part of the frame around it.

## Consequences

- **The three-bar risk is real and was resolved by the rail's shape, not by argument.** The first cut
  was a 2px rail spanning the full width between label and time, and it failed: at 1080p it reads as
  a *third outline* rather than as progress, and its filled portion is a brightness difference too
  slight to see. At 4px and a fixed 300px it reads as a meter — a bright segment against a visible
  dark track — and the three bars become attributable by extent and context: one is inside the card,
  one is between two blocks of type, one runs full bleed at the frame edge. Rendered at 0.3s, 3.6s
  and 6.9s of a 7.1s quotation, it visibly advances.
- **The numbers are set in the idiom `figures.tsx` already uses for something the compiler worked
  out**: `MONO_STACK`, seconds, at *one* decimal. Two decimals at 30fps is a digit changing three
  times a second in the corner of a frame somebody is reading a quotation on. The elapsed half is
  accent and the total is `COLORS.dim`, because only one of them moves.
- **The bottom of the frame is now dense**, and that is the honest cost. Four horizontal elements
  live in 90px: the card's progress rule, the card's outline, the footer, and the present slide's
  progress rule 15px below the footer. At 2x magnification each is attributable; there is no room
  left down there for a fifth thing.
- **The rail is partly redundant with the numbers**, which say the same thing more precisely. It was
  kept because it is the part that reads without being *read* — a viewer glancing at the frame gets
  the answer from the meter, and only a viewer who wants the number goes to the number.
- **The numbers sit hard against the end of the rail, and the first cut got that wrong.** They were
  justified to the far edge of the card, a thousand pixels past where the 300px rail stops. The eye
  reads the total as the rail's end label, so the gap says the track runs all the way over there —
  and at 6.9s of 7.1s that is actively misleading: a meter that looks full, ending nowhere near the
  total printed beside it. It was the same error as the 2px rail in a different place, an element
  implying an extent it does not have. Left-aligning the whole footer also puts it back in the
  deck's own idiom: right-justified text was the only instance of it in the design language.
- **decision:44 is unchanged in every other respect.** The inset, the scrim, the outline, the
  subtitle ownership and the hard cut were settled by rendering in sprint:16 and were not reopened.
