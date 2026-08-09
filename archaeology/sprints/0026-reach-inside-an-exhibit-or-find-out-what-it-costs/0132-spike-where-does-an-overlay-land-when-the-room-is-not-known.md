---
id: tsk_01KZKRP517NZXD9GFWRD0WA265
sequence: 132
kind: task
status: closed
sprint: spr_01KZKRNA3PE1ZD0S85JHH7EF5Y
created: 2026-08-09
closed: 2026-08-09
---

# Spike: where does an overlay land when the room is not known

## Objective

Find out where an overlay actually lands, given that the picture is contained in a room whose size
was not known when it was drawn.

## Acceptance criteria

- The arithmetic stated: from a region in fractions of the drawn image, to a rectangle on the frame,
  through `object-fit: contain` in a box of unknown aspect.
- Whether that arithmetic can be done in the composition without measuring the DOM — a layout that
  needs a measured element is a layout that renders one frame late.
- A drawn proof: a plain rectangle over the shipped chart's Asia Pacific panel, on a real frame,
  landing where the panel is. Not a unit test — a picture.
- Checked at more than one room size, since the whole difficulty is that the room varies: subtitled
  and unsubtitled at least.

## Finding: there is no arithmetic, because CSS already knows the answer

The honest unknown was: given a region in fractions of the drawn image, where is it on the frame,
when the picture is `object-fit: contain`ed in a room whose size was not known when it was drawn?

**Nowhere, because the picture should not be contained in the room.** Wrap it instead:

    <div style="position: relative; aspect-ratio: 3312/1104; max-width: 100%; max-height: 100%; margin: auto">
      <img style="width: 100%; height: 100%">
      <div style="position: absolute; left: 54.3%; top: 13.77%; width: 21.13%; height: 68.15%">

`aspect-ratio` with both maxima makes the wrapper *become* the letterboxed image box — the same
rectangle `contain` would have produced — so a region is positioned in percentages inside it and the
browser does the fitting. **No arithmetic, no DOM measurement, and therefore no frame rendered one
tick late.**

Proved with a picture rather than a test, at three rooms with three different aspects: 1656x552
(the subtitled design target), 1656x380 (short), and 1100x552 (narrow). The Asia Pacific panel is
framed correctly in all three, and the surrounding dim moves with it.

The regions themselves came from the shipped program's real `par()` settings via
`grconvertX/grconvertY(..., "user", "ndc")`, so these are the coordinates the feature would actually
use, not an approximation:

    north-america  0.0861 0.1377 0.2973 0.8192
    europe         0.3146 0.1377 0.5258 0.8192
    asia-pacific   0.5430 0.1377 0.7543 0.8192
    latin-america  0.7715 0.1377 0.9828 0.8192

Note `y` is flipped on emission: R's device origin is bottom-left and CSS's is top-left, so the
program emits `1 - grconvertY(...)`. That is one character of the protocol's cost and it belongs in
the program rather than in cuecraft, because it is a fact about R's device.

**Emphasis has to be subtractive.** A raster cannot show part of itself at a different opacity, so
the treatment is a veil over the whole picture with a hole in it —
`box-shadow: 0 0 0 9999px <ink at α>` on the region — rather than the colour mix every other
archetype uses. That is the existing *vocabulary* (opacity driven by `anchorState.degree`) applied
through the only mechanism a picture allows.
