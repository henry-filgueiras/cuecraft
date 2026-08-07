---
id: dec_01KZD02SKQ296PDNC15D01N8HZ
sequence: 29
kind: decision
status: accepted
created: 2026-08-06
---

# Compose the shot when what happens next is not a shot

## Context

decision:24 taught the camera to decline. `shotFor` asks whether the shot it is already holding
frames what was just said — inside the frame, with margin, at a readable size — and if it does,
nothing happens. That is right for a traversal, where every shot is followed by another shot, and
it is most of why the world reads as a place rather than as a slideshow.

Twice in a scene the thing after a shot is not another shot, and measuring the observatory showed
both failing in the same way.

**Going inside a concept.** The portal's whole trick is that the plate's own outline arrives at
the edge of the picture and stops there, so the frame *becomes* the inside of the node. That only
reads if the plate is where the picture's centre is. It was not. At the frame the expansion began:

```
                camera centre    plate centre off centre    margin
timing          (1021, 648)      +0.243, +0.000             0.060
anchors         (1518, 637)      +0.277, +0.289             0.303
```

Both were `pan` decisions — perfectly adequate framings, the subject comfortably on screen against
the margin it came from, exactly what decision:24 asks for. And both expanded from a rectangle
sitting a quarter of a frame off to one side, so the transition read as "scale this box from over
there" rather than "enter this concept". The expansion also had to pan that distance while zooming,
which is what makes one edge of the plate reach the frame edge long before another.

There was no beat either. The approach landed and the expansion began on the same frame, so the
composition the approach had just found was never actually seen.

**Reaching the end.** The last thing the observatory's narration reaches is `video`, out-degree
zero, the world's product. It was framed by an ordinary pan: off centre by +0.289, −0.289, margin
0.060, clinging to a corner. The reveal that follows is read from the centre of the frame outwards,
and pulling back from a corner reads as the camera giving up rather than as an answer. The
destination never landed, so the pull back had nothing to leave.

## Decision

**When the next operation is not a framing decision, the shot is composed rather than adequate,
and it is given a beat to land in.**

```
entering a concept    frame the subject, settle, expand into the interior
reaching the end      frame the subject, settle, pull back to the whole world
```

`composedShot(current, subject, world)` asks the stricter question — *is this the composition?*
rather than *can it be seen?* — and answers it the same way decision:24 does, with a hold when the
answer is already yes. Two tolerances, both fractions of the frame rather than absolutes:
`composedOffset` 0.05 and `composedScale` 0.15. Off-centre and off-scale are compared separately
because they fail differently.

`CAMERA.settle` is twelve frames. Four tenths of a second is the shortest hold that registers as a
hold, and it is a directorial constant like `enterTravel` and `returnHold` — not a distance, so
not paced by one.

Which shots these are is derived, and neither rule names anything:

- an entry is a cue that reaches inside a concept, which decision:25 already established;
- an ending is **out-degree zero with nothing said afterwards**. Terminality is a fact about the
  graph that `layoutWorld` already computes for an unrelated reason, and "nothing said afterwards"
  is what makes the next operation the reveal. Reaching the product mid-traversal and carrying on
  is an ordinary shot.

Two smaller things fall out and are part of the decision:

- **The chamber opens about the shot, not about the plate.** A plate at the very edge of the world
  cannot be centred — `fitTo` clamps so half the frame is not void — so the entry framing settles
  slightly to one side of it. Centring the chamber on the plate anyway would make the camera pan
  that residue *during* the expansion. Centring it on the shot leaves the camera perfectly still:
  the expansion becomes a pure change of scale and the plate slides to the middle as it grows,
  which is the node becoming the viewport rather than a rectangle being enlarged. When the entry
  shot is centred on the plate the two rectangles are identical, which is now the case at every
  portal in both specimens.
- **The reveal may not begin before the arrival has landed.** A floor, not a schedule: the pull
  back starts at `max(when the narration stops naming things, arrival + travel + settle)`. On a
  deck whose closing lines leave any room it changes nothing, and neither specimen triggers it.

## Consequences

- Both observatory portals now open with the plate at (0.000, 0.000) — dead centre — after an
  approach that lands and a frame that holds for twelve frames before anything expands.
  Cathedral v2's single portal does the same.
- The observatory's terminal shot moved from +0.289/−0.289 at margin 0.060 to +0.049/0.000 at
  margin 0.300, and holds there for 46 frames before the reveal. Cathedral v2's lands at +0.003.
  The residual 0.049 is `CAMERA.slack`: `video` is the right-hand edge of that world and cannot be
  centred without half the frame being void.
- No move exists that did not exist before. Both rules change *where* a move the camera was
  already making ends up, and how long the frame holds afterwards — decision:24's principle intact:
  semantic events create reasons to move, not obligations to move.
- The observatory got 24 frames longer in camera terms and not one frame longer in duration; the
  settle is spent inside cues that were already running.
- Two more calibrated constants, against one and a half worlds. Same caveat decision:24 carries:
  being two named numbers rather than a cost function is what makes being wrong cheap.
