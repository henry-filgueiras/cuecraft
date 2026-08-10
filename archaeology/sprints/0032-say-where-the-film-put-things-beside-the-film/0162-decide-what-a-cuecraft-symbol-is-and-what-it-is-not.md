---
id: tsk_01KZMJB3N1JEJ2CHP3D7R2FAZQ
sequence: 162
kind: task
status: closed
sprint: spr_01KZMJ9XPH1NF6T6JRPXBD0HBF
created: 2026-08-09
closed: 2026-08-09
---

# Decide what a cuecraft symbol is, and what it is not

## Objective

Settle the export contract before writing it: what a symbol is, how it is named, what its interval
means, which frame represents a slide, and which internal facts are deliberately not exported.

## Acceptance criteria

- A decision artifact records: the sidecar's filename convention, the top-level self-identifying
  fields, the canonical coordinate (integer frames) and the status of any seconds, the half-open
  interval convention, the stable-key namespace and its collision rule, the slide snapshot rule and
  what it honestly means, and the exported kinds.
- Every kind considered and refused names the query it failed to answer, or the identity that does
  not survive compilation.
- It states outright that this is a projection and not `Timeline`'s serialization, and what a future
  round is allowed to change without breaking a consumer.
