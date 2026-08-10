---
id: dec_01KZMS6SATTEE9Y7DEBFK95QWK
sequence: 68
kind: decision
status: accepted
created: 2026-08-09
---

# Open the argument on something a still cannot show

## Context

The Showpieces section says its videos are "in the order that makes the argument", and slot 1 is
the only one that has a different job from the rest. Slots 2 through 9 argue; slot 1 has to make
somebody want to hear the argument at all.

Two facts about the README made this a decision rather than a chore.

**The temporal exhibit was invisible.** `examples/kmeans/` — sprint:31, decision:64, decision:65 —
appeared **zero times** in README.md. The newest capability in the project, and the only one whose
evidence moves, could not be found by a reader at all.

**Slot 1 opened on a placeholder.** `<!-- VIDEO: tap -->` had no attachment, so the first thing a
visitor met was a comment saying the video was not there yet.

Promoting `examples/kmeans/` into slot 1 would have fixed the first and not the second, and it
was the obvious move. It was refused. That deck was built to prove a mechanism and proves it
well, but its subject is a clustering algorithm and its register is "yes, R can do classic
statistics" — which is a competent example rather than a reason to read the rest of the page.

The audience for slot 1 is people who lose afternoons to Keynote. Most of what cuecraft does is
impressive to an engineer: derived layout, derived pacing, a camera nobody aimed. One thing is
impressive to somebody who has suffered — **the screen recording that has to be re-cut every time
the voiceover changes**. That is the wound the temporal exhibit reaches, and no reader could find
out it existed.

## Decision

**Showpiece 1 is a deck built around the temporal exhibit, on a subject chosen so that a still
frame cannot carry the content.**

`examples/phantom/` reproduces the Sugiyama (2008) ring experiment: twenty-two cars on 230 metres,
every driver asked for thirty kilometres an hour, and a car comes to a complete stop with nothing
in front of it. The cars go forwards and the jam goes backwards, which is a fact about time and
therefore cannot appear in any single frame.

Three rules were held while building it, and they are the part worth keeping:

**The subject must fail the still test, not merely benefit from motion.** This is idea:27's
adoption rule — evidence that is a computation over a time-like dimension — applied to the choice
of showpiece rather than to the choice of feature. A subject that a well-chosen frame could carry
does not belong in slot 1, because the slot exists to show the one thing nothing else here shows.

**A cross-section, but never a tour.** The deck uses six bodies: a field of terms, a protocol, the
temporal exhibit, a specimen of its own source, an addressed SVG, and a statement. Each earns its
place by being the right way to say the next sentence. The table exhibit was deliberately left
out even though it would have fitted, because it is showpiece 8's argument and a flagship that
does everything makes every other section redundant. `child:` was left out for the same reason.

**Quantities the deck speaks are measured, and the deck does not name what the picture can name
itself.** `model.R` refuses to run if the even ring is not an exact fixed point; `wave.R` refuses
to draw if the cars did not stop in strict order. Slide 5 says "the car directly in front of the
one that stopped first" and never says which car, because the drawing writes the car numbers from
the data — so the file cannot go stale on them. Where a number *is* spoken, it is measured off
the recorded run and printed on stdout during the render.

## Consequences

**The flagship needs R and ffmpeg.** Slot 1 is now the deck a first-time reader is most likely to
try to build, and it is the one that cannot be built without `npm run bootstrap:r`. That is a real
cost and it was accepted: the alternative is a slot 1 that does not show the thing worth showing.

**The flagship is the longest film.** Even after two rounds of cutting, `examples/phantom/` is
longer than `examples/sha256/`, which held the record. A deck with six bodies and four
rendezvous cannot be short, and a hook that outstays its welcome is a real risk. Two rounds of
trimming were spent on it and the length is the residue.

**`examples/tap.yaml` keeps its whole section, one slot lower.** It was not displaced or
rewritten; every showpiece after slot 1 shifted by one, and `examples/kmeans/` is now findable as
a sibling reference inside slot 1 — the mechanism's own test artifact, named as such.

**Two things this deck cannot yet defend are written down rather than papered over.**
`dragon:41`: the quantities the narration speaks are checked by nothing, and the obvious test
would be a second copy of the claim rather than a check of it. `dragon:42`: the wave travels at
about twelve kilometres an hour where the experiment reports about twenty, robustly across every
parameter set that produces a single jam — so the deck says the measured number and claims no
agreement with the literature.

**Reordering slot 1 is now a decision, not an edit.** The order is load-bearing: slot 1 hooks,
slots 2 and 3 show the diagram and the descent, slots 7 and 8 carry the R experiments. Moving
something into slot 1 that a still frame could carry gives the slot away.
