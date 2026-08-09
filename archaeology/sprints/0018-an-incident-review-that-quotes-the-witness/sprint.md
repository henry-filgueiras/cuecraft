---
id: spr_01KZJ4E57ZVCGV27EXP5PT6CJE
sequence: 18
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
---

# An incident review that quotes the witness

## Goal

Author and render `examples/off-the-record.yaml` — a six-slide, two-narrator incident review titled
"This Meeting Is Not Being Recorded", carrying exactly two recalls: a near contradiction and a
long-range closing callback. Then watch it at full size and judge the landed recall treatment
against a deck that was not built to exercise it.

## Rationale

`examples/retry.yaml` is the recall specimen and it says so in its own header comment: "the deck
exists to exercise `recall:` and nothing else." Three rounds of design — decision:43's semantics,
decision:44's quotation card, decision:45's footer — have all been judged against that one deck,
which was written to make the feature look correct. That is the wrong witness. A feature judged only
against the deck built to show it off has never been asked whether it survives contact with material
that wants something from it.

So this round writes a deck that wants something. The joke is structural rather than written: a
speaker revises history, and the film answers by playing the speaker's own earlier voice, words,
slide and visual state back. `recall:` is the punchline delivery mechanism, and a punchline is a
harder acceptance test than a demonstration — it either lands on the frame or it does not, and no
amount of correct compilation rescues it.

Two recalls rather than one is the specific new question. `retry.yaml` recalls once, so nothing has
ever established whether the treatment reads as a *device* the film owns or as a trick it can only
do once. The second recall here is deliberately long-range — slide 6 quoting slide 1 — and its
subject is a claim that no record would exist, which the quotation disproves by being played.

## Success criteria

- `examples/off-the-record.yaml` exists, compiles, and renders to a complete MP4 of roughly 75–105s.
- Six slides, exactly two recalls, both naming unique earlier root-scoped `activates`, both source
  utterances atomic.
- Two narrators with distinct existing Kokoro voices, subtitles on, so the speaker labels are part
  of the comedy.
- Each slide's body chosen for what its content *means*. No content added to force visual variety.
- Both recalls inspected at full size at: the frame before entry, the first quotation frame, a
  middle frame carrying its historical subtitle and advancing local clock, the final quotation
  frame, the returned frame, the subtitle-free pause, and the first frame of the response.
- A recorded judgement on: whether `RECORD` reads as a character without explanation; whether each
  replay reads as evidence rather than as navigation; whether the first contradiction is immediately
  legible; whether the closing replay makes the claim funnier by disproving it; and whether two
  recalls read as deliberate.
- `npm run check` and `scarp doctor` pass; the working tree is clean.

## Non-goals

- **Any change to the compiler, the renderer, the recall treatment, or the source language.** This
  round is a probe. If the deck exposes a real defect the evidence is recorded as a dragon or a
  sprint finding — it is not fixed here, because a round that both writes the test and moves the
  thing under test has proved nothing.
- **A third recall.** Two is the question. A third would answer a question nobody asked and would
  make the device cheap, which is the failure mode most worth avoiding.
- **Any authored styling, flashback vocabulary, media vocabulary or playback control.** decision:44
  and decision:45 settled that the chrome is derived; nothing in a deck may reach it.
- **Explaining `recall:` to the audience.** If the viewport, the historical subtitle, the footer and
  the dialogue cannot carry it, that is a finding about the treatment, not a licence to narrate it.
- **The README.** The rendered artifact gets the vote first; whether it earns a place in the
  showpieces is a separate question and a separate round.
- **Sanding the jokes.** Wording changes only where the rendered performance shows a real delivery
  problem.

## Outcome

`examples/off-the-record.yaml` renders at **01:45.6** — 3169 frames at 30fps, 22 synthesized clips,
24 subtitle cues, two recalls. Compositions, all chosen by what each slide's content means and none
of them argued for:

    1 matrix   2 index   3 cascade   4 index   5 matrix   6 statement

    slide 4 recalls "not-a-deploy" from slide 2:  00:53.0 replays 00:12.7 for 6.6s
    slide 6 recalls "off-record"   from slide 1:  01:29.4 replays 00:00.4 for 8.3s

The round did what it was opened to do. The deck was not written to show the feature off, and the
feature came out of the contact intact — with one real defect found in a composition nobody was
looking at, which is what a probe is for.

### What the frames say

**A replay reads as evidence, not as navigation, and the footer is why.** Judged at all seven
boundaries on both recalls. The frame before entry is an ordinary subtitled slide; the first
quotation frame is unmistakably a different kind of frame — outlined, inset, `RECALL · SLIDE 2`,
`0.0s / 6.6s`. Nothing in the film explains any of that and nothing needs to. decision:45's
suspicion that the rail is partly redundant with the numbers holds and is still the right call: the
rail is what says "this has an end" without being read.

**The contradiction is legible at close range because the card carries its own caption.** Management
says "I have never claimed that nothing was deployed", Record says "Let's consult an earlier version
of you", and 6.6 seconds of Management's own voice arrive saying "we did not deploy on Friday" with
`MANAGEMENT` printed above it in Management's colour. The subtitle attribution is doing more work
here than in `examples/retry.yaml`: the joke is not that somebody was wrong, it is that the label on
the quoted sentence is the *same label* as the one on the sentence it contradicts.

**The closing callback lands structurally, and the pause is where it lands.** Slide 6 is a
`statement` — the title is the whole slide — and it asserts that no permanent record was created.
The card that covers it is a time-bounded, indexed, captioned recording of that claim being made.
Then the card cuts out and the 900ms pause holds "No permanent record was created" in silence with
an empty subtitle band. That frame is the punchline and it contains no text that was written for it.

**Two recalls read as deliberate.** They are 36 seconds apart, different lengths, and the footer
labels them `SLIDE 2` and `SLIDE 1`, so the second visibly reaches further back than the first. The
sprint's worry that a second use would make the device cheap did not survive the render — what makes
it read as a device the film owns is that the two do different jobs, not that there are two.

**`RECORD` reads as a character.** The deck never says what Record is. The name, the colour
separation from `MANAGEMENT`, and the register of the lines carry it; by "The minutes have
encountered contrary evidence" the viewer has an institution rather than a narrator.

### The defect: dragon:26

Slide 1's third matrix cell was `No permanent record`. Rendered, it wrapped, and the second line was
drawn **through the subtitle's speaker label and over the subtitle**. `fitTerm` (`theme.ts:229`)
takes the cell count and nothing else, and `Matrix` is the only list composition that never asks
`useSubtitleBand()` how much room it has — `IndexList` and `Cascade` both do. sprint:14 taught the
compositions about the band; matrix was missed.

It survived four rounds because the overflow is centred: a wrapped cell in the *top* row spills
inside the frame and looks like tight leading, and only the *bottom* row spills onto the band.
`examples/retry.yaml` slide 1 has two 24-character cells that wrap — in the top row. The shipped
recall specimen has been carrying this and could not show it.

Recorded rather than fixed, per this sprint's first non-goal. The deck was repaired the way the round
was allowed to repair it: **`No permanent record` became `No record kept`** (19 characters to 14).
Nothing else changed — the anchor, the narration, the timing and the callback text are untouched, and
the film is still 3169 frames.

### Wording and pacing, after watching

- **One text change, and it was forced by a frame**: the slide-1 cell above. No dialogue was
  altered; the jokes are as written.
- **`pre_say: 400ms` / `post_say: 800ms`**, against `retry.yaml`'s 700/1200. Chosen deliberately for
  a two-hander: a generous lead-in and tail on every slide is right for a documentary and slack for
  an exchange. It is also the only lever a deck has over dragon:24's handover, and it moved the film
  from 108.6s to 105.6s — worth writing down as a data point there, because it is the cheapest
  version of "shorten the gap" and it operates per *slide*, not per speaker change.
- **Voices as briefed**, `bm_george` for Management and `af_heart` for Record, unchanged.

### Friction worth naming, that is not a defect

**A quotation of a slide's opening sentence begins during that slide's entrance animation.** Both
recalls here point at their slide's first clip, so both cards open on a body that is still arriving —
at 0.0s the first card is a title and an outline. This is decision:43 working exactly as decided,
and measured, it lasts about half a second: at 0.3s two rows are fading up and at 0.7s the slide is
whole. A beat, not a fault. But it is a standing authoring trap — the most natural sentence to anchor
is the one that opens a slide, and that is precisely the case where the quotation shows least.

**The verification had one hole, and it is honest to say so.** Every claim above was made from
rendered frames. Nothing in this round listened to the audio. Pronunciation was checked the way
decision:12 checks it — every line phonemized through the same eSpeak build the synthesis path uses,
which confirmed all four occurrences of *record* resolve to `ɹˈɛkɚd`, the noun, so no `pronounce:`
repair was needed. That verifies phonemes; it does not verify delivery, and the comic timing of
"Exactly." and "Request denied." rests on a judgement the round could not make from a frame.

### Not done, on purpose

The README is untouched. Whether this deck earns a place among the showpieces is a separate
question, and the artifact should be watched by somebody before it is argued for.
