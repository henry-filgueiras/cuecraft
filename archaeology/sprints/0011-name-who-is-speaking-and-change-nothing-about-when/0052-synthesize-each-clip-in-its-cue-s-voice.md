---
id: tsk_01KZHF7WF5WK6H7GJAPKR9BQ9P
sequence: 52
kind: task
status: closed
sprint: spr_01KZHF7205JE9TQ1HJRVMCXM6H
created: 2026-08-08
closed: 2026-08-08
---

# Synthesize each clip in its cue's voice

## Objective

Synthesize each clip in its own cue's voice, and make the compiled record say which narrator
produced it — without changing a single thing about where clips land.

## Acceptance criteria

- `compilePresentation` resolves each speech cue's narrator to a voice and a speed and passes them
  to the synthesis seam per call. A cue with no narrator sends exactly what it sends today.
- A `SpeechClip` records the narrator that spoke it and the voice and speed it was synthesized at.
- Offsets, clip ordering, `durationSeconds` and `sceneMs` are computed from measured audio exactly
  as before; no branch in the timing arithmetic mentions a narrator.
- decision:4's seam is unwidened: `SynthesizeNarration` keeps its signature.
- The CLI's per-slide progress line tells an author which voices a slide used when it used more
  than one.
