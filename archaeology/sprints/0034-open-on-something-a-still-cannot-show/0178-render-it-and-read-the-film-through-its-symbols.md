---
id: tsk_01KZMPQ0Q4HC27VWGBRED0P7DZ
sequence: 178
kind: task
status: closed
sprint: spr_01KZMPN6YTF45B7CDBMHDJNBWT
created: 2026-08-09
closed: 2026-08-09
---

# Render it, and read the film through its symbols

## Objective

Render it, and find out what is actually on the frames — through the symbol table, at the
boundaries that matter, never by sampling.

## Acceptance criteria

- `npm run render -- examples/phantom/phantom.yaml -o out/phantom.mp4` succeeds from clean, and
  `out/phantom.symbols.json` is beside it with a matching `renderId`.
- Every slide, every anchor and every span in the symbol table has been extracted and looked at.
  The rendezvous frames are checked at the held frame and one frame either side of it: the panel on
  screen must say the state the narration says.
- The replay returns to the frame it was frozen on, and the film carries on from there — verified
  frame to frame, not by watching.
- Each SVG element the narration names is at full strength while its sentence runs, the others
  recede, and every element is identically bright again once the narration has moved on.
- Anything found and not fixed is written down with the reason.
