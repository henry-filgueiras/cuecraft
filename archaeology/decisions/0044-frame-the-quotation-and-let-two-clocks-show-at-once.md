---
id: dec_01KZJ2E3KYD3AJ7729G7F1FVK7
sequence: 44
kind: decision
status: accepted
created: 2026-08-08
---

# Frame the quotation, and let two clocks show at once

## Context

decision:43 shipped `recall:` full-bleed and hard-cut, and argued the chrome away on principle:

> No crossfade, no vignette, no caption saying "earlier": the signal that this is the past is the
> picture itself, and the progress rule stepping back to a slide already seen.

The evidence for that was byte-equality — a replayed frame is pixel-for-pixel the frame it replays —
and it is true and it is not the question. Watching `examples/retry.yaml` at full size answers the
question: a full-screen hard cut from one native cuecraft slide to another native cuecraft slide is
**indistinguishable from ordinary progression**. The retreating progress rule is real, it is five
pixels tall at the bottom edge, and it is the only thing on the frame carrying the entire claim. A
viewer who does not happen to remember slide 1 sees the next slide.

So the film was correct and said nothing, which for a presentation compiler is the worse of the two
failures. decision:43's reasoning was sound about *what not to do* and wrong about how much a frame
can say on its own.

## Decision

**A recall is drawn as a quotation card: the past shown whole, inside something, over a present that
has receded.**

**Framed rather than filtered, and that distinction is the whole design.** Cinema marks a flashback
by damaging it — sepia, grain, blur, desaturation, a filtered voice — and every one of those degrades
the thing being quoted in order to say that it is quoted. In cuecraft the thing being quoted is the
argument, so it stays whole, undamaged and legible at the size it was authored for, and what marks it
is that it is now *inside* something. Nothing new enters the palette: the outline is `COLORS.accent`,
the scrim is `COLORS.ink`, the label is the subtitle's own small-caps register.

**Both clocks are on screen at once, and this needed no new vocabulary at all.** The present slide
keeps rendering underneath at its own present-time frame with its progress rule along the bottom
edge; the quoted canvas carries its own, retreated to where the film was. cuecraft already had a way
of saying where it is; the card simply makes two of them visible.

**The present recedes; the present's clock does not.** The scrim stops short of
`FRAME.progressHeight`. Scrimmed with everything else, the present progress rule goes to an
unreadable brown and the frame loses the second clock — which is the entire reason the present slide
is still on screen. Exempt, it stays exactly `#D9A05B`.

**The label is derived chrome.** `RECALL · SLIDE 1`, from `Recall.sourceOrdinal` and nothing else,
drawn in the room the inset gave up. No YAML key sets it, no composition's box is consumed by it, and
its mark is drawn from two divs rather than typed as `↶` — dragon:4 says typography depends on
whatever fonts the host has, and an arrow that renders as a tofu box is worse than no mark.

**The quoted sentence belongs to the quoted canvas.** During a replay the deck-level subtitle band
draws nothing and the card draws the cue instead: the source clip's words, the source clip's
narrator, on the compiled interval. Leaving it in the band would caption a slide from the past in the
present frame's furniture, and drawing it in both places would say it twice.

**Still a hard cut in and a hard cut out.** No fade, no settle, no interpolation, and no frame of
timeline duration. The card needs no `Sequence` of its own to arrange that — it is mounted on exactly
the frames `recallAt` reports, which is the compiled interval and the same answer the subtitle
suppression reads. One decision, read twice, rather than two mechanisms that happen to agree.

**Nothing compiled moved.** Parsing, resolution, `Recall`, `totalFrames`, the audio track, the reused
WAV and its placement, the source-frame mapping and the entrance offsets are untouched; the only
addition below the renderer is `recallAt`, which reads.

## Consequences

- **This supersedes decision:43's "no flashback chrome" claim**, and only that claim. Everything else
  decision:43 decided — recall as its own cue kind, the borrowed duration, backwards-only unique
  resolution, `Clip.from` rather than `Anchor.frame`, one serialized audible stream — stands
  unchanged. What is retracted is the belief that a frame identical to its source could carry the
  fact that it *is* a quotation.
- **The byte-equality proof moved rather than died.** The film's final frame is now deliberately not
  equal to its source, so the assertion is made against `recalled-canvas`, a diagnostic composition
  rendering the same `RecalledCanvas` component the card draws, unframed. It is a *stronger* test
  than sprint:15's: making the canvas self-contained exposed a latent frame-offset bug and the
  equality now holds at an offset where the entrance animation is still running, which sprint:15
  never exercised.
- **The inset is capped by the label, not by taste.** 0.94 leaves 32px of exposed frame and the label
  needs 36, so it prints into the card's own outline. That is a hard floor, and 0.90 is the largest
  quotation that still leaves the label air.
- **The scrim is inert on most slides, and that is not a defect.** `FRAME.marginX/marginY` keep every
  bordered composition's content well inside the exposed strip, so on `retry.yaml` it is ink over ink.
  It earns its keep on `atlas` and `transcript`, which bleed to all four edges (dragon:21) — verified
  on a world deck, where the present world's grid survives as faint texture instead of competing.
- **The present slide is not recognizable by its content**, at any inset in this range, because the
  exposed strip is margin. What stays readable is its field and its clock. Exposing real content
  needs about 0.78, at which point the quotation reads as a thumbnail. The clock was the load-bearing
  part.
- **A bleeding present slide has no second clock at all**, because `Frame`'s bleed branch draws no
  progress rule. Pre-existing and unchanged by this round, but the card is where it becomes visible.
- **Extended by decision:45**, which adds a footer beneath the card carrying the label, a rail and
  elapsed / total recall-local time. Nothing on this page is retracted by it: the label moved from
  the margin above the card into that footer, and everything else — the inset, the scrim, the
  outline, the subtitle ownership and the hard cut — stands as decided here.
