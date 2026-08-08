---
id: spr_01KZHRVYW57XJRGBFQYN90SGCS
sequence: 14
kind: sprint
status: active
created: 2026-08-08
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
