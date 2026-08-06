---
id: tsk_01KZA6872FZS1PQRWNSSJD34GJ
sequence: 3
kind: task
status: closed
sprint: spr_01KZA66KVXZF819AWX0PB977SM
created: 2026-08-05
closed: 2026-08-05
---

# Synthesize from cuecraft's TypeScript through a thin seam

## Objective

Prove the boundary that matters: cuecraft's own TypeScript, not a vendor example, asks for speech
and gets a WAV back.

Establish the thinnest seam that makes that true, and expose it from the command line.

## Acceptance criteria

- A `synthesize()` function in cuecraft's source accepts text, voice, speed, and an output path,
  and returns the measured properties of what it wrote.
- Inference is offline: remote model resolution is disabled, not merely unused.
- The capability is reachable from the CLI, per the repository's CLI-first constraint.
- Input validation and error propagation are unit-tested without the model present.
- An integration test exercises real synthesis and is obviously separate from the unit suite.
- Duration is measured from the returned samples, not assumed — decision:4 requires this and
  dragon:1 depends on it.
