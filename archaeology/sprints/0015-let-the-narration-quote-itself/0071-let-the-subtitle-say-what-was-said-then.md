---
id: tsk_01KZHY86VVCN07NXJWBC52H9RP
sequence: 71
kind: task
status: closed
sprint: spr_01KZHY6QMS7W4P3442GSSA9X8D
created: 2026-08-08
closed: 2026-08-08
---

# Let the subtitle say what was said then

## Objective

Make the subtitle track say what was said then, and stop exactly when the recall stops.

## Acceptance criteria

- The recalled cue carries the **original** authored text and the **original** narrator identity —
  not the recalling slide's narrator.
- The live cue immediately before a recall ends where the recall begins, rather than bridging it.
- The recalled cue ends exactly at `recall.from + recall.durationInFrames`; an authored pause after
  the recall shows nothing.
- The following live cue begins with its own placed clip, as always.
- Cues stay sorted by `from`, because `subtitleAt` scans in order.
- With subtitles off, a recall adds none.
- Ordinal numbering is heard-order, and the doc comment says so — a recalled sentence is heard twice
  and the numbering is no longer one-to-one with `ClipFact`.
- Tests for the preceding, recalled, silent-pause and following intervals.
