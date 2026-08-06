---
id: tsk_01KZC2QHEKB416P9QEVJ0MG2FP
sequence: 10
kind: task
status: closed
sprint: spr_01KZC2QHEAGF95JM6BR7PCSP02
created: 2026-08-06
closed: 2026-08-06
---

# Compose slides from content shape rather than one template

## Objective

Stop applying one template to every slide. Let the renderer make a composition choice from what
the slide actually contains, within a design language small enough to keep coherent.

## Acceptance criteria

- Three or four curated archetypes, each an opinionated arrangement rather than a
  parameterisation of one template.
- Selection is deterministic, derived from bullet count and length, and unit-testable without a
  browser.
- No coordinates, sizes, column counts or layout names appear in the YAML.
- A deliberate type scale and spacing rhythm live in code and are not author-configurable.
- Content is sized to be read from across a room; the canvas is used, not decorated.
- Entrance motion establishes hierarchy and settles before narration carries the point.
- `cuecraft render` reports which composition each slide received.
