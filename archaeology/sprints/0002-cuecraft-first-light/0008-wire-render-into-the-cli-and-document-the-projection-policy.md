---
id: tsk_01KZA7TE6378KHFWW5X0ZE35V7
sequence: 8
kind: task
status: closed
sprint: spr_01KZA7T98B558R2DC03NZ9AS38
created: 2026-08-05
closed: 2026-08-05
---

# Wire render into the CLI and document the projection policy

## Objective

Make the whole pipeline reachable from one command, and write down where its disposable
state lives.

## Acceptance criteria

- `cuecraft render <deck.yaml> -o <out.mp4>` parses, synthesizes, times, renders, and reports
  slide count, duration, resolution, frame rate, and codecs.
- Failures exit nonzero and name the stage that failed.
- `npm test` stays fast and synthesizes nothing; live TTS and full render have their own scripts.
- The projection policy — what is generated, where it lives, and why it is kept — is documented
  in the README and in a decision.
- `out/witnessglass.mp4` renders end to end and is not committed.
