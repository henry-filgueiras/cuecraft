---
id: tsk_01KZMJB3PBTPYKJW5HYQHC2FKX
sequence: 168
kind: task
status: closed
sprint: spr_01KZMJ9XPH1NF6T6JRPXBD0HBF
created: 2026-08-09
closed: 2026-08-09
---

# Say the sidecar exists, where somebody will read it

## Objective

Document the sidecar where the people and agents who need it will actually be standing.

## Acceptance criteria

- The README explains in one sentence what the sidecar is and why to use it, with a tiny example of
  the document and of reading it.
- `CLAUDE.md` tells a future agent to use the symbol table rather than sampling a render, since that
  is where an agent working in this repository starts.
- `cuecraft --help` lists the new commands.
- `npm run check` and `scarp doctor` pass.
