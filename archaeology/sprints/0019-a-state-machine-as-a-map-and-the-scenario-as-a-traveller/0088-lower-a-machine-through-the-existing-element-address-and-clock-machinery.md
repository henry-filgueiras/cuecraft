---
id: tsk_01KZJ8SKG7FH268D2ER2SH4JXM
sequence: 88
kind: task
status: closed
sprint: spr_01KZJ8R3RA1F5J5HEEJ40Z6GSP
created: 2026-08-08
closed: 2026-08-08
---

# Lower a machine through the existing element, address and clock machinery

## Objective

Lower a machine into the pipeline that already exists: the closed body union, the flat element
list, the address space, the derived clock, and the compiled beat list.

## Acceptance criteria

- `SlideBody` gains a `machine` case; `bodyElements` and `bodyAddresses` publish states first,
  then one compiler-owned occurrence per scenario entry (`take-1`, `take-2`, ...), so an
  `activates:` in a prologue may reach a state by name and may not reach an occurrence.
- `beat.ts` grows `machineCues`, and the dwell policy decision:35 wrote for a silent step is
  *shared* rather than copied — one function, two callers, unchanged constants and unchanged
  behaviour for every existing protocol.
- `timeline.ts` builds `Beat`s for a machine exactly as it does for a protocol, through the same
  merge of anchors and placed dwells; no second code path.
- `parse.ts` accepts `machine:` as a body key, appends its occurrences after any prologue, and
  refuses a machine as an entity interior in both spellings with a sentence saying why.
- `chooseLayout` returns the new archetype for a machine body.
- Every existing test still passes, untouched.
