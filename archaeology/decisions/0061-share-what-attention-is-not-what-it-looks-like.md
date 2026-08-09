---
id: dec_01KZKZHA810KFW7W7RYV49TNA7
sequence: 61
kind: decision
status: accepted
created: 2026-08-09
---

# Share what attention is, not what it looks like

## Context

decision:47 gave the machine a fourth activation quantity — occupancy: persistent, exclusive,
released — because decision:17's three numbers cannot say *this is current and that one no longer
is*. decision:58 applied the same shape to a chart region and put it in `render/exhibit.ts`, local,
with an explicit note that a third global envelope would be claiming a defect the activation model
does not have.

idea:20 parked promoting occupancy into `anchor.ts` and named the test precisely: **one caller is
not evidence**, and what actually gets shared "turned out to be narrower than it looked from one
side" both previous times a shared abstraction was considered. The cheap experiment it asked for was
a second implementation.

sprint:28 produced two more callers — a named element of an SVG, and a row of a computed table — so
the sharing could be measured instead of guessed.

## Decision

**Attention is shared by the exhibit family and by nothing else.**

`render/attention.ts` holds the interval model: when attention starts, when it ends, whether two
claims are one, and how far a handover has got. The hold is still derived from the measured clip
(decision:58), the merge rule is still "an interrupted release is not a release", and the threshold
is still `fall` itself.

**`anchor.ts` is untouched.** No fourth number, no third global envelope, and eleven archetypes that
only ever ask "has narration reached this yet" are unchanged. idea:20 stays parked, and now with
evidence rather than caution behind it — see below.

**A track is a predicate over element indices.** A table holds a row focus and a column focus at
once; within a track attention is still exclusive, because "which row are we on" has one answer.
Two tracks rather than one occupancy over a set is what makes row-and-column expressible **without
`activates:` learning to take a list, a pair, or a selection algebra** — the intersection is what
the viewer sees when both tracks happen to be lit, and nothing computes it.

**Ground is exact and is reported as nothing.** Outside every run the model returns `undefined`
rather than a zero, so an archetype that draws nothing when there is no attention is *by
construction* identical to the frame it started on. That is what makes decision:59's round trip a
tautology instead of a promise.

## Consequences

- **What got shared is narrower than the model, exactly as idea:20 predicted.** Three consumers
  share the *arithmetic over frame numbers* and share none of the treatment: a chart veils
  everything else because a raster cannot recolour part of itself, a drawing recedes its other named
  elements because it can, and a table lights a row and goes and finds it. One vocabulary, three
  dialects — decision:17's phrasing with the nouns changed.
- **What was left behind in `render/exhibit.ts` is one function**, and that is the honest measure of
  how much of decision:58 was ever about charts: a rectangle travelling between two rectangles. No
  other exhibit has a hole to move, so the geometry stayed put rather than being generalized into a
  shape nobody else has.
- **idea:20 is now answerable and the answer is still no.** Occupancy in a machine is exclusive
  because a scenario has one traveller; occupancy on a table is exclusive *per axis*; occupancy in a
  transcript is not obviously exclusive at all. Three implementations later, what they share is an
  envelope over intervals and not a quantity elements carry — so promoting it into `anchor.ts` would
  give eleven archetypes a number they do not read.
- **The revenue deck renders identically.** decision:58's behaviour was reproduced through the shared
  model rather than reimplemented, and the tests that were written against the veil still assert the
  same properties through it.
