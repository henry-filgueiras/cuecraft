---
id: tsk_01KZHN252KZDGGX6VTNWA88C67
sequence: 59
kind: task
status: closed
sprint: spr_01KZHN1D4M2KAT6HS8CB37BEEJ
created: 2026-08-08
closed: 2026-08-08
---

# A switch, four treatments, and the same frames under each

## Objective

Make four subtitle treatments renderable from one working tree so they can be compared on identical
frames, then render both specimens under each.

The variants:

- **A** — current treatment. The baseline.
- **B** — a stable screen-space narration region, and nothing else.
- **C** — B, plus the named form's two-row geometry reserved when no narrator was named (the row
  is empty).
- **D** — B, plus the same reserved row carrying the deck's own accent mark instead of nothing.

## Acceptance criteria

- One switch, read from the environment by the still harness under `out/`, selects the variant.
  Nothing authored reaches it and nothing outside `render/subtitles.tsx`, `render/theme.ts` and the
  harness knows it exists.
- The same frames of `witnessglass` and `aside` are rendered under every variant: the `index` slide
  cue that exposed the defect, a `statement` slide, a `matrix` slide, a `lead` slide, and both
  narrators of `aside`.
