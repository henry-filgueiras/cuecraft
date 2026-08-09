---
id: tsk_01KZJ8SKG2XB8ZEZC2YE5PRQ8E
sequence: 87
kind: task
status: closed
sprint: spr_01KZJ8R3RA1F5J5HEEJ40Z6GSP
created: 2026-08-08
closed: 2026-08-08
---

# Grammar and validation for a state machine body

## Objective

`src/presentation/machine.ts`: the thirteenth body's grammar and validation, hand-checked in the
style every other body in this format is hand-checked, so that an author who mistypes a state name
is told which name and which names exist.

## Acceptance criteria

- `states` is a mapping of identity to label; `transitions` is a mapping of identity to
  `{ from, to, on }`; `scenario` is a list of `{ take, say?, pronounce? }`.
- States and transitions share one identity namespace, and `take-N` is reserved against both.
- Refused, each with a diagnostic naming the offending identity and listing what is declared:
  a transition naming an undeclared state; a scenario entry naming an undeclared transition;
  a scenario whose entry does not begin at the current state; an empty scenario; fewer than two
  states or one transition; a `pronounce` for a word that is not in that occurrence's `say`.
- Accepted, and tested as accepted: a self-transition; two distinct transitions between the same
  ordered pair; a bidirectional pair; a transition never taken by the scenario; the same
  transition taken repeatedly, narrated on one occurrence and silent on another.
- `scenarioPath` reports the state occupied before and after every occurrence, so nothing
  downstream re-derives continuity.
