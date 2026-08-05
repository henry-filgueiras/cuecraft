---
id: dec_01KZA2RZHG5WRAYV17V4CJT1WJ
sequence: 1
kind: decision
status: accepted
created: 2026-08-05
---

# Compile narrated presentations from a single YAML source

## Context

Recording a narrated slide presentation normally means screen-recording software, a
microphone, and a video editor. Every correction — a reworded sentence, a renamed bullet,
a re-ordered slide — costs another take and another manual edit pass. What results is an
opaque MP4; the intent behind it lives only in the author's head.

We want presentations that behave like source code: diffable, reviewable, regenerable, and
cheap to correct.

## Decision

cuecraft is a compiler. Its input is a human-authored YAML file expressing presentational
intent — a sequence of `slide` sections and `say` sections. Its output is a polished 16:9
MP4 with AI-generated narration.

The YAML is the source of truth. Slide visuals, narration audio, per-slide timing, and the
final video are projections of that source, not independently editable artifacts.

Happy path:

    cuecraft render presentation.yaml -o presentation.mp4

## Consequences

- The author edits text and re-runs the compiler. There is no timeline to edit.
- Anything not expressible in the source cannot appear in the output. This is deliberate: a
  projection that can be hand-edited stops being a projection.
- Timing is derived, not authored:
  `slide duration = max(minimum slide duration, pre_say + narration duration + post_say)`.
  That introduces a hard ordering constraint between audio synthesis and video render
  (dragon:1).
- Rendering becomes a paid, non-instant operation, because narration comes from a hosted TTS
  provider. Caching is therefore a correctness-adjacent concern, not an optimization
  (decision:3).
- This is a probe, not a product. If the edit-and-recompile loop is not pleasant for real
  presentations, the thesis is wrong — and we would rather learn that from a narrow
  implementation than a general one.
