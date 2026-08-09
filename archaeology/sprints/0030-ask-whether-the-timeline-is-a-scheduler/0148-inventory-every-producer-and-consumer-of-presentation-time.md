---
id: tsk_01KZMB1K15YG6X4G6DBS7TWMYZ
sequence: 148
kind: task
status: closed
sprint: spr_01KZMB06WDSJMNNW2MEEH53GV8
created: 2026-08-09
closed: 2026-08-09
---

# Inventory every producer and consumer of presentation time

## Objective

Trace every producer and consumer of presentation time in the real pipeline — not the one in the
briefing — and record for each: what starts it, what ends it, who decides its duration, at which
stage that duration becomes known, whether it can extend the timeline, and what an unexpected
inserted duration would do to it.

Correct the assumed pipeline shape against what the code actually does.

## Acceptance criteria

- The inventory covers at minimum: speech clips, authored pauses, dwells, `enter`/`exit` calls,
  recalls, `pre_say`/`post_say`/`min_slide`, scene extent, camera moves, portal passes, anchor
  transients, spans, beats, subtitles, facts, and the R materialization stage.
- Each entry says whether its duration is **authored**, **measured**, **derived** or a **constant**,
  since that is the axis decision:9 and dragon:12 both turn on.
- The stage at which relative seconds become absolute frames is named exactly, along with every
  consumer downstream of it.
- The claim "exactly one thing extends presentation time" is either established or refuted by
  enumeration rather than by assertion.
