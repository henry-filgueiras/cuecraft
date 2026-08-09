---
id: tsk_01KZKWRXS1EA2R465KJDE5F6TY
sequence: 138
kind: task
status: closed
sprint: spr_01KZKWMMWAQ497JEVVVG56BRSX
created: 2026-08-09
closed: 2026-08-09
---

# Take back an SVG and a CSV, and check both to the bytes

## Objective

Extend decision:56's protocol from one output type to three: `png` as it stands, plus `svg` and
`csv`, each validated to the bytes with the guarantees `png` already has.

`svg` is validated by parsing the root element for a `viewBox` (or width/height), and the semantic
identities inside it are **discovered** — every `data-cuecraft="<identifier>"` in the file — rather
than declared on a second protocol line. That is the difference from decision:57: a region has to be
declared beside the picture because a raster cannot carry it; an SVG can.

`csv` is validated as a header row plus at least one data row, with a consistent column count, no
blank or duplicate header, and a documented ceiling on rows and columns.

## Acceptance criteria

- `R_OUTPUT_TYPES` is `png`, `svg`, `csv`, and `ROutput` is a union discriminated on it — no
  optional geometry fields shared between a picture and a table.
- Every existing refusal (containment, absolute path, missing, not-a-file, empty, unknown type,
  duplicate name) applies unchanged to all three.
- SVG-specific refusals: not XML with an `<svg` root, no dimensions, a `data-cuecraft` value that is
  not an identifier, a duplicate identity.
- CSV-specific refusals: no header, header only, ragged rows, blank/duplicate column name, past the
  row or column ceiling.
- All of it tested with no R installed; the live test proves an actual R program's SVG and CSV
  come back.
