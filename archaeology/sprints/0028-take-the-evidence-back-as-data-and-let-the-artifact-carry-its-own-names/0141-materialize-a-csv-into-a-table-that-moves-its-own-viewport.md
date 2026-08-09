---
id: tsk_01KZKWRXSQ2563KRK7N04ABZ6V
sequence: 141
kind: task
status: closed
sprint: spr_01KZKWMMWAQ497JEVVVG56BRSX
created: 2026-08-09
closed: 2026-08-09
---

# Materialize a CSV into a table that moves its own viewport

## Objective

The first exhibit cuecraft lays out itself: a CSV a foreign program computed, rendered as a bounded
table whose rows are addressable, and which moves its own viewport to reveal a row narration reached.

## Acceptance criteria

- The archetype is chosen from **what came back**, not from what the deck wrote — a `csv` output is
  a table and a `png` is a picture, and the YAML says neither.
- Identities are generated from the data: `row-<key>` from a `key:` column the deck names, and
  `column-<header>`. No selector syntax anywhere, in any form.
- Columns are measured with the estimator the rest of the repository uses; a row is a fixed height
  and content that does not fit is elided rather than allowed to overrun (dragon:26).
- The viewport is bounded, and activating a row outside it moves the viewport deterministically to
  reveal that row, then emphasizes it. Nothing authored says to scroll.
- Attention leaving a row returns it to ground.
- Documented, enforced limits in preference to best-effort rendering of arbitrary CSV.
