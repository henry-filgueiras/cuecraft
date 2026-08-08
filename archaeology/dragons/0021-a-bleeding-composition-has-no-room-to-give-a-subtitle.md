---
id: drg_01KZHKCC9ZA0JBFAJN0DZDA9P4
sequence: 21
kind: dragon
status: closed
created: 2026-08-08
resolved-by: "[[dec_01KZHTVPFQ43296K26YHCKP26E|Let a composition be laid out inside the box it was given]]"
---

# A bleeding composition has no room to give a subtitle

## Context

decision:40 puts a subtitle in screen space and takes the room it needs out of the composition
below it: `Frame` grows its bottom padding by a derived band, `bodyBox` subtracts the same, and
every fitted composition — specimen, formula, figure, population — is laid out into what is left.
Nothing is ever drawn underneath the narration.

Two of the nine archetypes cannot participate. `atlas` and `transcript` ask `Frame` for full bleed
because what they are showing extends past all four edges (decision:22, decision:34): there is no
margin to give up, and the camera fills the frame by construction. So on those two the subtitle is
*overlaid* on the world, and the camera knows nothing about it.

Watched, it is better than it sounds and worse than the rest of the deck. A protocol keeps one row
of unhappened traffic below the active row (`TRANSCRIPT.lookaheadRows`) and an atlas pads its
subject, so the bottom of the frame is usually field rather than content — the subtitle lands in
empty space most of the time. Most of the time is not a rule.

## Question

Should a camera be told how much of the frame is spoken for, or is overlaying the bottom of a
world the correct answer for a composition that has already declared it has no edges?

## Constraints

- `fitTo` and `shotFor` (`render/camera.ts`) frame a rectangle into a viewport of a given size.
  Reserving a band means either shrinking the viewport and offsetting the transform, or teaching
  every planner about a safe area. decision:36 split the camera from the space it looks at
  precisely so that policies about *this space* stay out of it — a subtitle is about neither.
- The band is a deck-wide constant already. Handing the camera `height - band` and translating the
  result up by half the band is a two-line change with a large blast radius: every shot on every
  world deck reframes, and the pacing derived from `interpolateZoom` changes with it.
- The alternative — moving the subtitle somewhere else on a bleeding composition — is refused for
  the reason the band exists at all: a subtitle that is in a different place on slide 4 than on
  slide 3 is the jitter this design spent its effort eliminating.

## Candidate direction

Leave it, and watch for a frame where it actually costs something. The overlay is legible (the
halo carries it), stable (it does not move with the camera, which is the whole point), and the
compositions it sits on are the two that already treat the frame as a window rather than a page.

## Resolution criteria

- **A shot where the subtitle covers the thing being explained.** Not a shot where it covers *a*
  thing — a shot where the sentence on screen is about what the sentence on screen is hiding. None
  has been found in `examples/tap.yaml` or `examples/order/`, and neither deck was written with
  subtitles in mind, which is the useful part of that evidence.
- **A world deck built to be subtitled**, where the camera's ignorance of the band is a design
  problem rather than a hypothetical one. The two-narrator explainer this feature was built for is
  the obvious candidate.
