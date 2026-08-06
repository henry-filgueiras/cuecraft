---
id: tsk_01KZC5821HG7EF0BS5AF2ABQ8B
sequence: 13
kind: task
status: closed
sprint: spr_01KZC58217DD56XN7FZ221N7EF
created: 2026-08-06
closed: 2026-08-06
---

# Establish what timing information Kokoro exposes

## Objective

Establish what timing information the current pipeline can actually produce, before designing
anything that depends on it.

## Acceptance criteria

- The ONNX graph's real outputs are read rather than assumed.
- Word, token, phoneme and alignment availability is each answered with evidence.
- No second model or alignment service is added to obtain any of it.
- Whatever is genuinely available cheaply is used; nothing is estimated from text.
- The finding is recorded whether it is convenient or not.
