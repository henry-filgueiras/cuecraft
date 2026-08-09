---
id: tsk_01KZKWRXS9VV7MBYMHVJNR7YRT
sequence: 139
kind: task
status: closed
sprint: spr_01KZKWMMWAQ497JEVVVG56BRSX
created: 2026-08-09
closed: 2026-08-09
---

# Make attention the exhibit family's shared model, not the chart's

## Objective

Generalize `render/exhibit.ts`'s focus model — decision:58's occupancy over chart regions — into an
`attention` model the whole exhibit family reads, without touching `anchor.ts`.

idea:20 parked promoting occupancy into the activation model and said the test is a *second*
implementation. This round has two more consumers (SVG elements, table rows), so the sharing can be
measured rather than guessed.

## Acceptance criteria

- One module produces, for a track of anchored elements, what is attended on a frame and how
  strongly: derived hold from the measured clip, merge-on-interrupt, travel between successive
  claims.
- `render/exhibit.ts`'s region interpolation is expressed on top of it and the revenue deck renders
  byte-identically.
- Independent **tracks** are expressible, so a table can hold a row focus and a column focus at once
  without a selection algebra and without `activates:` learning a list.
- `ANCHOR_TIMING`, `WORLD_TIMING` and `anchor.ts` are untouched, and every other archetype is
  unchanged.
- The ground-state property is asserted directly: outside every run, strength is exactly 0.
