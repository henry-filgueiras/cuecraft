---
id: spr_01KZHN1D4M2KAT6HS8CB37BEEJ
sequence: 13
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
---

# Give the narration a floor, not a box

## Goal

Find the smallest visual structure that makes an *unnamed* subtitle read as narration rather than
as another line of the slide, without spending anything that already works about the named form.

decision:40 shipped and the two specimens disagree with each other. `examples/aside.yaml` is
pleasant: a small tracked uppercase name in the speaker's colour, then the sentence under it, and
the eye classifies the pair as one component in a different register from the slide. WitnessGlass
is not: on the `index` slide, "what it returned," sits at the same left edge, in the same weight
and nearly the same size as the four list rows above it, directly under the list's own last
hairline. It reads as **row 05**.

The hypothesis under test is not "speaker names are good". It is that the named form accidentally
bought a *two-row typographic hierarchy* and a mark in a non-paper register, and that the hierarchy
rather than the identity is what does the work.

## Rationale

The next film is the two-narrator "The Retry That Charged You Twice" explainer, which decision:40
was built for. That film will have named narration throughout and would never surface this. Every
other subtitled deck cuecraft will ever have is single-narrator, so the defect specimen is the
common case and the pleasant specimen is the rare one. Fixing it after the explainer means
re-cutting the explainer.

## Success criteria

- An unnamed subtitle on the WitnessGlass `index` slide is not readable as a fifth list row, judged
  from rendered frames rather than from source.
- `examples/aside.yaml`'s named treatment is unchanged or better, judged the same way.
- At least three variants are rendered and watched against both specimens before one is chosen.
- The chosen treatment is a subtitle-local change: no layout engine, no safe-area machinery, no
  authored knob for opacity, height, padding or spacing.
- `subtitleTrack`, `subtitleAt`, and every frame in the compiled timeline are untouched. The
  invariant test that a deck compiled with and without subtitles produces byte-identical WAVs and
  field-identical timelines still passes.
- `npm run check` and `scarp doctor` pass, and the round's finding is recorded whichever way it
  lands — including "the current implementation was strongest", if that is what the frames say.

## Non-goals

- **Word timing, reveal, karaoke, forced alignment.** idea:19 owns that seam and it needs a
  dependency this round is not adding.
- **A HUD framework.** The vocabulary is useful for thinking and is not a module. If the treatment
  needs more than the subtitle component and the constants it already reads from, it is wrong.
- **Resolving dragon:21.** The two bleeding compositions still overlay. A scrim that happens to
  help them is a side effect, not the round's claim, and teaching the camera about the band is
  explicitly still out.
- **Inventing an identity for unnamed narration.** No "NARRATOR", no deck title in the label slot,
  and under no circumstances a Kokoro voice id. A mark that says "a block begins here" is allowed;
  a mark that says "someone is speaking and here is who" is not, because nobody was named.
- **Per-cue or per-slide subtitle anything.** `defaults.subtitles: true` remains the entire
  configuration surface.
- **The explainer itself.** This round ends when the treatment settles.

## Outcome

Every success criterion met, and the winning variant was not the one the round expected.

The `index` slide's unnamed subtitle no longer reads as a fifth list row: it has the deck's own
opening mark above it, in the one accent colour nothing near it is using, on the same screen row in
every frame of every film. `aside` renders **byte-identical** to before — the round cost the
pleasant specimen literally nothing, which was its condition for touching the other one. Four
treatments were rendered against both specimens and a third deck, `subtitleTrack` and `subtitleAt`
were not touched, and no authored knob was added. decision:41 records the argument, dragon:22 the
one case nothing has rendered.

### What the round found that source review would not have

**The hypothesis was right about the mechanism and wrong about the fix.** The named form's advantage
is a second typographic register, not identity — that held up. But the round's preferred realisation
of it, an empty reserved row (variant C), delivers the geometry and none of the hierarchy. Rendered,
it is a sentence floating slightly lower; on the `statement` slide, which has nothing near the bottom
to be confused with, it is indistinguishable from doing nothing. The row had to *hold* something.

**The scrim cannot work here, and the reason is structural.** Not taste, not banding — arithmetic.
`COLORS.ink` is already the darkest colour cuecraft ever puts on a frame, so a darkening scrim is ink
painted over ink: measured, the ramp moved the darkest pixel beneath it by one level, on
`witnessglass` and on `tap`'s lit transcript world alike. decision:40 rejected a scrim on inherited
evidence about a radial highlight; this round rejected it on its own measurement, which is a better
reason and a reusable one. Any future proposal to separate a layer by darkening it in this deck is
answered in advance.

**The camera made the argument for free.** The strongest single piece of evidence was not
`witnessglass` at all — it was `tap`, where the transcript world pans under a stationary mark and a
stationary sentence. Narration reads as HUD *because* everything else moves. decision:36 and
decision:40 had already bought that property; nothing here had to be built to collect it.

### Where it stopped

Exactly where it aimed. The band grew by one row for unlabelled subtitled decks and `witnessglass`
absorbs it on all four archetypes; dragon:21's two bleeding compositions still overlay, one row
taller, and teaching the camera about the band remains out. The two-narrator explainer decision:40
was built for is now unblocked.
