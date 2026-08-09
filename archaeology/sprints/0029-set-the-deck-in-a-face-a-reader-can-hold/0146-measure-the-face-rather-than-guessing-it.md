---
id: tsk_01KZM5GH3CKQNKX3ETEB6VK92S
sequence: 146
kind: task
status: pending
sprint: spr_01KZM5EXSYFDBB87YWSEQSC0V0
created: 2026-08-09
---

# Measure the face rather than guessing it

## Objective

Measure the hyperlegible profile's five advance-width estimates against the real WOFF2 in the real
rendering environment, over a corpus of strings this repository actually sets, and keep the
measurement as a tool rather than as five numbers nobody can re-derive.

## Acceptance criteria

- A developer script drives the headless Chromium, loads the faces, measures a corpus — short and
  long headings, prose, protocol and state labels, mixed case, punctuation, digits, ambiguous
  glyphs, code, timestamps and the hostile graph labels from `examples/leases.yaml` — and reports
  the per-class ratio distribution against both profiles.
- The corpus is drawn from the shipped decks rather than invented.
- The chosen values are **conservative**: at or above the measured mean, so a heading that the
  estimator says fits actually fits, without wrapping text that has no need to.
- A test asserts the shipped constants still bound the corpus, so a font upgrade that moves the
  metrics fails the suite instead of clipping a film.
- The default profile's measured ratios are reported too, as the control.
