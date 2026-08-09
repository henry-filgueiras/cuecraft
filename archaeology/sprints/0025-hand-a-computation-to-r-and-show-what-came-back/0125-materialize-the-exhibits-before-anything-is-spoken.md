---
id: tsk_01KZKNG28VHAEANNB6YPT7YVQ3
sequence: 125
kind: task
status: closed
sprint: spr_01KZKNE2VBP4FK8GVSTT50E27Z
created: 2026-08-09
closed: 2026-08-09
---

# Materialize the exhibits before anything is spoken

## Objective

A materialization stage that runs every exhibit in a deck before narration is synthesized, and
puts the results where the renderer can reach them.

## Acceptance criteria

- A named pipeline stage, reported like every other stage, failing like every other stage.
- Runs before synthesis, so a broken R program costs no minutes of Kokoro.
- Results land under the render workspace's public directory and are addressed by `staticFile()`.
- Stale results from a previous run are removed first, as stale narration is.
- The R program is handed the pixel box it must fill and the deck's palette.
- Exactly one image output per exhibit; more than one is an error listing the names.

## Done, and its position in the pipeline was chosen rather than forced

`src/compile/materialize.ts`, running between `parse` and `synthesize`. dragon:1 forces synthesis
before timing; nothing forces this before synthesis, and it goes first so that a typo in an
`aggregate()` call costs a second instead of a minute of Kokoro. The failure paths were exercised
through the CLI and that ordering is exactly what they demonstrate — both a broken program and a
missing input fail during "running exhibits...", before a word is spoken.

Results land under the render workspace's `public/exhibits/slide-NN-<program>/` and are addressed
by `staticFile()`, which is the same route narration WAVs already take, so the renderer gained no
new way of reaching a file.

The stage is skipped and not even announced on a deck with no exhibit — `hasExhibits` — because a
stage that announces itself in order to do nothing teaches a reader that the stages are ceremony.

Exactly one output per exhibit, and more than one is refused with the names listed. That refusal is
deliberate rather than provisional: a composition places one picture, and any key that let an
author choose among several would be a layout instruction.
