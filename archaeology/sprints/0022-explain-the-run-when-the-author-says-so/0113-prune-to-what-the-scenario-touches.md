---
id: tsk_01KZKHF8DJJMC31JRC54PF6AGB
sequence: 113
kind: task
status: closed
sprint: spr_01KZKHF8BF2P8G72QXG4BH13G9
created: 2026-08-09
closed: 2026-08-09
---

# Prune to what the scenario touches

## Objective

Prune the machine to what the scenario touches, in exactly one place, so that layout, camera,
ledger, chrome and `explain` never disagree about which machine they are describing.

## Acceptance criteria

- The reduction is derived from the scenario alone: the transitions it takes, and the states those
  transitions touch. No other criterion exists in the code.
- Applied at one call site. Every consumer of a machine sees the same one.
- `scope: whole` changes nothing, byte for byte.
- A scenario that touches every transition reduces to the machine unchanged, and a test says so.
- Permuting, reversing or rotating the scenario changes neither which states survive nor any
  coordinate — a touched set is a set.
- Every transition the scenario takes survives. A test asserts no occurrence is stranded, on both
  examples, under both scopes.
- What was removed is available as counts to whatever has to declare it.
