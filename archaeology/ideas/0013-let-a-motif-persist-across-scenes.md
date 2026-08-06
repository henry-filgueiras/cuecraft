---
id: ide_01KZCBH8T5B17NYDQ720KXNWK4
sequence: 13
kind: idea
status: parked
created: 2026-08-06
---

# Let a motif persist across scenes

## Problem

Anchors are scoped to one slide. A concept introduced on scene 2 and returned to on scene 6 has
no connection the renderer knows about, so cross-scene continuity is entirely stylistic — shared
margins, one accent, one type scale.

The presentation form this blocks is real and common: a diagram built up across several scenes,
where each slide adds to a structure the previous one established rather than replacing it.

## Sketch

An identity that outlives its slide — declared once, reachable from later scenes, persisting
visually across the cut.

## Boundaries

This one is filed to be argued *against*, because it will be proposed again and the reasons not
to build it are worth keeping.

1. **It breaks the invariant that makes validation legible.** Every anchor check today is local
   to one slide, which is why every error message can name a slide and a cue. A cross-slide
   identity makes the scope the whole deck, and "activates `tools`, which nothing declares"
   becomes a search rather than a statement.
2. **It requires the infrastructure the design has twice declined.** Either shared-element
   transitions, or a persistent layer drawn outside the per-scene compositions. Both are the
   animation machinery `decision:10` and `decision:17` exist to avoid, and neither falls out of
   anything that already exists.
3. **The payoff was available for free.** The self-demo's scenes 2 and 6 are connected in a way
   viewers notice — same composition, same phrase ("in full"), one sixth the content — and that
   cost no vocabulary at all. Rhyme is cheaper than machinery and, at this scale, works.

## Evidence

Adopt when a deck genuinely needs to *construct one diagram over several scenes* and rhyme has
been tried and is not enough. Wanting two slides to feel related is not that; it is a writing
problem with a writing solution.

If it is ever adopted, the honest version is probably not "anchors across slides" but a distinct
concept with its own name and its own validation story, because overloading `activates` to mean
two different scopes is how the format would start lying about what it does.
