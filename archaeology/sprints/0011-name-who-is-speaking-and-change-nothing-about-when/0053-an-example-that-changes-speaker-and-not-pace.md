---
id: tsk_01KZHF7WFA3X7JCS0867GJHN66
sequence: 53
kind: task
status: pending
sprint: spr_01KZHF7205JE9TQ1HJRVMCXM6H
created: 2026-08-08
---

# An example that changes speaker and not pace

## Objective

Prove by ear that speaker identity changed and pacing did not.

## Acceptance criteria

- A small example deck — one or two slides, no new body kind, no new example machinery — alternates
  primary → other → primary with two audibly different Kokoro voices.
- Rendered through `cuecraft render` with no special flags, and watched end to end.
- The handovers are obvious as a change of speaker and unremarkable as a change of pace: no gap, no
  overlap, no clip that sounds cut, no slide that runs long.
- The example is committed; its rendered MP4 is not (decision:3).
- README documents who speaks, in the section that documents narration.
