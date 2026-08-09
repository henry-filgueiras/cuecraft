---
id: drg_01KZKPYZKBF5ZSXTCF44DN8YVA
sequence: 33
kind: dragon
status: open
created: 2026-08-09
---

# A deck with an exhibit is reproducible up to whatever R is installed

## Context

decision:8 runs Kokoro locally and `kokoro-model.lock.json` pins the model by immutable revision
and SHA-256, so a checkout plus the bootstrap produces the same narration on any machine. That pin
is what lets a deck claim to be reproducible.

`decision:55` introduces a second external runtime with no pin at all. `./scripts/bootstrap-r.sh`
installs whatever `brew install r` currently resolves to, and a program can call anything that R
has. This checkout's demo renders against R 4.6.1 on Apple Silicon; nothing records that, nothing
checks it, and nothing would notice if a later R changed `barplot`'s default spacing.

## Question

The obvious fix is the wrong shape. Pinning R the way the model is pinned would mean vendoring an R
distribution, and pinning packages would mean an renv-style lockfile and a package cache — which is
the "generalized package management" the round explicitly refused. It is also disproportionate: the
demo uses `read.csv`, `aggregate`, `xtabs` and `barplot`, and the parts of those that could move
are the cosmetic ones.

But the honest statement of the current position is uncomfortable: **a cuecraft deck with an
exhibit is reproducible up to the R that happens to be installed**, and the film does not say so.
The chart is evidence, and evidence whose provenance is "some R" is weaker evidence than the deck's
own narration implies.

## Constraints

## Candidate direction

- **Record rather than pin.** The runner already knows `Rscript --version`; putting it in the
  render summary, and eventually in whatever a frozen compilation records (decision:3), would make
  the dependency visible without trying to control it.
- **Refuse a version below a floor**, the way the bootstrap refuses old Node. Cheap, and catches
  the case that actually breaks rather than the case that theoretically drifts.
- **Decide it is the program's problem.** A deck that wants a stable chart pins its own R, in the
  same way a deck that wants stable typography pins its own fonts — which cuecraft also does not do
  (dragon:4). This is at least consistent.

## Resolution criteria

Either the render summary and any frozen compilation record which R ran, or a rendered chart
changes across two R versions and settles the question by breaking.
