---
id: tsk_01KZMMTH5XGMSCMAYC2HNNZ4AQ
sequence: 169
kind: task
status: closed
sprint: spr_01KZMMSQ1XA0QK02A337P2PJNM
created: 2026-08-09
closed: 2026-08-09
---

# Derive a render identity from the compiled timeline

## Objective

Derive one identity from a finished timeline, deterministically, and let both artifacts carry it.

## Acceptance criteria

- A pure `renderIdFor(timeline)` produces a stable digest of the compiled timeline.
- Canonical: key order in the source objects cannot change the result, so a refactor that reorders
  a record's fields does not invalidate every sidecar in existence.
- Machine-independent: the same deck compiled in two checkouts gives the same value, asserted rather
  than assumed.
- Sensitive in the direction that matters: any change that moves a frame changes the digest.
- It does not live in `compile/symbols.ts`, because the renderer must be able to reach it and
  nothing in `src/render/` may import that module.
