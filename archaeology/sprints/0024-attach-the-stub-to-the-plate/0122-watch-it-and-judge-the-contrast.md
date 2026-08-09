---
id: tsk_01KZKMCHBZSHMDAGN06M3NS5Q7
sequence: 122
kind: task
status: closed
sprint: spr_01KZKMCHASYR89994YFYWWWA0P
created: 2026-08-09
closed: 2026-08-09
---

# Watch it, and judge the contrast

## Objective

Render the film and judge it there, because that is where the defect appeared.

## Acceptance criteria

- `examples/leases-narrated.yaml` rendered in full and inspected, plus the closing and a mid-film
  frame where a marked plate is occupied.
- `examples/leases.yaml` pixel-identical.
- A verdict on the count's contrast: raised, or left alone with the reason recorded.
- `npm run check` and `scarp doctor` pass; tree clean; tasks closed.

## Watched, and the contrast is raised

Rendered in full and inspected at the closing overview and mid-film.

**The defect is gone.** All three marks read as attached to their plates: `Queued 1` into the left
edge, `Claimed 1` and `Running 3` off the lower-right. Nothing is clipped.

**Contrast: the count goes up, the line stays down.** The stroke stays at 0.5 alpha, which is what
an untaken transition is drawn at — a stub is not a transition and must not out-weigh one. The
count went from 0.75 to 0.92, because it is the payload and it is small, and at 0.75 it was being
read as texture rather than as a number.

Checked where it matters: at frame 1650 `Claimed` is occupied and glowing, and its `1` sits directly
beside that glow and stays plainly subordinate. The brighter count did not buy its legibility from
the accent.

**`examples/leases.yaml` is pixel-identical**: `x 447..1847, y 149..962`, unchanged across sprint:23
and sprint:24 both.
