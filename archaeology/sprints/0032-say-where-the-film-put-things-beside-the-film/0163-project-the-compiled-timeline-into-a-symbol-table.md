---
id: tsk_01KZMJB3N8BZZA878DJ6RVYKGQ
sequence: 163
kind: task
status: closed
sprint: spr_01KZMJ9XPH1NF6T6JRPXBD0HBF
created: 2026-08-09
closed: 2026-08-09
---

# Project the compiled timeline into a symbol table

## Objective

Write the projection: one pure function from what compilation produced to the exported symbol table,
sitting at `freezeFacts`'s boundary and reaching nothing downstream of it.

## Acceptance criteria

- `src/compile/symbols.ts` exports a `SymbolTable` type and a pure `symbolTable(compiled, timeline)`.
- Deterministic: the same compiled presentation and timeline produce a byte-identical document.
- Slide symbols tile `[0, totalFrames)` exactly — contiguous, ordered, non-overlapping.
- Every symbol's `snapshotFrame` lies inside its own interval; every slide's lies inside the slide's
  declared inspectable interval.
- Keys are unique across the whole table, and derived from authored identity rather than from an
  ordinal, a timestamp, or anything a re-render could change.
- No field on any symbol is a re-export of an internal index, a React identity, or a file path
  inside the workspace.
