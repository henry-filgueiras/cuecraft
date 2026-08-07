---
id: dec_01KZCWM5A1C0K5XH1Q35Z1DNFT
sequence: 27
kind: decision
status: accepted
created: 2026-08-06
---

# Freeze what the compilation derived, and let a presentation name a kind of it

## Context

idea:12 parked "derive a figure from the presentation's own compilation" as speculative, and it
stayed parked because the obvious version of it is a trap. A presentation that can read derived
values is one keystroke from a presentation that *speaks* one — and a narration whose words depend
on the length of that narration has no fixed point. The idea was right and the shape was missing.

decision:25 supplied the shape without meaning to. A concept can have an inside, and the inside is
an ordinary composition drawn at an arbitrary scale. So the question stopped being "how does an
author reach compiler state" and became "what is the smallest thing an author could say that would
make the compiler put its own output inside a concept".

The answer is a noun.

## Decision

**The compilation freezes what it derived, and a presentation may name a kind of it.**

```yaml
timing:
  label: Derived timing
  detail:
    figure: timing
```

`figure:` is the whole of the vocabulary: one key, one value, from a closed set of two. There is
no field path, no expression, no aggregation, no filter, no format string, and no way to bind a
value to a name. The author says which sort of truth to show; the renderer decides which facts are
relevant, how many of them, in what order, and how they are set.

**The freeze boundary is the last statement of `buildTimeline`.**

```
author -> synthesize -> measure -> lay out the timeline -> FREEZE -> project -> render
                                                              ^
                           everything to the left is closed by the time
                           anything to the right can read it
```

`CompilationFacts` is a small read-only record — clips with their measured seconds and placed
frames, anchors with the identity, the sentence that reached it, and the frame it resolved to —
computed from scenes that are already final, `Object.freeze`d, and carried to the renderer as part
of the timeline it already receives.

**Three things make a cycle unreachable, and only the third is a rule anybody has to remember:**

1. A figure contributes **no elements and no text**. `bodyElements` returns nothing for one, so no
   anchor can point into it and it adds no words to measure. Scene durations are already final.
2. Facts are derived from finished scenes and have no way to reach back.
3. **The format cannot interpolate a derived value into narration.** There is no binding syntax in
   `say:`, deliberately. An author who *types* a duration into a sentence has hard-coded a number
   like anyone hard-codes a number, and the figure beside it will visibly disagree — which is a far
   better failure than a compiler that will not settle.

The invariant is stated as a test rather than as a promise: a deck containing a figure produces
byte-identical clips, anchors and totals to the same deck without one.

**Raw compiler state is not presentation content.** Thirty resolved anchors listed at once is a
debugger. Both figures *project*: they select the neighbourhood of the moment, order it the way it
is heard, keep the current row where it is rather than re-centring on every step, and light what is
true now. Selection, ordering and emphasis are the renderer's, exactly as composition always has
been. The numbers are never adjusted.

**The two figures divide by what kind of truth they are.**

- `timing` — one rail, one span per synthesized sentence, positioned and widthed by the frames the
  compiler assigned. Underneath, the sentence being spoken *right now* and its real length at the
  size a headline is set. The marker is not a runtime clock: the render is deterministic, so where
  the video has got to is this frame against the frozen boundaries — derived from the same fact as
  the sound.
- `anchors` — two columns, and the gap between them is the thesis. On the left a sentence somebody
  typed and the name of what it is about; on the right a number nobody typed and nobody could have.

Colour carries the argument and nothing else: **authored** is a specimen's cool, **derived** is the
deck accent, and **measured time** gets a mint that appears nowhere else in cuecraft, because a
duration is neither an intention nor a consequence.

## Consequences

- `Timeline` gained one field and `buildTimeline` gained one statement. Nothing else in the
  compiler changed, and no compiler internal became reachable.
- The figures are the first cuecraft graphics where a **number is the subject**, so numbers are set
  at display scale in the mono face and the prose around them is small. Inverting that hierarchy is
  the entire difference between explanation and instrumentation.
- Ninth archetype, and it is one rather than two: `timing` and `anchors` are two shapes of one
  role, and the role picks the composition while the shape decides within it (decision:15).
- The self-verifying moment falls out rather than being staged. The cue that opens the anchors room
  is itself an anchor, so the row lit while the viewer is standing in that room is the compiler's
  record of the event that put them there. Nothing arranges this; it is what the data says.
- Widening `FIGURE_KINDS` is now the tempting move, and it is a decision rather than a knob. The
  third kind anybody wants is presentation state, and dragon:10 records why it was not built.
