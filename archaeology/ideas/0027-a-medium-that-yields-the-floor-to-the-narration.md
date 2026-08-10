---
id: ide_01KZMB589K9HZGMM56W9KYH96W
sequence: 27
kind: idea
status: adopted
created: 2026-08-09
adopted-by: "[[dec_01KZMGJESEHN3HJSBR3M43FQDB|Let a film name what it reaches, and a sentence hold it there]]"
---

# A medium that yields the floor to the narration

## Problem

Everything cuecraft can put on a slide is still. A world is laid out once, a specimen does not move,
and an exhibit is a PNG, an SVG or a table that R drew before a syllable was synthesized. The one
thing that advances is the narration, and every visual is a function of where the narration has got
to.

Some evidence is not still. A computation over a time-like dimension, a simulation, a system
evolving — the interesting moment in those is a *state the medium reaches*, and the sentence that
explains it wants to be spoken while the medium is holding that state, not before it and not after
it. Today the only way to say "look at this moment" is to have R draw that moment as a still, which
throws away the thing that made it worth showing.

The relationship cuecraft is missing is the dual of the one it has. `activates:` is narration
reaching a representation. What a medium wants is the other direction: it reaches a semantic state,
the narration has something to say about that state, so the medium holds and hands over the floor.

## Sketch

**The medium lowers to slices. There is no scheduler and no second clock.**

    medium 20s, annotated with A@5s and B@14s; narration subscribes to A and B

      ->  slice[0,5]   aside(A)   slice[5,14]   aside(B)   slice[14,20]

Five leaf occupants of the one serial cursor `buildTimeline` already walks, each with a known
duration, converted by the one rounding rule. Everything downstream of the timeline — camera plans,
anchors, beats, subtitles, facts — sees the sequence it has always seen.

**Which annotations become yields is a compile-time set intersection.** The medium may be densely
annotated; only `annotations ∩ subscriptions` become scheduling boundaries. Several cues subscribed
to one event produce one rendezvous with an ordered queue, not repeated holds at the same position.
This is available for free because compilation knows the whole film before frame zero.

**Where each part lowers is fixed by what is known when**, and this is the part that was checked
rather than assumed:

- **structure** — in `bindNarration` (`presentation/nest.ts`), beside `enter:`, which is already
  spliced there. The medium's slices and the asides between them become an ordinary flat cue list.
- **measurement** — at `materializePresentation` (`compile/materialize.ts`). The medium's duration
  and its events' local times are measurements, and they belong at the same stage as R for the same
  reason: a broken medium should not cost a minute of Kokoro. This is the stage that must learn
  something new; it is the only one.
- **placement** — in `compilePresentation`, by borrowed duration, exactly as a recall is placed.
- **frames** — unchanged. `framesFor`, one cursor, prefix sums.

**Freezing is three sequences, not a feature.** Remotion already exports `OffthreadVideo`, `Freeze`
and `Sequence`. A slice is the medium played from a local offset for a duration; a hold is the same
source under `Freeze` at the local time it stopped. The visual world does not change across the
boundary — the medium stays on screen holding its state while narration, subtitles, camera and
ordinary semantic activation run over it, which is the whole perceptual point and is what
distinguishes this from cutting away to another slide.

**Authoring vocabulary is not settled and should be chosen last.** `during:`, `yield`, and a
subscribing `at:` are all plausible; none of them is a requirement, and none of the internal
mechanics above should be visible to an author. What an author states is that a sentence and a state
of the medium are the same idea — which is decision:14's sentence with a different noun, and is the
strongest sign that the surface will be small.

**Instant replay would be nearly free and should still not be built first.** `RecalledCanvas`
already remaps an earlier interval of the film to a shifted local time and was proven
byte-identical (sprint:15); replaying an interval of a medium slower is that mapping with a
different source and a slope. It is a good second artifact and a bad first one.

## Boundaries

- **Gated behind a scene-type decision, not behind this artifact.** A medium with a time axis
  crosses decision:2's line, and idea:2 says the interesting question is whether the scene seam
  holds once a second type exists at all. That decision comes first; this is the timing design that
  follows it, and on its own it builds nothing.
- **No runtime scheduler.** decision:63 refused it and the reasons do not expire: one producer, no
  blocking, and a call stack already inlined before frame zero.
- **No second clock, no overlap, no preemption.** A slice is a leaf on the existing cursor or this
  design is not what shipped.
- **The medium may not ask for time.** It is annotated; it does not negotiate. A medium that could
  extend the film would be the thing decision:9 exists to prevent.
- **No nesting in the first cut.** One root narration, at most one medium, slices and asides
  alternating. A medium inside an aside inside a medium is not obviously wrong and is not obviously
  needed.

**What was built, and where the sketch was wrong.** sprint:31 built it, and the two decisions that
came out — decision:64 for atomic playback, decision:65 for the rendezvous — say it nearly as this
artifact does. Three corrections are worth keeping:

- **The gate was pointed at the wrong seam.** This was parked behind "a scene-type decision", on the
  reading that a thing with a time axis crosses decision:2's line as a *scene*. It does not. A film
  is a fourth thing decision:56's protocol can carry and a fourth arm of `ExhibitResource`, and
  nothing in `layout.ts`, `body.ts` or the composition set learned a new kind of slide. idea:2's
  question is exactly as open as it was.
- **The structure does not lower in `bindNarration`.** This artifact predicted it would, beside
  `enter:`. It cannot: a slice's endpoints are a measurement of a file that does not exist at parse
  time, so the whole lowering happens at materialization. What the parser can check, and does, is
  the half that is a fact about the source — that the slide has a program, that nothing plays one
  film twice, and that a `during:` sits inside the run of cues its film is going to be cut around.
- **"Freezing is three sequences" was one sequence too many.** It is *zero*. `buildTimeline` already
  derived a hold between slices, and a hold is the playback mapping with its rate set to zero, so
  nothing in the renderer changed and nothing in it knows the word. Instant replay likewise: it is
  the same leaf with a different origin and a different slope, and it was built in the same round
  rather than deferred, because by then it was four lines.

**What the round did not test**, and this artifact named it as one of the two things that would kill
the design: whether a *camera plan* survives having a segment inserted between two cues. A temporal
exhibit selects the `exhibit` archetype, which has no camera, so the question is untouched. The
first deck that puts a rendezvous inside a world is what answers it.

## Evidence

Adopt when a concrete presentation is blocked on it — the same rule idea:2 sets. Specifically, when
there is a real artifact whose evidence is a computation over a time-like dimension and whose
explanation genuinely has to be spoken *at* a state rather than after it. R generating an animation
rather than a plot is the likely source, and dragon:33 is already the reason to be careful about
what that costs in reproducibility.

Two things would kill it rather than delay it: a first medium whose semantic events turn out to want
authored timecodes (which would put an absolute timestamp in the source, and the format has never
had one), or a lowered form that the camera planner cannot survive — a plan built from anchors and
calls at absolute frames having a segment inserted between two cues. The second is cheap to falsify
before anything is built, and should be the first thing a future round does.
