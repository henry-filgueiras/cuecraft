---
id: tsk_01KZMMTH6C147JAVXWS6KFGXJV
sequence: 171
kind: task
status: closed
sprint: spr_01KZMMSQ1XA0QK02A337P2PJNM
created: 2026-08-09
closed: 2026-08-09
---

# Read a film's stamp, and compare it in three states

## Objective

Read the stamp back off a film cheaply, and compare it to a sidecar's, without letting either
concern leak into the other.

## Acceptance criteria

- Reading a film's stamp is a header read whose cost does not grow with the film.
- It lives beside `src/compute/mp4.ts` rather than inside it: `mp4.ts` runs during materialization
  on every deck with a film in it and must stay free of external processes.
- Comparison is tri-state — matched, mismatched, unknown — and the reasons for `unknown` are
  enumerated rather than collapsed into a failure.
- The comparison is pure, and testable without an MP4.
