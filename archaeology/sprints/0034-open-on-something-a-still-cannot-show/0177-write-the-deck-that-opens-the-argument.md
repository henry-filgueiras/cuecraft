---
id: tsk_01KZMPQ0PWMZW6ST6PDDTD9GEJ
sequence: 177
kind: task
status: closed
sprint: spr_01KZMPN6YTF45B7CDBMHDJNBWT
created: 2026-08-09
closed: 2026-08-09
---

# Write the deck that opens the argument

## Objective

Write the deck. This is the task the sprint exists for, and the one where the temptation to add a
slide "because we can" has to be refused out loud.

Six slides at most, under three minutes, played straight. The shape:

    an ordinary content slide     what everybody believes about traffic jams
    a protocol                    the reaction chain, travelling backwards through the cast
    the temporal exhibit          play, hold at a named state, replay an earlier interval, finish
    a specimen                    this same file, quoting the slide before it
    an SVG exhibit                where the wave actually goes, addressed by name
    a statement                   what that means

## Acceptance criteria

- `examples/phantom/phantom.yaml` renders end to end. Its header comment says what each slide is
  for and why it is that body, in the register `examples/kmeans/kmeans.yaml` uses.
- No size, position, colour, duration, coordinate, timecode or frame number anywhere in the file,
  and no key that could become one. Verified by reading it.
- The protocol's messages run backwards through the cast — the car behind reacting to the car in
  front — with silent steps where the chain simply propagates, so `decision:35`'s derived beat
  carries the passage rather than a written pause.
- The exhibit slide uses `play:`, at least one `during:` rendezvous, and one `replay:` of an
  earlier named state, and reads as narration rather than as stage directions.
- The specimen slide quotes the exhibit slide out of this same file with `marks:` on the three
  words that do the work, so a reader sees the entire source of what they just watched.
- Every slide is the natural way to say its sentence. Any slide that survives only because it
  demonstrates a mechanism is deleted before this task closes.
