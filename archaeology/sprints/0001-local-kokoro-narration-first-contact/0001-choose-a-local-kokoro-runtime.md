---
id: tsk_01KZA67ETEJPEHF97Z92FM1FZ1
sequence: 1
kind: task
status: closed
sprint: spr_01KZA66KVXZF819AWX0PB977SM
created: 2026-08-05
closed: 2026-08-05
---

# Choose a local Kokoro runtime

## Objective

Pick the smallest sane way to run Kokoro locally on Apple Silicon, on evidence rather than
familiarity. Establish whether a cross-language subprocess boundary is genuinely required or
merely assumed.

## Acceptance criteria

- Candidate runtimes are compared on installation prerequisites, pinnability, licensing, and
  whether they run headless — not on benchmark folklore.
- The prerequisite cost of each candidate is measured on this machine, not estimated.
- The choice is recorded as a decision, including what was rejected and why, since it amends
  decision:4's "OpenAI is the first and only implementation".
- No neural network inference is implemented in this repository.
