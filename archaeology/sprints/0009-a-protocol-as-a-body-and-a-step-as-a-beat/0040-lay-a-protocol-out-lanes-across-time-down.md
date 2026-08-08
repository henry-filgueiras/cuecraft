---
id: tsk_01KZFC38V324402P62N66DEMAT
sequence: 40
kind: task
status: closed
sprint: spr_01KZFC13DGXRSF95PKWG894JMA
created: 2026-08-07
closed: 2026-08-07
---

# Lay a protocol out: lanes across, time down

## Objective

Lay a protocol out in world coordinates: lanes across, time down. Deterministic, pure, testable
without a browser, and free of anything an author wrote about geometry.

What the layout has to decide: lane positions, actor plate sizes, row heights, where a message label
sits and how it wraps, the arrow's endpoints, and which steps are *replies* — which is derivable
from the call stack the from/to sequence already implies, and is therefore not something an author
should ever be asked to mark.

## Acceptance criteria

- `src/render/protocol.ts` produces lanes, rows, arrows and label boxes from the body alone.
- Lane order is the authored order and nothing reorders it.
- A row's height follows from its label's wrapped line count; a label wraps to a measure derived
  from the arrow it belongs to, and never overlaps its neighbours' labels.
- Reply detection is a stack rule stated in one paragraph and tested on a nesting protocol.
- A self-message gets a geometry of its own rather than a zero-length arrow.
- Property tests: lanes never move between renders of the same body; every arrow's endpoints lie on
  its lifelines; no two rows overlap.
