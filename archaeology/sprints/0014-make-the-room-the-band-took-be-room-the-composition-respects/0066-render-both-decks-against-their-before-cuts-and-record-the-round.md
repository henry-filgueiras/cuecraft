---
id: tsk_01KZHRVYY5KV3C05SE4YQP7CC8
sequence: 66
kind: task
status: closed
sprint: spr_01KZHRVYW57XJRGBFQYN90SGCS
created: 2026-08-08
closed: 2026-08-08
---

# Render both decks against their before cuts, and record the round

## Objective

Render everything, watch it, and record the round.

## Acceptance criteria

- `meridian-bickering` and `orpheus-failover` rendered and compared against the `-before` cuts kept
  in `out/`, frame for frame at the timestamps that failed.
- `witnessglass`, `onscreen`, `aside` and `tap` re-rendered and watched for regressions.
- A decision records why the box was not being respected and what now guarantees it; the subtitle
  type tax is recorded as a dragon.
- `npm run check` and `scarp doctor` pass, sprint:14 closed against its criteria, no MP4 committed.
