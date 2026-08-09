---
id: tsk_01KZKWRXSZXB6QD8V99JPJG1JE
sequence: 142
kind: task
status: closed
sprint: spr_01KZKWMMWAQ497JEVVVG56BRSX
created: 2026-08-09
closed: 2026-08-09
---

# Render both films and fix what they show

## Objective

The end-to-end showcase: raw transactions -> R groups, aggregates, pivots -> derived CSV -> a
cuecraft table whose rows narration focuses, including one that starts offscreen. Plus the semantic
SVG scenario. Both rendered to MP4 and inspected.

## Acceptance criteria

- An adversarial fixture rather than a tidy one: more rows than fit, mixed label lengths, at least
  one cell that wraps, numbers of differing width, a stable key column.
- Both films render, are watched, and the layout problems they show are fixed rather than explained.
- `npm run check`, `npm run test:r` and `scarp doctor` pass.
