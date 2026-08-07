---
id: dec_01KZCSJZXAK9FHEDQ7M4CSTAQ7
sequence: 24
kind: decision
status: accepted
created: 2026-08-06
---

# Make the camera earn its moves, and let it hold a good shot

## Context

decision:22's camera solved every shot from scratch. At each narration event it computed the
bounds the moment wanted, fitted them, and moved there. Each answer was individually correct and
the sequence was restless — watching it, the camera reads as nervous rather than confident,
recomposing over things the viewer was already looking at perfectly well.

Before changing it, the eleven moves in the v1 artifact were measured. For each, against the shot
the camera was actually holding when the cue landed: how much of the new target was already
visible, how much slack there was to the frame edge, how much of the frame the target already
occupied, and how much the "correct" answer would change the scale and the centre.

```
event        contained  margin  occupies  scale x  pan/W   verdict
source            100%   0.054      0.09     3.42   0.39   dive — the whole point of the shot
cues               57%  -0.480      0.67     0.53   0.29   real
content            75%  -0.118      0.55     1.07   0.23   marginal: 7% zoom for 25% of a target
speech              0%  -0.295      0.36     1.63   0.40   real
timing             75%  -0.148      0.59     1.01   0.35   a pure pan wearing a recompose
composition         0%  -1.315      1.01     0.59   0.86   real, and the worst move in the piece
elements          100%   0.182      0.36     1.67   0.14   ALREADY ADEQUATE — moved anyway
anchors             0%  -0.878      0.62     0.72   0.65   real
state               0%  -0.611      0.52     1.00   0.54   a pure pan wearing a recompose
remotion           99%  -0.006      0.48     1.25   0.29   moved 25% of a frame for 1% of a plate
video              78%  -0.119      0.54     1.11   0.35   marginal
```

The hypothesis was right and narrower than expected. One move was purely gratuitous —
`elements` was fully on screen with comfortable margin at a readable size, and the camera zoomed
in 67% and nudged sideways anyway. Three more were near-gratuitous. And two (`timing`, `state`)
changed the scale by one percent while translating half a frame, which is a *pan* that the code
had no way to express, so it expressed it as a recomposition that happened to keep its scale.

## Decision

**A move has to be worth making, and the camera has three answers rather than one.**

```
hold        the target is already inside the frame, with room, at a readable size
pan         it fits at this scale but not in this position — keep the scale, move the least
recompose   it does not fit, or it is too small to read: solve the shot properly
```

Three comparisons, not an optimiser. `shotFor(current, bounds, world)` asks them in order and
returns the first that answers, and the ordering is the preference ladder because the three cases
are *perceptually* different rather than differently weighted: a hold costs the viewer nothing, a
pan costs them tracking, a recompose costs them re-orientation. Re-orientation is the one that
reads as nerves.

Two thresholds, both read off the table above rather than guessed:

- **`holdMargin` = 0.045** of the frame's width. The comfortable shot that plainly did not need
  recomposing had 0.18; the tightest that plainly did was clipping at −0.006. The threshold sits
  near the clipping end, because a target touching the frame edge looks like an accident.
- **`holdOccupancy` = 0.21**. Containment alone would have held the opening whole-world shot for
  every target in the piece, because it contains all of them — at nine percent of the frame each.
  Size is the second half of "adequately framed" and neither half works alone.

A minimal pan is a *clamp*: the centre moves the least distance that brings the target inside with
its margin, so the subject ends against the edge it came from rather than being re-centred. That
is what makes a pan cheap — the rest of the frame barely changes.

**A hold emits no camera key at all.** This is the only place in cuecraft where the right answer
to "what should happen now" is "nothing", and it is expressed by the track simply not gaining a
stop. The decision is still recorded, in `CameraPlan.shots`, because a policy you cannot inspect
is a policy you cannot argue with.

## Consequences

- The same eleven-event world now plans as **1 hold, 8 pans, 2 recomposes**, against v1's eleven
  recomposes. The two that remain are the opening dive and the first two-shot, which are exactly
  the two that should be there.
- A consequence nobody predicted: because pans preserve scale, the middle act of the artifact now
  runs at one consistent scale for six events, and it reads as a *deliberate framing* rather than
  as a series of decisions. Stability turned out to look like intent.
- The reveal got its punch back by accident and then on purpose. Holding scale meant the last act
  stayed at the tight end, so the pull back to the whole world is a 3.5x change rather than 1.5x.
  `widest` came down from 3100 to 2600 to keep it that way.
- `cameraTrack` is now a thin wrapper over `cameraPlan`, which returns the track, the per-event
  decisions, and any portals. The extra return values exist to be tested and inspected, not to be
  configured.
- The thresholds are calibrated against one world, exactly as decision:10's were. They will be
  wrong for a world laid out at a very different density, and being two named numbers rather than
  a cost function is what makes being wrong cheap.
