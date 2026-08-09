---
id: tsk_01KZKHF8DDPEV2RK4954T0TDB3
sequence: 112
kind: task
status: closed
sprint: spr_01KZKHF8BF2P8G72QXG4BH13G9
created: 2026-08-09
closed: 2026-08-09
---

# The scope key

## Objective

Add `scope` to the machine grammar: two values, `whole` and `narrated`, defaulting to `whole`.

## Acceptance criteria

- `scope` parses on `machine:` and nowhere else, with `whole` as the default when absent.
- An unknown value is an authoring error naming both valid values, in the house style, with the
  path the author can find.
- `MACHINE_KEYS` and the grammar documentation include it, and the module docstring's list of
  refusals is updated to say what this key is and what it still refuses.
- A machine without `scope` produces exactly what it produces today. A test asserts the resolved
  body is unchanged.
- No other key is added.
