---
id: tsk_01KZM5GH2R098FWFEWW2VV930E
sequence: 143
kind: task
status: closed
sprint: spr_01KZM5EXSYFDBB87YWSEQSC0V0
created: 2026-08-09
closed: 2026-08-09
---

# Give layout a typography profile, and change nothing

## Objective

Introduce `src/render/typography.ts`: a closed set of typography profiles, each carrying the two
font stacks, the five advance-width estimates every fitter in `theme.ts` divides by, and a stable
identity. Thread it through `theme.ts`'s fitters and the compositions that call them, and provide it
to the React tree the way `FactsContext` and `SubtitleBandContext` already are.

Nothing selects the second profile yet, and no rendered pixel changes. This task is the seam.

## Acceptance criteria

- `DEFAULT_TYPOGRAPHY` holds `FONT_STACK`, `MONO_STACK` and the exact current values of
  `HEADING_CHAR_WIDTH` (0.49), `BODY_CHAR_WIDTH` (0.52), `CODE.charWidth` (0.602),
  `WORLD.charWidth`/`MACHINE.charWidth` (0.55) and `MACHINE.eventCharWidth` (0.53).
- Every fitter that consumes an advance width takes the profile as a **required** parameter, so a
  call site that forgets one is a type error rather than a silent fallback to Helvetica's metrics.
- `TypographyContext` supplies the resolved profile to the composition; nested worlds, recalls and
  modules read it through the same provider and cannot override it.
- No mutable module-level "current profile". Two renders in one process cannot see each other's.
- `npm run check` passes and every existing test's numeric expectations are unchanged.
