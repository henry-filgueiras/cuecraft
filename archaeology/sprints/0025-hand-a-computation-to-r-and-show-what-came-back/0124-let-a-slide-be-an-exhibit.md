---
id: tsk_01KZKNG28KCN7N1BBK8E1TZ255
sequence: 124
kind: task
status: closed
sprint: spr_01KZKNE2VBP4FK8GVSTT50E27Z
created: 2026-08-09
closed: 2026-08-09
---

# Let a slide be an exhibit

## Objective

An `exhibit` body: a slide whose content is an artifact a foreign program computed. Parsed,
validated, composed, and reachable from no other key.

## Acceptance criteria

- `exhibit: { run: <.R path>, with: { name: <path> } }` parses; `with:` is optional.
- Both `run:` and every input are repository-contained, using the same containment rule specimens
  use. Absolute paths and traversal are refused.
- A `run:` that is not a `.R` file is refused, naming what cuecraft can run.
- An input name that is not an identifier is refused.
- An exhibit declares no elements narration can reach, exactly as a figure does.
- The body selects one new archetype and no existing archetype changes.
- Every existing example renders identically.

## Done, and the absence of `image:` is the whole of it

`src/presentation/exhibit.ts` plus twelve lines in `parse.ts`, `body.ts` and `layout.ts`.
`exhibit: { run:, with: }` and nothing else — two keys, both paths contained, `.R` or `.r` only, an
input name that has to survive becoming an environment variable.

The program is read at parse time through the same injected reader a quoted specimen uses, so a
program that has moved fails the deck rather than the render. Everything else about the body is
what it *declines* to have: no elements narration can reach (`bodyElements` returns nothing,
`bodyAddresses` returns nothing), no interior in either spelling, and above all no way to name a
file that was not computed.

`chooseLayout` gained one line and no existing archetype changed. Every shipped example parses and
renders exactly as before; the only test that moved was the one asserting the list of body keys,
which now ends in `exhibit`.
