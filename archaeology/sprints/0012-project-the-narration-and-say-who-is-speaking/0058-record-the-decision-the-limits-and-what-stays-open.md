---
id: tsk_01KZHJ5J4D50RPWSQAZCBB83P3
sequence: 58
kind: task
status: closed
sprint: spr_01KZHJ3XFBSNP18B8VHNSZRCTC
created: 2026-08-08
closed: 2026-08-08
---

# Record the decision, the limits, and what stays open

## Objective

Record what was decided, what was refused, and what is still open, and close the round against its
success criteria rather than against fatigue.

## Acceptance criteria

- A decision artifact covering: the configuration surface, where subtitles live architecturally, how
  active state is derived from the one clock, the narrator label and colour rule, the placement
  strategy and its cost, and what was deliberately not built.
- Any placement or legibility problem the renders exposed is a dragon with resolution criteria, not
  a paragraph of prose in a decision.
- Whether the compiled representation exposes a seam for a later forced-alignment pass is recorded
  as an idea or a dragon **only if the renders and the code actually showed one** — not
  speculatively.
- sprint:11's "if a viewer can see who is speaking, this round did something wrong" is addressed
  directly: it was a non-goal there and is a goal here, and the archaeology should say why that is
  not a contradiction.
- `npm run check` and `scarp doctor` clean; every task closed; the sprint closed with an outcome
  that states what the round found, including anything it got wrong.
