---
id: tsk_01KZKEHNBZKPJS9M7D029NWH6J
sequence: 106
kind: task
status: closed
sprint: spr_01KZKEG1YAXVEEKNNAW1X05CJ4
created: 2026-08-09
closed: 2026-08-09
---

# Audition the seeded candidates against the unseeded ones

## Objective

Put seeded candidates into the audition against unseeded ones, on the scoring that already exists,
and let the election decide rather than the author.

## Acceptance criteria

- One grid generates both families; the incumbent and the best unseeded candidate are both still
  reported, so the round can say what seeding bought rather than that it ran.
- Scoring is unchanged in its signals. If a signal has to change for seeded candidates to win, that
  is recorded as a finding and argued on its own, not folded in silently.
- `cuecraft explain --audition` shows both families and names the elected one.
- `--sheet` draws the elected seeded candidate beside the elected unseeded one, at the exact
  canonical overview, so a caption unreadable in the panel is unreadable in the film.
- Election stays deterministic to the last tie, and the candidate count is reported.
- The elevator's elected layout is checked against every seeded candidate as the control.

## Abandoned, with task:105

There are no seeded candidates to audition. The scoring, the election and `--audition` are
unchanged; `audition.ts` was not touched.

The one part of this task that did happen, happened in `out/harness/core.ts` instead: seeded
candidate *families* were generated and scored, on both films, against the two floors — which is
what would have decided the election had any of them been worth electing. None was. Recorded in
task:103 and decision:53.
