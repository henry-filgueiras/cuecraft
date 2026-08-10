---
id: tsk_01KZMJB3NXWMS6X7EBFRXYM7PT
sequence: 166
kind: task
status: closed
sprint: spr_01KZMJ9XPH1NF6T6JRPXBD0HBF
created: 2026-08-09
closed: 2026-08-09
---

# Extract a frame by semantic key

## Objective

Turn a semantic key into an image: resolve the key, take its declared frame, and extract exactly
that frame from the rendered MP4.

## Acceptance criteria

- `cuecraft snapshot <video.mp4> --symbol <key> [-o <out.png>]` extracts the symbol's declared frame.
- `cuecraft snapshots <video.mp4> [--kind slide] [-d <dir>]` extracts one image per matching symbol,
  named deterministically from the key.
- The sidecar path defaults to the one derived from the video path, and can be overridden.
- Extraction is one ffmpeg invocation per frame with no decoding decisions taken by cuecraft, and a
  missing ffmpeg is reported in a sentence rather than as a spawn error.
- The seek lands unambiguously inside the requested frame rather than on its boundary (dragon:38).
