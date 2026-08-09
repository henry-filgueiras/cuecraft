---
id: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
sequence: 31
kind: sprint
status: active
created: 2026-08-09
---

# Hold up something that moves, and let the narrator stop it

## Goal

Give cuecraft its first temporal medium, and prove that decision:63's lowering is what a real one
actually needs.

The round is staged, and each stage is gated on the one before it:

1. **Atomic.** A slide can hold up an MP4 a program computed during this compilation, play it
   whole, and let ordinary narration continue after it. One occupant of the one cursor, with a
   measured duration.
2. **Rendezvous.** The medium may carry semantic events in *local media time*; narration may
   subscribe to one; the pair lowers, before frames exist, to `slice / aside / slice`. The medium
   holds its frame while the narrator speaks over it.
3. **Replay.** A stretch: show an interval of the medium again, slower, and return to the frozen
   frame — as another time mapping and not as a feature the timeline understands.

The demonstration is k-means, because the interesting thing about it is a *state it reaches* and
because a still of the fourth pass throws away exactly what makes it worth showing (idea:27's
"Evidence" test, met by a concrete artifact rather than by argument).

## Rationale

idea:27 is parked behind two gates, and both are now open enough to act on. Its adoption rule is
"a real artifact whose evidence is a computation over a time-like dimension"; an animated k-means
is one. Its kill conditions are the two things this round must actively try to trigger: a medium
whose events want **authored timecodes**, and a lowered form the **camera planner cannot survive**.

The design being tested is decision:63's, in one sentence:

    rich declarative semantics -> compile-time lowering -> boring straight-line temporal leaves
      -> the existing one-cursor timeline -> render

What makes it cheap to test is that cuecraft's exhibit machinery already crosses a process
boundary, already runs before narration is synthesized, and already has a protocol whose author
said adding an output type is "a line in a list plus a validator" (decision:56). If a temporal
medium is genuinely just a fourth thing a program can hand back, that claim gets its third test.

## Success criteria

- A deck can name a program that computes an MP4, and the film plays it whole in the room the
  exhibit archetype gives it, at the frames the timeline assigned.
- The medium's duration is a **measurement taken at materialization**, known before
  `compilePresentation` runs and long before `buildTimeline` needs it.
- `framesFor` is still the only conversion from seconds to frames, and `buildTimeline` still walks
  one cursor. Nothing downstream of the timeline learns that a medium exists that could not already
  have been told in terms of a frame and a duration.
- `npm run check` and `scarp doctor` pass; every existing deck renders unchanged.
- A rendered MP4 exists and has been **inspected at its own scene boundaries**, not by uniform
  sampling — sprint:29 lost a short final slide to exactly that.
- On the rendezvous stage: the film freezes the medium at an annotated iteration, narrates over the
  held frame, and resumes from the same local position, with the aside's duration extending the
  film rather than consuming the medium.
- Whatever is not reached is recorded with the reason, and idea:27 is updated against what was
  actually demonstrated rather than against what was attempted.

## Non-goals

- **No runtime scheduler, no second clock.** decision:63 refused both and the reasons do not
  expire. A medium may not ask for time; it is annotated, it does not negotiate.
- **No audio from the medium.** cuecraft has one producer of sound. If embedded audio costs
  anything at all, silent media is required and the refusal is written down.
- **No overlap and no concurrency.** One medium per slide, one slice at a time, no two things
  moving at once.
- **No encoder, no player, no playback controls.** Encoding stays on the far side of the process
  boundary (decision:5). There is no seek bar, no rate key an author can write, and no `video:` key
  naming a file in the checkout — every objection decision:55 makes to `image:` is inherited whole.
- **No authored timecode.** The format has never had one and this must not be where it gets one. A
  moment is a name in the medium and a name in the deck; if the experiment ever wants a number in
  the YAML, that is a kill signal for idea:27, not a small widening.
- **No general animation authoring.** cuecraft does not gain a way to *make* motion. It gains a way
  to *hold up* motion something else made.
- **No temporal-event ontology.** A stable identifier and a local timestamp, or the round has
  over-generalized.
