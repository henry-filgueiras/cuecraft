---
id: tsk_01KZMDCPTGDAGG6C89V5ZVJ11J
sequence: 156
kind: task
status: pending
sprint: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
created: 2026-08-09
---

# Animate k-means in base R, and encode it with ffmpeg

## Objective

Make R hand back something worth watching: k-means on a small 2D dataset with obvious-but-not-
perfect cluster structure, animated so the algorithm is legible without narration rescuing it.

Base R and ffmpeg, and nothing else. `stats::kmeans` is in base R; the loop is written out by hand
so each pass has a visible assign step and a visible move step, which is the thing being shown.

## Acceptance criteria

- `examples/kmeans/kmeans.R` reads a CSV input, runs Lloyd's algorithm to convergence with a fixed
  seed, draws frames with cairo, encodes them with ffmpeg, and declares one `video` output.
- The animation shows: the unlabelled cloud, the initial centroids, points taking a colour,
  centroids travelling, and the run settling — with a legible readout of which pass is on screen
  and how far the fit has moved.
- Deterministic: two runs produce the same number of frames and the same duration.
- The R bootstrap verifies ffmpeg the way it already verifies cairo, and says what to install when
  it is missing. No undocumented manual setup.
