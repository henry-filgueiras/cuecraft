---
id: spr_01KZJ18K655EV1A9690KY555BE
sequence: 16
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
---

# Frame the quotation, and let two clocks show at once

## Goal

Make a `recall:` *read* as a quotation from the past, without changing a single thing about what it
compiles to.

sprint:15 proved the replayed frame is byte-identical to its source and treated that as the whole
result. Watching `examples/retry.yaml` at full size shows why it is not: a full-screen hard cut
between two native cuecraft slides is indistinguishable from ordinary progression. The film is
correct and unreadable. A viewer who does not already remember slide 1 has no way to know they are
being shown evidence rather than the next thing.

The hypothesis under test is a **temporal quotation card**: the present slide stays on screen,
recedes, and the complete recalled canvas is inset on top of it at a little under full size, outlined
in the deck's accent, with a small derived label naming which slide is being quoted. Two clocks
visible at once — the present slide's progress position outside, the historical one inside.

This is a hypothesis, not a specification. If the render falsifies it, the round records what the
frames showed rather than reaching for a second effect.

## Rationale

The failure sprint:15 shipped is a *legibility* failure, not a correctness one, and the temptation is
to fix it with the vocabulary films use for flashbacks: sepia, blur, desaturation, grain, a filtered
voice. Every one of those is a new visual theme, none of them is in cuecraft's palette, and all of
them degrade the thing being quoted in order to say that it is quoted. The evidence has to stay
legible — it is the point of the sentence.

The alternative reading is that the quotation is a *frame* rather than a *filter*: the past is shown
whole and undamaged, and what marks it is that it is now inside something. That is a claim
cuecraft's existing design language can make with an outline, a scale, and a label, and it is the
smallest intervention that could work. It is also the only one that keeps both progress positions on
screen at once, which is the one thing that says "this is a different moment of this film" without
any new vocabulary at all.

The subtitle question falls out of the same reading. A quoted sentence belongs to the quoted canvas;
leaving it in the deck-level band would put a caption from the past in the present frame's furniture,
where it would read as the current narration.

## Success criteria

- A recall renders as: the present slide recessive underneath at its ordinary present-time frame, the
  complete recalled canvas inset and outlined, and a derived label naming the source slide.
- The inset constant is chosen by rendering two or three candidates and looking at real frames, not
  by picking a number.
- The recalled subtitle appears **exactly once**, inside the card, with the source clip's text and
  the source clip's narrator. The deck-level band shows nothing during a recall. Behaviour outside
  recalls is unchanged, and the pause after a recall is still silent.
- The label is renderer-owned chrome derived from `Recall.sourceOrdinal`. No YAML key, no authored
  layout consumed.
- The hard cut in and out survives. No fade, no settle, no frame of timeline duration.
- **Nothing compiled moves.** Parsing, resolution, `Recall` fields, `totalFrames`, the audio track,
  the reused WAV and its placement, the source-frame mapping and the entrance-animation offsets are
  all untouched, and a deck without a recall renders byte-identical.
- **The correctness proof survives the chrome.** The existing final-frame byte-equality must stop
  being true — the composition really does differ now — and the underlying claim must not be lost
  with it. The unframed recalled canvas, including its subtitle and its historical progress position,
  is still byte-identical to the original source frame, asserted at a boundary that says so.
- New evidence that the final frame *is* framed, and that the recalled subtitle is not also drawn in
  the deck band.
- The range question is recorded as a dragon and not solved. Documentation that implies an anchor
  recalls more than one speech cue is corrected.
- `examples/retry.yaml` rendered and judged at five named frames. `npm run check` and `scarp doctor`
  pass.

## Non-goals

- **Sepia, blur, desaturation, scanlines, grain, vignette, audio filtering.** A quotation is framed,
  not damaged. None of these is in cuecraft's palette and each would be a second visual theme.
- **Animation for its own sake.** A very short settle is admissible *only* if the static treatment is
  still ambiguous in a rendered frame, and only with that frame recorded as the reason.
- **Any authored control.** No `recall: { style: ... }`, no scale key, no label text, no opt-out. The
  chrome is derived or it does not exist.
- **Any change to compiled timing or audio.** The card is a projection of a `Recall` that already
  exists; it may not extend it, shorten it, or add a frame to the film.
- **Renderer state on the timeline.** The active recall is derived from `Scene.recalls` and the
  current frame. Nothing new is stored for the renderer's convenience.
- **Solving the range question.** A recall quotes exactly one measured speech clip. Whether an author
  should be able to quote an authored *passage* is a real question with a bad obvious answer, and
  this round records it and stops.
- **Cross-deck recall, external recordings, `play:`, trimming, playback rate.** Unchanged from
  sprint:15's refusals.

## Outcome

Every success criterion met. The hypothesis survived contact with the render, one part of it was
falsified and recorded, and the round's exact proof came out stronger than it went in.

`examples/retry.yaml` renders at 01:05.9 — the same duration, frame for frame, as the sprint:15 cut,
and the only change below the renderer is one read-only function.

### The five frames

Judged in the encoded MP4 at 1920x1080, at the frames the round exists to get right.

| frame | what it shows |
| ----- | ------------- |
| 1477  | slide 3, present, Dev's live sentence in the deck band |
| 1478  | the cut. Card, outline, `RECALL · SLIDE 1`, the quoted canvas with `settlement` still *dormant* — the anchor has not fired yet at that moment, exactly as it had not the first time |
| 1584  | mid-replay. `settlement` established. Two progress rules on the frame |
| 1690  | the last replay frame |
| 1691  | the cut back. Slide 3, no card, no subtitle |
| 1700  | the authored pause, still silent |

**It reads as quoted evidence without remembering slide 1.** That was the thing sprint:15 failed and
it is the thing the card fixes: a viewer arriving cold sees a bordered, labelled picture sitting over
a receded one, which is not a shape ordinary progression ever makes in this deck.

**Two clocks, measured rather than judged.** In the encoded frame the card's own progress rule reads
`(214, 160, 86)` about a third across the card, and the present slide's reads `(218, 160, 87)` full
width along the bottom edge — both `COLORS.accent`, at different positions and different extents,
with 54px of exposed frame between them.

**The subtitle is drawn once.** Probing the encoded frames: the strip strictly below the card carries
a peak luma of 32 through the whole replay while the card's band carries 234, and both frames after
the return read 27. No duplicate, nothing hanging over the silence.

### What the render falsified

- **0.94 inset is impossible, and not for aesthetic reasons.** It leaves 32px of exposed frame; the
  label needs 36. It prints into the card's own outline. The label sets a hard floor on the margin,
  which is not a thing that could have been reasoned out in advance.
- **"The present slide remains recognizable" is not achievable by content at any usable inset.**
  `FRAME.marginX/marginY` keep every bordered composition's content well inside the exposed strip, so
  what stays recognizable is the present field and the present clock. Reaching actual content needs
  about 0.78, where the quotation reads as a thumbnail. The clock was the part that mattered.
- **The scrim does nothing on `retry.yaml`** — ink over ink. It was checked on a constructed world
  deck, where it does exactly what it is for: the present atlas's grid and node edges survive as
  faint texture around the card instead of competing with the quotation. Recorded rather than
  quietly kept.
- **A bleeding present slide has no second clock at all**, because `Frame`'s bleed branch draws no
  progress rule. Pre-existing, unchanged here, and newly visible.

No settle was added. The static card was not ambiguous in any of the five frames, so the round did
not spend the animation it was permitted.

### The proof came out stronger

Adding the card necessarily ends sprint:15's byte-equality between a replayed frame and its source —
the composition genuinely differs now, deliberately. The claim underneath moved to `recalled-canvas`,
a composition rendering the same `RecalledCanvas` component the card draws, with no framing.

Making that component self-contained is what exposed a real bug. The offset had been written relative
to a wrapping `<Sequence>`; mounted without one it silently drew a *different moment*, and only the
byte-equality caught it — the mismatch was confined to the one element still mid-entrance-animation,
which is invisible to any assertion weaker than "these two PNGs are the same file". The offset is now
absolute, and the equality holds at an offset where the entrance animation is still running, which
sprint:15's fixture never reached because both of its frames were settled.

So the round both preserved the proof and found the thing it was for.

### Where it stopped

At the range question, on purpose. dragon:25 records that a recall quotes one measured utterance and
not the passage an author may reasonably think they anchored, with the four reasons "until the next
activation" is unsafe, and with a direction — an explicitly named half-open narration segment — and
no syntax.
