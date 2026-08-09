---
id: tsk_01KZJ4F0ZEZNK383TY6JDTEKGB
sequence: 83
kind: task
status: closed
sprint: spr_01KZJ4E57ZVCGV27EXP5PT6CJE
created: 2026-08-08
closed: 2026-08-08
---

# Write the deck

## Objective

Write `examples/off-the-record.yaml`: six slides, two narrators, subtitles on, exactly two recalls,
with each body chosen for what the slide's content means.

## Acceptance criteria

- Title "This Meeting Is Not Being Recorded"; `management` and `record` declared with distinct
  existing Kokoro voices; `defaults.subtitles: true`.
- Slide 1 anchors `off-record` and slide 2 anchors `not-a-deploy`, each on a unique root-scoped
  element, each activated by exactly one self-contained speech cue.
- Slide 4 recalls `not-a-deploy`; slide 6 recalls `off-record`. Both followed by a `pause: 900ms`
  and nothing spoken over the quotation.
- No authored styling, no flashback or media vocabulary, no explanation of `recall:` in the prose.
- `node src/cli.ts render --dry-run` (or the compile phase) accepts it, and the composition each
  slide is given is the one its meaning asks for.
