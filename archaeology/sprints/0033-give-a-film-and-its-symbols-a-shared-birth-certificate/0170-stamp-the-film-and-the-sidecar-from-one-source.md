---
id: tsk_01KZMMTH659WS1KT4YPGME0ECE
sequence: 170
kind: task
status: closed
sprint: spr_01KZMMSQ1XA0QK02A337P2PJNM
created: 2026-08-09
closed: 2026-08-09
---

# Stamp the film and the sidecar from one source

## Objective

Stamp the identity into the rendered MP4, and record it in the symbol table, from one source.

## Acceptance criteria

- `renderMedia` is passed the stamp, and the rendered file carries it in `moov` metadata.
- `media.renderId` appears in every symbol table a render writes, with no version bump.
- The stamp's string encoding is owned by one module, which both writes and parses it, and tolerates
  whatever the encoder prepends to the tag it rides in.
- A render test proves the stamp survives a real render and reads back equal to the sidecar's — the
  mechanism is verified by a test rather than by a per-render self-check.
