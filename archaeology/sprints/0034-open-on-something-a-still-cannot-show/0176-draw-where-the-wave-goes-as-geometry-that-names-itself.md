---
id: tsk_01KZMPQ0PMCKFBFQ332CJAET7Z
sequence: 176
kind: task
status: closed
sprint: spr_01KZMPN6YTF45B7CDBMHDJNBWT
created: 2026-08-09
closed: 2026-08-09
---

# Draw where the wave goes, as geometry that names itself

## Objective

Draw the second exhibit: where the time actually went. An SVG whose elements carry their own
names, so the narration can point at one and cuecraft never has to look at a pixel.

## Acceptance criteria

- `examples/phantom/wave.R` reads the same recorded run as the film and draws an SVG, writing
  `data-cuecraft` onto each element it means to be addressable — base R's sentinel-colour rewrite,
  as `examples/pivot/quarterly-chart.R` does it (decision:59).
- Every named element is one the narration actually reaches. `shows:` and what the program draws
  agree in both directions, and the deck says so.
- No sentinel colour survives into the shipped SVG; the program refuses rather than shipping one.
- The chart is derived from the run, not typed in. Change the model parameters and this picture
  changes with it.
