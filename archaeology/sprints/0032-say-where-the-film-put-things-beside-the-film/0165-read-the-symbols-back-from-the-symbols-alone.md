---
id: tsk_01KZMJB3NPM3MB5QJV13RQFPEQ
sequence: 165
kind: task
status: closed
sprint: spr_01KZMJ9XPH1NF6T6JRPXBD0HBF
created: 2026-08-09
closed: 2026-08-09
---

# Read the symbols back, from the symbols alone

## Objective

Prove the artifact is useful by consuming it: enumerate every slide's deterministic inspection point
from the sidecar alone.

## Acceptance criteria

- `cuecraft inspect <presentation.symbols.json>` prints every symbol with its key, kind, frame
  interval and representative frame, filterable by kind.
- It reads only the sidecar. It does not parse the presentation, synthesize anything, or open the
  video.
- It refuses a JSON document that is not a cuecraft symbol table, by name.
