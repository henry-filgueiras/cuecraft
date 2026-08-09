---
id: ide_01KZKQ02D19ERQZ11SGCXP024Y
sequence: 22
kind: idea
status: parked
created: 2026-08-09
---

# Cache an exhibit on its program, its inputs, and its runtime

## Problem

`decision:56` runs an R program on every render, with no caching whatsoever. The revenue demo pays
0.2 seconds for that, which is nothing against 8 seconds of narration and 28 of encoding. A deck
whose exhibit fits a model, reads a large file, or bootstraps a simulation would pay it on every
iteration of a visual change that has nothing to do with the computation.

## Sketch

Key a cached result on the program's source, every declared input's content, and enough of the
runtime to matter — R's version, at least. Store it beside the narration under `.cuecraft/`, which
is already the disposable-projection directory. A hit skips the subprocess entirely.

## Boundaries

The reason this is parked and not merely unbuilt: **wrong invalidation shows a stale picture and
looks completely correct**, which is the exact failure `decision:18` refuses for quoted source and
`decision:55` refuses for checked-in images. Getting it right means hashing content rather than
mtimes, deciding what counts as "the runtime" when a program can call any installed package, and
having an answer for a program that reads something it did not declare.

idea:8 parks the narration cache for a related reason and has not been built either, despite
narration being forty times more expensive. That ordering is the honest signal about priority here.

## Evidence

Worth building when a real deck's render time is dominated by its exhibits rather than by Kokoro
and Chromium — which for the shipped example is off by two orders of magnitude.
