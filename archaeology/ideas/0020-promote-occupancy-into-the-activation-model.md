---
id: ide_01KZJBGYR01EN76GGYRDP8RENR
sequence: 20
kind: idea
status: parked
created: 2026-08-08
---

# Promote occupancy into the activation model

## Problem

decision:47 gave `circuit` a fourth activation quantity — occupancy: persistent, exclusive, and
released — because decision:17's three numbers could not say *this is where the machine is now, and
that other one no longer is*. `heat` is a transient by construction and `degree` is monotone and
never comes back down.

Occupancy is not obviously about state machines. It is about anything with a **current one**, and
cuecraft has at least two compositions that already fake it:

- The transcript computes `current` from the beats on every frame and derives everything from it by
  hand — which lane is involved, how old each message is, how much presence a row keeps. That is
  occupancy with a different name and no model behind it.
- The cascade and the index accumulate `degree` down a list and have no way to say which stage is
  the one being talked about *now* rather than which stages have been reached.

## Sketch

Promote occupancy into `./anchor.ts` as a fourth number beside `degree`, `heat` and `sweep`, derived
wherever a body publishes an ordered list of occurrences, and let any archetype that wants it read
one instead of recomputing one.

## Boundaries

Two reasons it is parked, and the second is the real one.

A fourth number in a model eleven archetypes read is a change with eleven blast radii, and
decision:23's recalibration is *still* scoped to the atlas three rounds later — cuecraft already
holds two interpretations of the three numbers it has, and adding a fourth before reconciling those
would be adding a fourth interpretation too.

And **one caller is not evidence**. decision:36's rule for the camera and `./polyline.ts`'s for the
polyline geometry were both applied only when a second implementation demonstrated the sharing, and
both times what actually got shared turned out to be narrower than it looked from one side.
Occupancy in a machine is exclusive because the scenario has one traveller; occupancy in a
transcript is not obviously exclusive at all, because a step has two ends. Whether those are one
concept or two words is exactly what a second implementation would settle, and guessing now is how
a strategy object gets born.

## Evidence

**The experiment was run in sprint:28, and the answer is still no** — see decision:61.

This idea's own criterion was that one caller is not evidence and that a second implementation would
show what actually gets shared. Two arrived: a named element of an R-drawn SVG, and a row of a
computed table. What they share with the chart region is an **envelope over intervals** — when
attention starts, when it ends, whether two claims are one, how far a handover has got — and that
now lives in `render/attention.ts`, read by the exhibit family.

What they do not share is a *quantity elements carry*, which is what a fourth number beside `degree`,
`heat` and `sweep` would be. The prediction in the paragraph above held exactly: occupancy in a
machine is exclusive because a scenario has one traveller, occupancy on a table is exclusive *per
axis* rather than outright, and occupancy in a transcript is still not obviously exclusive at all.
Promoting it would hand eleven archetypes a number none of them reads.

So this stays parked, and it is now parked on measurement rather than on caution.

The transcript rewrite below is still the outstanding half of the test and was not attempted.

The cheap test, when it comes: rewrite the transcript's `current` / `presence` / `lit` derivation
against a shared occupancy and see whether it gets shorter or merely gets a parameter.
