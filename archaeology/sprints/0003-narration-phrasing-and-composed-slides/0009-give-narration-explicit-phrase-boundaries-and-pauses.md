---
id: tsk_01KZC2QHEGSJ9MBT11TXJXKD4C
sequence: 9
kind: task
status: closed
sprint: spr_01KZC2QHEAGF95JM6BR7PCSP02
created: 2026-08-06
closed: 2026-08-06
---

# Give narration explicit phrase boundaries and pauses

## Objective

The second slide of the First Light deck sounds flat. Find out why from the audio rather than
from intuition, then give authors the smallest thing that lets them fix it: deliberate phrase
boundaries and deliberate silence.

## Acceptance criteria

- `say` accepts an ordered list of cues; a cue is prose or an explicit pause.
- A scalar `say` still works and means one speech cue.
- Each speech cue is its own synthesis call and its own clip on the Remotion timeline; no WAV
  bytes are concatenated here.
- Narration duration includes authored pauses and still drives slide timing.
- Clip positions accumulate in whole frames, so no clip can start before the previous ends.
- Cue errors name the cue by its position, counting from one.
- Nothing is added that Kokoro cannot honour — no emphasis, pitch, rate or style controls.
