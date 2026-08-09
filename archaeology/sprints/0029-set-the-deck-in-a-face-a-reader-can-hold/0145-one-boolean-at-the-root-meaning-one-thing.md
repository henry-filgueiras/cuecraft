---
id: tsk_01KZM5GH36655SVCAPHY0WB0AZ
sequence: 145
kind: task
status: closed
sprint: spr_01KZM5EXSYFDBB87YWSEQSC0V0
created: 2026-08-09
closed: 2026-08-09
---

# One boolean, at the root, meaning one thing

## Objective

Add the public hook — `accessibility: dyslexia: true` at the presentation root — and carry the
resolved intent through parse, compile and `buildTimeline` onto the `Timeline`, so the profile is
settled before a single fitter runs.

## Acceptance criteria

- The key is an optional strict object at the document root with one optional boolean. Omitted and
  `false` both resolve to `default`; `true` resolves to `hyperlegible`.
- A misspelled key inside it is reported the way every other unknown key in this format is, with the
  allowed set named.
- `accessibility:` on a slide, or inside a module document, is **rejected** — not ignored.
- `Timeline` carries the profile's **identity**, not a font family. Nothing in the compiled model
  names a typeface.
- `cuecraft explain` reports the resolved profile.
- Focused parser tests for each of the five cases above.
