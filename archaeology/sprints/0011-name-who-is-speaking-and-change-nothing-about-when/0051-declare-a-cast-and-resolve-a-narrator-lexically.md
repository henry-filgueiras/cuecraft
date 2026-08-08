---
id: tsk_01KZHF7WF0DZ7CXYQ29H2PGH1A
sequence: 51
kind: task
status: closed
sprint: spr_01KZHF7205JE9TQ1HJRVMCXM6H
created: 2026-08-08
closed: 2026-08-08
---

# Declare a cast, and resolve a narrator lexically

## Objective

Give the format a cast and a way to point at it, and resolve every speech cue's narrator at parse
time so that nothing downstream has to know what a lexical scope is.

## Acceptance criteria

- `narrators:` is a top-level mapping of id to `{ voice, speed? }`; ids are checked with the
  identity rule the rest of the format uses, and the value is an object so that the grammar stays
  extensible without any narrator id becoming a structural key.
- `defaults.narrator`, a slide's `narrator:`, and a speech cue's `narrator:` all select from it.
- Every speech cue leaves the parser carrying the resolved narrator id, or carrying none when the
  deck never mentioned one. Resolution is `cue ?? slide ?? defaults`, evaluated per cue, with no
  carry-over between cues.
- A cue inside a child module resolves against the slide that entered it, since a module may not
  declare defaults of its own.
- Unknown ids are rejected at all three scopes and inside a module, with the declared cast named in
  the message. An empty or malformed `narrators` entry is rejected with a message an author can act
  on.
- `presentation.voice` and `presentation.speed` keep their present meaning, and a deck that declares
  no narrators parses to exactly the cues it parses to today.
