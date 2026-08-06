---
id: dec_01KZAE2PX2W95W3ZEHBQMM0G5N
sequence: 9
kind: decision
status: accepted
created: 2026-08-05
---

# Compile in two phases and let nothing downstream change derived timing

## Context

dragon:1 posed the ordering problem: Remotion needs a duration in frames before it renders
anything, and that duration comes from audio that does not exist until it is synthesized.
The dragon asked what shape the pipeline takes as a result. Building it once answered that,
and turned up two things that reading could not have.

The first is that the *shape* is trivial and the *arithmetic* is not. A linear pipeline —
read, parse, synthesize, time, render — falls out immediately. What needs care is the
conversion from measured seconds to whole frames, which happens four times per slide and,
done inconsistently, drifts audio against slides over a long deck.

The second is that a renderer can silently alter derived timing. Remotion's
`TransitionSeries` implements crossfades by overlapping adjacent sequences, so a 12-frame
transition makes the video 12 frames shorter and pulls every subsequent scene earlier. That
is the timing authority moving from the compiler into a visual component, which is exactly
the failure dragon:1 exists to prevent.

## Decision

**Two phases, with a small compiled presentation between them.**

    read -> parse -> synthesize -> time -> render

`parsePresentation` produces authored intent. `compilePresentation` attaches each slide's
measured narration and derives `max(minimum, pre_say + narration + post_say)` in
milliseconds. `buildTimeline` lays that onto frames. Only then does anything React exist.

The compiled presentation is *not* the IR parked in idea:3. It carries a slide, its audio,
and a duration — no frames, no pixels, no notion of a second scene type. idea:3 stays parked;
what this earns is the seam it asked for, not the abstraction.

**Parsing and validation** use `yaml` for the document and `zod` for the shape. Validation is
strict: an unrecognized key is rejected, because a typo that silently does nothing is the
worst outcome a compiler can produce. Errors name the slide by the ordinal the author counts
in their editor — `slide 2, slide.title` — and every problem in the document is reported at
once rather than one per run. Durations must carry a unit, so `pre_say: 750` is an error
rather than an ambiguity; frames are not expressible in the source at all.

**One rounding rule, in one function.** `framesFor()` in `src/compile/timeline.ts` is the
only place in cuecraft where seconds become frames, and the rule is that a duration occupies
every frame it touches — always up, never to nearest. Rounding up costs at most one frame of
padding per component and buys a guarantee that is otherwise fiddly to argue: narration is
always fully contained by its scene, and the next slide can never begin over the tail of the
previous one. Because each scene length is an integer computed independently, scene starts
are exact prefix sums; there is no fractional residue to accumulate.

**The renderer may not change the timeline.** Scenes keep the absolute frames the timeline
assigned them, and transitions fade within those frames rather than overlapping them. Total
duration is the sum of scene durations, unconditionally. `renderPresentation` asserts that
the composition Remotion resolved has the frame count the compiler derived, and fails rather
than encoding a video that has quietly disagreed with its own timing.

## Consequences

- Visual iteration is free of synthesis: phase two is pure given its input, so changing the
  look re-renders without re-generating a syllable.
- The whole pipeline is testable without the model. `compilePresentation` takes the narration
  function as a parameter, so the ordering constraint is exercised in milliseconds by a
  stand-in narrator on a machine that has never bootstrapped Kokoro.
- Timing cannot be authored. There is no frame count, no explicit scene length, and no way to
  express one. The only lever is padding, and even that is a duration.
- Strict validation makes adding a field a breaking change for nobody and a deliberate act for
  us: the allowed-key list an error message prints is read off the schema rather than restated,
  so the two cannot drift.
- Two dependencies were added for parsing and validation, plus Remotion and React for
  rendering (decision:5). `zod` earns its place by turning shape validation into data —
  issue paths become "slide 2, slide.bullets.1" mechanically instead of by hand.
- dragon:1 is not closed by this. Its resolution criteria also require that an unchanged
  re-render performs zero synthesis, and there is deliberately no cache yet (decision:3).
  What is settled is the pipeline shape and the rounding rule; what remains is incrementality.
- Render state — narration WAVs and the webpack bundle — lives under
  `.cuecraft/renders/<source-name>/`, alongside the model weights and under the same rules
  (decision:3, decision:8): disposable, never committed, never hand-edited. It is *retained*
  after a successful render rather than cleaned up, because when narration sounds wrong the
  WAV that produced it is the first thing worth listening to. Narration is cleared and
  re-synthesized at the start of every render: without content addressing there is nothing
  that can distinguish a stale take from a current one.
