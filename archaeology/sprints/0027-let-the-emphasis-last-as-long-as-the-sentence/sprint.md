---
id: spr_01KZKTKSPY5G3YBV970RWWAM0T
sequence: 27
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Let the emphasis last as long as the sentence

## Goal

Make an exhibit's emphasis last as long as the sentence that caused it, instead of flashing for
eight tenths of a second and snapping back.

## Rationale

sprint:26 shipped the veil on `heat`, which is `ANCHOR_TIMING`: rise 3, hold 5, fall 16. That
envelope is right for what it was designed for — a bullet changing colour, a plate igniting — and
watching the film shows it is wrong here, for a reason that is about perception rather than taste.

**Every other use of `heat` changes a small thing's colour. This one changes the luminance of two
thirds of the frame.** At that magnitude an 0.8-second in-and-out does not read as emphasis, it
reads as a blink: the screen darkens, an orange box appears, and everything is back before the eye
has finished deciding what happened. The transient decision:17 asked for is being delivered by a
mechanism strong enough to be a *state*.

The repository already has the right shape for this and it is not `heat`. decision:47 settled
occupancy for the machine: **persistent, exclusive, and released.** That is exactly what "which part
of the chart are we talking about" is. One region at a time, from when its sentence starts until
narration has moved on, handed over rather than released when the next sentence names another.

And the duration should not be a constant. The clip that activated the region is measured, the
anchor knows its `clipIndex`, and the sentence's own length is therefore available — so the hold is
**derived**, exactly as decision:35 derives what a silent step is worth. Nobody writes how long a
chart stays emphasized.

## Success criteria

- The veil rises once, holds while the sentence that caused it is being spoken, and releases after
  it — with no visible blink at either end, judged on the film.
- Two regions named by consecutive sentences **hand over** rather than releasing and re-veiling.
- Two regions named far apart on one slide do release in between, because the narration left.
- No authored key reaches any of it. The hold is derived from measured audio; the ramps are
  constants in `theme.ts` and unreachable from the source.
- The persistent mark (`degree`) is unchanged — this round touches what the veil does, not what is
  left behind.
- Every other archetype's activation is untouched. `ANCHOR_TIMING` and `WORLD_TIMING` unchanged, and
  every other example renders identically.
- `npm run check` and `scarp doctor` pass.

## Non-goals

- **No new emphasis.** Same veil, same mark, same palette, same accent. Only *when* changes.
- **No animation vocabulary.** A ramp and a handover. If the handover needs anything more elaborate
  than moving one rectangle, the finding is that it should be a cut, and it gets recorded as one.
- **No change to `anchor.ts`.** Whatever this needs, it derives locally from `Scene.anchors` and
  `Scene.clips`. A third global envelope beside `ANCHOR_TIMING` and `WORLD_TIMING` would be claiming
  this is a general problem, and it is not — it is what a veil over most of the frame costs.
- **Not a revisit of the mechanism.** Regions stay, `shows:` stays, opacity stays subtractive, the
  picture stays opaque. idea:24 stays parked.

## Outcome

**The emphasis now lasts as long as the sentence that caused it, and nobody wrote a duration.**
The veil rises over 0.4s, holds for the whole of "Asia Pacific doubles across the year", hands over
to "Latin America does not move" without dropping, and settles back over 0.9s. The blink is gone.

### The defect was a mechanism used at the wrong magnitude

`heat` is right for what it was built for and wrong here, and the difference is one sentence: every
other consumer of it changes the colour of a *small thing*, and this one changes the luminance of
two thirds of the frame. decision:23's "spend the contrast on the moment" was being delivered by
something strong enough to be a state. The fix was not a longer envelope — stretching it makes two
consecutive sentences both hot and cuts the opening between regions at full strength — it was the
wrong *model*.

The right one was already in the repository. decision:47 settled occupancy for the machine —
persistent, exclusive, released — and "which part of the chart are we talking about" is exactly
that shape (decision:58).

### The hold is derived, which is what makes it cuecraft's answer rather than a tuned constant

An anchor carries `clipIndex`, the clip carries a measured `durationInFrames`. So how long the chart
stays emphasized is how long the sentence about it lasts. Reword the narration and it changes; there
is no key, and there is no constant either. That is decision:35's move applied to a different
silence-shaped question, and it is the part of this round worth keeping if nothing else survives.

### The test found the second bug before the film did

Giving each claim its own ramps and taking the maximum *looks* like it handles a handover — a fall
and a rise overlap, so something is always up. They cross at two thirds: a 33% lighten and back at
exactly the moment attention is moving. A smaller copy of the artefact being removed.

The test asserts the property rather than the constants — every frame from the first hold to the
second's end must be exactly 1 — and it failed at frame 161 with 0.95. So the rule got stated
instead of hoped for: **an interrupted release is not a release.** Claims merge when the next begins
before the veil would have settled, and the threshold is `fall` itself rather than a new constant,
because that is the definition rather than an approximation of one.

### Against the success criteria

Met: rises once, holds for the sentence, releases with no blink at either end, judged on the film;
consecutive sentences hand over; distant ones release; nothing authored reaches any of it; the
persistent mark is unchanged; `ANCHOR_TIMING` and `WORLD_TIMING` untouched and every other archetype
identical; 756 tests and `scarp doctor` pass.

One thing changed that the criteria did not ask for and should have: **the veil went 0.66 to 0.55.**
A depth chosen for a flash is oppressive when it persists — held for three seconds, 0.66 reads as
switching the chart off rather than recessing it, and `anchor.ts` requires a recessed thing to stay
legible. That is a consequence of the round rather than scope creep, and it is in decision:58.

### What was refused and stayed refused

No new emphasis: same veil, same mark, same palette. No animation vocabulary beyond one ramp and one
travelling rectangle. **No third global envelope** — this lives in `render/exhibit.ts` because it is
what one archetype costs, and a constant beside `ANCHOR_TIMING` would be claiming the activation
model has a defect it does not have. Regions, `shows:`, the protocol and the opaque picture all
stand exactly as sprint:26 left them; idea:24 stays parked.
