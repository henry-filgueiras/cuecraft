---
id: tsk_01KZA7TE5NBR5Y26C63GXS8VBG
sequence: 5
kind: task
status: closed
sprint: spr_01KZA7T98B558R2DC03NZ9AS38
created: 2026-08-05
closed: 2026-08-05
---

# Parse and validate the presentation source

## Objective

Turn `examples/witnessglass.yaml` from a document nothing reads into the compiler's input,
with validation that helps the person editing it rather than the person who wrote the schema.

## Acceptance criteria

- YAML parsing and shape validation come from mature libraries, not hand-rolled machinery.
- Document shape, slide title, bullet list shape, narration, timing values, empty input, and
  unrecognized fields are all rejected with useful messages.
- Errors name the slide by the ordinal an author counts in their editor, and report every
  problem in the document rather than one per run.
- Durations must carry a unit; `pre_say: 750` is an error, not a guess.
- Defaults apply where the source is silent, and a slide may override them.
- Source that is valid but inert — `instructions` under local Kokoro — warns rather than
  silently doing nothing (dragon:3).
- Covered by tests that need neither the model nor a browser.
