---
id: spr_01KZHN1D4M2KAT6HS8CB37BEEJ
sequence: 13
kind: sprint
status: active
created: 2026-08-08
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
