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

**Reassessed after decision:18 and decision:19 (2026-08-06).** Still parked, and the case against
is now stronger than when this was filed.

The new change scene is the deck's tightest cross-scene relationship so far: scene 2 shows one
slide of `examples/witnessglass.yaml` whole, and scene 3 shows that same slide arriving at that
state. If any pair of scenes was going to demand an identity spanning the cut, it was this one.
It did not. The connection is carried entirely by the viewer recognizing the same fourteen lines,
and it lands.

More interestingly, quoting gave continuity a **source-level** basis it did not have before. Two
scenes that name the same `file:` and `slide:` are related in a way a reader of the YAML can see
and a maintainer can grep for — without the renderer holding any concept at all. That is an
identity of *source*, not of rendered element, and it turns out to be the useful half: it makes
the relationship legible to people, and costs nothing in validation scope.

So the ledger is unchanged in direction and heavier on one side. Anchors stay local, every anchor
error stays a statement rather than a search, and the thing that would actually have to be built
— a persistent layer or shared-element transitions — is still not implied by anything a real
artifact needed.
