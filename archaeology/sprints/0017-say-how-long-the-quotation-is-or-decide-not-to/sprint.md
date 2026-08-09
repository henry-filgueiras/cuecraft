---
id: spr_01KZJ2SDZQC3NBVB2MPDSG90AS
sequence: 17
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
---

# Say how long the quotation is, or decide not to

## Goal

Try one more visual cue on the quotation card: a restrained playback footer immediately beneath the
inset, carrying the recall label, a thin monotonically advancing rail, and elapsed / total
recall-local time.

An addendum to sprint:16's hypothesis rather than a new one. decision:44 established that a recall is
*framed*; this asks whether the frame should also say **how long the quotation is and how far
through it we are**, which is the one thing the card currently cannot tell a viewer.

## Rationale

The card answers "this is the past" and "which slide". It does not answer "how much of this is
there", and that is a real question for a viewer: a quotation is a hold on the present, and a hold
whose length is unknown reads as an interruption rather than as evidence. Every value needed to
answer it is already compiled — `Recall.from`, `Recall.durationInFrames`, and the current frame — so
the footer is a *reading* of the interval, not a new fact about it.

The risk is specific and worth naming before rendering anything: the frame would then carry **three
horizontal accent bars** — the present deck position along the bottom edge, the quoted slide's deck
position inside the card, and now recall-local progress between them. Three bars with three meanings
is exactly the "chrome-heavy" failure the addendum anticipates, and it is not decidable from a
description. It is decidable from a frame.

## Success criteria

- The footer sits immediately beneath the card in the room the inset already gave up, carries the
  existing derived label, a thin rail, and elapsed / total recall-local time.
- Every value is derived from the compiled recall interval and the current frame. No timeline state,
  no duration, no new compiled field.
- No controls and no false affordances: no play or pause mark, no handle or knob on the rail, no
  shape that invites a click.
- It stays **outside** `RecalledCanvas`, so the byte-equality proof is untouched and still passes.
- Rendered against `examples/retry.yaml` at full size and judged against the three-bar risk. If the
  frame is busier than it is informative, the footer is **omitted** and the render that says so is
  recorded.
- `npm run check`, the render suite, and `scarp doctor` pass. Timing, audio and no-recall decks are
  untouched, as in sprint:16.

## Non-goals

- **Any authored control.** Same as decision:44: derived chrome or nothing.
- **Anything resembling a media player.** A scrub bar with a handle is a lie about what a rendered
  MP4 can do at that moment, and cuecraft has never drawn an affordance it cannot honour.
- **Changing the card, the inset, the scrim or the subtitle ownership.** Those were settled by
  rendering and are not reopened here.
- **Any change to compiled timing.** The footer reads the interval; it may not extend it.

## Outcome

Kept, and the render is what decided it — including the part of it that had to be rebuilt.

The footer sits in the room the inset already gave up, immediately beneath the card:

    ▬— RECALL · SLIDE 1      ▬▬▬▬▬▬▬————        3.6s / 7.1s

The label moved down into it from the margin above the card. That was not the goal and is the better
side of the change: the card's top edge is now uninterrupted, and the two things that describe the
quotation sit together.

### The three-bar risk was real, and the first rail failed it

The sprint was opened on the worry that the frame would carry three horizontal accent bars with three
meanings. It does, and the first attempt made it worse rather than better: a 2px rail spanning the
full width between label and time reads at 1080p as a **third outline**, parallel to the card's edge
and to the frame's, with a filled portion too slight to see. It communicated nothing and added a
line.

At 4px and a fixed 300px it reads as a meter — a bright segment against a visible dark track — and
the three bars separate by extent and context rather than by weight alone: one is inside the card,
one is between two blocks of type, one runs full bleed at the frame edge. Magnified 2x at the
bottom-left corner, where all four horizontal elements coexist, each is attributable.

Sampled at 0.3s, 3.6s and 6.9s of a 7.1s quotation, the rail visibly advances. That mattered: a
static frame cannot show a temporal element doing its job, and judging the first rail from one still
would have been judging the wrong thing.

### The honest cost

The bottom of the frame is now dense. Four horizontal elements live in 90px — the card's progress
rule, the card's outline, the footer, and the present slide's progress rule 15px below it. There is
no room left down there for a fifth thing, and the next feature that wants the bottom of a quotation
will have to take something away.

The rail is also partly redundant with the numbers beside it, which say the same thing more
precisely. It was kept because it is the part that reads without being *read*.

### What did not move

`RecalledCanvas` is untouched, so the byte-equality proof still passes unchanged — the footer is part
of the frame around the quotation, not part of the quotation. Compiled timing, audio, the reused WAV
and its placement are all as they were: `examples/retry.yaml` still renders at 65.920000s, the same
duration as the sprint:15 and sprint:16 cuts.

One test moved: the render suite's "no duplicated subtitle" probe reads the strip below the card,
which now legitimately contains accent-coloured footer text. Its threshold went from 150 to 200,
which still separates anything down there (`COLORS.accent` at luma 169) from a subtitle drawn in
paper (245).

### A note on where the decision was recorded

task:82 said decision:44 would be *amended*. It was extended instead: decision:45 carries the footer
and decision:44 gained a forward pointer in its consequences. scarp owns a decision's section layout,
and appending an `## Addendum` heading to an accepted artifact is not a thing this repository does —
the pattern already established between decision:43 and decision:44 is a new artifact plus a pointer,
and nothing about a footer justified inventing a second pattern.
