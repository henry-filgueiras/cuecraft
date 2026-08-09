---
id: tsk_01KZKNG29PMY641J2PN90YKA9G
sequence: 129
kind: task
status: closed
sprint: spr_01KZKNE2VBP4FK8GVSTT50E27Z
created: 2026-08-09
closed: 2026-08-09
---

# Test the boundary, not a mock of it

## Objective

Tests at the real boundary, split by what they need installed.

## Acceptance criteria

- Manifest parsing, path refusal, and diagnostics are unit-tested with no R present.
- Real R execution, a real PNG, a real failure and a real nonzero exit are covered by tests that
  need R, under their own suffix and their own npm script.
- `npm test` stays runnable on a machine with no R, no model and no browser.
- CI is not made to depend on Homebrew and nothing mutates the machine.

## Done, and one refusal moved out of `runR` to make it testable

46 tests across three files. The split follows the repository's existing one: `npm test` runs on a
machine that has bootstrapped nothing, `npm run test:r` needs R.

`src/compute/r.test.ts` (24) — the protocol split, the environment, PNG validation, and every
refusal: malformed declaration, unknown type, absolute path, three escapes, missing file, directory,
empty file, not-a-PNG, duplicate names, plus a filename with spaces and a subdirectory that are
accepted.

`src/compile/materialize.test.ts` (9) — the stage with an injected runner: which slides are picked
up, what the program is handed, missing and non-file inputs, zero and several outputs, and an
`RError` becoming a slide-numbered stage failure.

`src/compute/r.live-test.ts` (11) — only what a stub cannot establish: R receiving its source over
stdin, an aggregation actually happening on the far side, the working directory, a syntax error, a
runtime error, a deliberate nonzero exit, a declared-but-unwritten file, an escape, the directory
being emptied between runs, a timeout, and the shipped demo program against the shipped data.

**Writing the tests changed the code twice, which is the point of writing them.** The first draft
had a helper that could not reach the refusals at all, because they were private inside `runR` and
`runR` spawns a process — so `resolveOutputs` was extracted and exported, which is also the better
factoring: spawning is either possible or not, while what cuecraft will *accept back* is a set of
arguable refusals that should be checkable with no R installed. And the directory-refusal test
failed on first run, because the refusal was raised inside the `try` that catches "does not exist"
and was being reported as the wrong mistake.

The live tests deliberately run in a temp directory whose name contains spaces. CI is untouched:
`npm run check` needs no R, no model and no browser, and nothing installs anything.
