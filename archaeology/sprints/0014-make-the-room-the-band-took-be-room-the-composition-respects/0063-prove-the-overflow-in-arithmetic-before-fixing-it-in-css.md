---
id: tsk_01KZHRVYXRMVS2HSZJR7AXT713
sequence: 63
kind: task
status: closed
sprint: spr_01KZHRVYW57XJRGBFQYN90SGCS
created: 2026-08-08
closed: 2026-08-08
---

# Prove the overflow in arithmetic before fixing it in CSS

## Objective

Establish, as arithmetic rather than as a rendered frame, which stacked archetypes can overflow
`bodyBox(title, band)` and at what inputs — so the fix is aimed at the ones that actually fail and
the ones that do not are known to be safe rather than assumed to be.

## Acceptance criteria

- A test that, for every stacked archetype, computes the height its content occupies and asserts it
  fits inside `bodyBox(title, band)` across a grid of realistic titles, row counts, row lengths and
  band sizes — including the two decks' actual worst cases.
- The test fails before the fix, on the inputs the renders failed on.
- Whatever it says about `lead`, `matrix` and `index`'s siblings is recorded, including "safe".
