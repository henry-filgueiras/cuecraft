---
id: tsk_01KZKTKSQWC67VQHXH4STX8FR3
sequence: 136
kind: task
status: closed
sprint: spr_01KZKTKSPY5G3YBV970RWWAM0T
created: 2026-08-09
closed: 2026-08-09
---

# Make the veil occupancy, and derive its hold

## Objective

Drive the veil from occupancy rather than from heat, with the hold derived from the sentence.

## Acceptance criteria

- One region in focus at a time, beginning at its anchor's frame.
- The hold comes from the activating clip's measured length, not from a constant.
- Consecutive sentences hand over without the veil dropping between them.
- Sentences far apart release in between.
- The mark left behind is unchanged.
- Derived locally; `anchor.ts` untouched, and no third global envelope.
- Unit-testable without a browser, and covered.

## Done, and the hold is the sentence

`src/render/exhibit.ts`, 180 lines, plain TypeScript and no Remotion import so the whole model is
unit-testable. Twelve tests, none of which needs a browser.

    focusSpans   one claim per sentence, from the anchor's frame to the end of its measured clip
    focusRuns    consecutive claims that never let go, merged
    focusAt      strength from the run, opening from the span

**The hold is derived.** An anchor carries `clipIndex`, the clip carries `durationInFrames`, and the
clip was measured — so how long the chart stays emphasized is how long the sentence about it lasts.
Nobody wrote a number, and rewording the narration changes it (decision:58, and decision:35's move
applied to a different question).

### The first version pulsed, and the arithmetic said so before the film did

Giving each span its own rise and fall and taking the maximum *looks* like it handles a handover:
the outgoing fall and the incoming rise overlap, so something is always up. But they cross at two
thirds — a 33% lighten and back at exactly the moment attention is supposed to be moving. A smaller
version of the artefact the round exists to remove.

The test caught it before a render did, because it asserts the property rather than the constants:
every frame from the first hold to the second's end must be exactly 1. It failed at frame 161 with
0.95.

So the rule is stated instead of hoped for: **an interrupted release is not a release.** Spans merge
into a run when the next begins before the veil would have finished settling, and the threshold is
`fall` itself rather than a new constant — because that is the definition, not an approximation of
one. A short authored `pause:` between two chart sentences therefore cannot strobe, and a genuinely
distant pair still releases.

### What moved and what did not

`ANCHOR_TIMING` and `WORLD_TIMING` untouched; every other archetype identical. The mark left behind
still comes from `degree`, so decision:23's second half stands. The veil went 0.66 to 0.55 because
it now persists, and a dimmed bar still has to be legible rather than hidden.

The opening travels between regions over 12 frames rather than cutting, because a cut at full veil
is a second flash. Mid-travel it is a window spanning the two, which reads as attention sliding —
checked on frame 1982 of the film.
