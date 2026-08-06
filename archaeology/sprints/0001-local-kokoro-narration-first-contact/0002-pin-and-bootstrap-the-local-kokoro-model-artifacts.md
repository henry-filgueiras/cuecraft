---
id: tsk_01KZA6872BYTW3M27C7YS1MGQT
sequence: 2
kind: task
status: closed
sprint: spr_01KZA66KVXZF819AWX0PB977SM
created: 2026-08-05
closed: 2026-08-05
---

# Pin and bootstrap the local Kokoro model artifacts

## Objective

Make the model artifacts reproducible and repo-owned: pinned to an immutable upstream revision,
verified on arrival, stored where cuecraft can find and delete them, and never committed.

Provide one bootstrap command that takes a clean checkout to a working local TTS stack.

## Acceptance criteria

- A lock file records the upstream repository, its commit revision, and a SHA-256 for every file
  fetched. Nothing is fetched from a mutable ref.
- `./scripts/bootstrap-local-tts.sh` is idempotent: a second run downloads nothing and still
  verifies what is already on disk.
- A corrupted or truncated artifact is detected and re-fetched rather than silently used.
- Artifacts land under a documented, gitignored, repo-local directory that can be deleted to
  fully reset the installation.
- `git status` is clean after bootstrap.
