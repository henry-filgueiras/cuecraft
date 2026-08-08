---
id: tsk_01KZHN2530J6JF1SMJ07ZKK0BG
sequence: 61
kind: task
status: closed
sprint: spr_01KZHN1D4M2KAT6HS8CB37BEEJ
created: 2026-08-08
closed: 2026-08-08
---

# Land the winner as the only treatment

## Objective

Land the winning treatment as the only treatment: no variant switch, no dead branches, no
environment lookup left in `src/`.

## Acceptance criteria

- `src/render/subtitles.tsx` and `src/render/theme.ts` express one treatment.
- The band arithmetic still comes from one derived number and the composition above it still never
  moves between slides.
- Tests cover whatever the change made newly true — the band's independence from whether a narrator
  was named, if that is what won — without duplicating decision:40's existing coverage.
- `npm run check` passes.
