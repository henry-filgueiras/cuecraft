---
id: tsk_01KZM5GH3J0HMKWB80SJAF829Q
sequence: 147
kind: task
status: closed
sprint: spr_01KZM5EXSYFDBB87YWSEQSC0V0
created: 2026-08-09
closed: 2026-08-09
---

# Render both, look at both, and hide which is which

## Objective

Render the evidence, look at it, and produce the A/B bundle the round is ultimately for.

## Acceptance criteria

- `examples/cuecraft.yaml`, `examples/deploy.yaml` and `examples/leases-narrated.yaml` render in both
  profiles. Frames sampled across each film — not the first — and checked for clipping, surprising
  wrapping, overflowing plates, shifted geometry, camera framing regressions, truncated graph
  labels, code and table alignment, and any flash of fallback typography.
- The default renders are proven unchanged, by comparison rather than by assertion.
- A short, textually diverse deck rendered once per profile as `candidate-a` and `candidate-b`, with
  the mapping written somewhere the filenames do not reveal it. It has to look like a cuecraft slide,
  not an eye chart — the ambiguous pairs are carried by content that would have been written anyway.
- Whatever is found that is not fixed is recorded as a dragon rather than left in a commit message.
