---
id: tsk_01KZEFMY3129RXGSFWQRJSG5GY
sequence: 23
kind: task
status: closed
sprint: spr_01KZEFJJVPNCDAJ6MJHYZCN95M
created: 2026-08-07
closed: 2026-08-07
---

# Make the camera a stack that pushes and pops scopes

## Objective

Make the camera a stack: entering pushes the enclosing view, exiting pops it.

`cameraPlan` already opens and closes portals, but it *derives* both from which cue reached what,
and it recomputes the shot to return to. Neither survives contact with a module. The entry is now
scheduled — it has a frame and a duration on the narration track — and the return must land on the
view the camera actually left, not on a fresh framing that happens to be similar.

So the plan takes the schedule as an input and keeps a stack of viewports. The derived behaviour
decision:25 shipped is untouched: an inline `detail` still opens because the narration reached
inside it, and still closes on the first cue that does not.

Nesting composes for free and that is worth checking rather than assuming: a grandchild's
coordinates are interpreted in the child's frame because the child is drawn into a rectangle in
the parent's frame, so the transforms multiply and there is nothing to accumulate error in.

## Acceptance criteria

- `cameraPlan` accepts scheduled calls and uses their frames, not its own derivation, for those
  entities.
- The approach lands before the scheduled entry; the expansion occupies the scheduled window; the
  contraction and the beat after it occupy the scheduled exit window.
- The viewport after an exit is identical to the viewport before the matching entry.
- Events inside a scheduled scope produce no framing decision in the enclosing scope.
- An entity with a module is not entered by being reached, only by being called.
- Two nested scopes unwind one at a time, to the immediately enclosing view, in the right order.
- The existing cathedral portal produces the same plan it produced before.
