---
id: tsk_01KZMJB3NFYC87M9BQX6QE8RX6
sequence: 164
kind: task
status: closed
sprint: spr_01KZMJ9XPH1NF6T6JRPXBD0HBF
created: 2026-08-09
closed: 2026-08-09
---

# Write the sidecar beside the film, and advertise it

## Objective

Emit the sidecar beside the MP4 and say so, so that a human or an agent reading render output
discovers the artifact without being told it exists.

## Acceptance criteria

- `renderPresentationFile` writes `<output basename>.symbols.json` beside the rendered MP4 and
  reports its path on the summary.
- The path is derived from the *output* path, so `-o out/demo.mp4` produces `out/demo.symbols.json`.
- The render completion report names the video, the symbols file, and the one command that reads
  them.
- Nothing about the sidecar can change the film: it is written after the render returns, from a
  timeline that is already frozen.
