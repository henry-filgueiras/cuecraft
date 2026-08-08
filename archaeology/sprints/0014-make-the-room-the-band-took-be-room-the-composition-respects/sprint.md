---
id: spr_01KZHRVYW57XJRGBFQYN90SGCS
sequence: 14
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
---

# Make the room the band took be room the composition respects

## Goal

Make the room a subtitle takes out of a composition be room the composition actually respects.

Two adversarial decks — `examples/meridian-bickering.yaml` and `examples/orpheus-failover.yaml` —
produce frames where slide content and narration are drawn in the same pixels. Measured on the
`index` archetype:

    subtitles off   closing hairline at y=971   content box bottom 972   correct
    subtitles on    closing hairline at y=879   content box bottom 734   overflows by 145

`Frame` applies the band as bottom padding and the padding is honoured. What is not honoured is the
box: `IndexList` and `Cascade` lay their rows out at a fixed `TYPE.row` / `TYPE.stage` with fixed
`SPACE.lg` padding, inside a `flex: 1` container whose default `min-height: auto` refuses to shrink
below its intrinsic height. The stack simply runs past the padding box, and what is under the
padding box is the narration.

This is not a subtitle defect. Before subtitles the same overflow spilled into 108px of bottom
margin and nobody noticed. The band moved the collision into something legible.

The trigger is a **wrapped title over full-width stacked rows**. `lead` slides in both decks have
two-line titles and are comfortable, because `lead` puts its title in a column beside the rows
rather than above them.

Separately and by a different mechanism, `atlas` prints world nodes on top of the sentence — at
1920x1080 the word "traffic" lands on "that now" and both are illegible, because `HALO` is tuned
for text over a field and a world node is a filled panel with its own glow. `transcript` does not,
because `TRANSCRIPT.lookaheadRows` already keeps the bottom of the frame as field. That is
dragon:21, narrower than dragon:21 states it.

## Rationale

Every other fitted archetype already does the right thing. `Specimen`, `Formula`, the figures and
`Population` all ask `bodyBox(title, band)` how much room they have and size themselves into it —
decision:15's "size is derived from content" applied to the vertical axis. `index` and `cascade`
were written before there was ever a reason for the box to be smaller than the frame, and they are
the only two stacked archetypes that never learned.

The two decks that exposed this are the shape every future cuecraft film has: two narrators, long
titles, dense slides. The Retry explainer will be one of them.

## Success criteria

- On both new decks, no frame draws slide content inside the subtitle band. Verified by rendering,
  and by an invariant test that does the arithmetic rather than by looking.
- `index` and `cascade` derive their type and spacing from `bodyBox(title, band)`, in the same
  shape as `fitSpecimen` and `fitQuote`, with a readable floor.
- The `atlas` frames its world into the region above the band. `band` is zero for every deck that
  did not ask for subtitles, so every existing film renders byte-identical.
- dragon:21 is resolved or re-scoped against what the frames actually showed.
- `npm run check` and `scarp doctor` pass; `witnessglass`, `onscreen`, `aside`, `tap` and both new
  decks render and are watched.

## Non-goals

- **Continuation slides.** Deriving a second slide when content will not fit changes the number of
  scenes, and therefore the timeline, from the renderer. decision:9 forbids exactly that: nothing
  downstream of compilation may change derived timing. If a deck genuinely cannot fit its content
  at the readable floor, the honest answer is that the floor was reached, not that cuecraft invents
  a slide the author did not write.
- **A safe-area or layout-constraint engine.** Two archetypes learn one number that eight others
  already read. If the fix needs a new subsystem it is the wrong fix.
- **The deck-wide subtitle type tax.** One 128-character cue sets 30px for all 59 cues of
  `orpheus`. That is real, it is decision:28's deck-wide fit meeting a deck shape neither specimen
  had, and it is a separate question from anything colliding. Record it, do not solve it here.
- **Any authored knob.** No `padding:`, no `rows:`, no `density:`. Composition remains derived.
- **Re-timing anything.** No clip offset, measured duration, scene length, anchor frame or camera
  key may move. The camera may be told about a smaller viewport; it may not be told about time.

## Outcome

Every success criterion met, and the round found three defects it was not looking for.

Both adversarial decks are clean end to end — every `index`, `cascade` and `atlas` slide clears the
narration — and their timelines are identical to the frame before and after (302.357333s,
308.416000s). `witnessglass` without subtitles renders byte-identical, which is the acceptance
artifact decision:7 keeps for exactly this. `index` and `cascade` now derive type and spacing from
`bodyBox(title, band)` in the same shape as every other fitter, backed by an invariant test that
does the arithmetic across every band the decks produce. dragon:21 is closed; dragon:23 is the
subtitle type tax, recorded rather than solved as the sprint said it would be.

### The diagnosis that was offered, and the one the measurement gave

An independent audit proposed that `AbsoluteFill`'s `width/height: 100%` with content-box sizing was
expanding the element rather than shrinking its usable area, and that `Frame` needed
`box-sizing: border-box`. It is a good hypothesis and it is wrong, and one measurement settled it:
with subtitles off the closing hairline lands at y=971 against a content box ending at 972 —
exactly right. Content-box sizing would have broken that case too. The padding was always honoured;
what was not honoured was the box, because a `flex: 1` container's `min-height` resolves to `auto`
and it refuses to shrink below its intrinsic height.

The distinction mattered for the fix. `border-box` would have changed nothing, and the archetypes
would still have been sizing themselves from constants.

### Three defects found by arithmetic rather than by frames

- **The bottom of the frame was paid for twice.** `Frame` padded `marginY + band` over a band that
  already ends in `SUBTITLE.gap`, so every subtitled composition since decision:40 gave up 148px of
  air where 40 was designed. Invisible while nothing was laid out against what was left.
- **`HEADING_CHAR_WIDTH` was a guess that rounded the wrong way at one boundary.** 29 characters at
  104px came out one character over the measure, so a title that renders on one line was reported as
  two and the composition beneath it lost 110px. Measured: 0.489, not 0.5.
- **`atlas` failed worse than dragon:21 described.** Not occlusion — mutual destruction. `HALO` is
  tuned for text over a field and a world node is a filled plate with a glow, so neither text wins.

### What dragon:21 got wrong, and why it is worth saying

dragon:21 costed a band-aware camera as "a two-line change with a large blast radius: every shot on
every world deck reframes". The first half was right and the second half was not, for a reason the
dragon had in front of it: `band` is zero for every deck that never asked for subtitles. The blast
radius was exactly the decks the feature was built for. A cost estimate that does not check its own
zero case can keep a dragon open for a round longer than it deserves.

### Where it stopped

Exactly where it aimed. A slide can still be over-full, and the answer is the readable floor rather
than an invention: continuation slides were refused because the renderer inventing a scene changes
the number of scenes, and decision:9 forbids anything downstream of compilation touching derived
timing. dragon:14's title-grazing is unchanged in the frames checked, but a world centred in a
shorter box sits closer to the title by construction and that dragon has one more source of pressure
than it did.
