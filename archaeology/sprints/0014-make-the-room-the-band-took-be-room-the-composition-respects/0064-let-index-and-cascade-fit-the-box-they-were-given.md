---
id: tsk_01KZHRVYXXQ7DW76P5YKCD00VH
sequence: 64
kind: task
status: closed
sprint: spr_01KZHRVYW57XJRGBFQYN90SGCS
created: 2026-08-08
closed: 2026-08-08
---

# Let index and cascade fit the box they were given

## Objective

Let `index` and `cascade` derive type and spacing from the box they were given, in the same shape
as `fitSpecimen` and `fitQuote`.

## Acceptance criteria

- `fitIndex` and `fitCascade` live in `theme.ts` beside the other fitters, take the box, account for
  rows that wrap, and have a readable floor.
- Both archetypes read `useSubtitleBand()` and pass it to `bodyBox`, as `Specimen` already does.
- The flex containers no longer overflow their box by construction, not only by fitting.
- `witnessglass`, `onscreen` and `cathedral` are unchanged where they already fit — a deck with room
  to spare still gets full-size type and full spacing.
- task:63's invariant test passes.
