---
id: tsk_01KZEFMY2WJRWE4QX3C24DYFPC
sequence: 22
kind: task
status: pending
sprint: spr_01KZEFJJVPNCDAJ6MJHYZCN95M
created: 2026-08-07
---

# Carry the call stack in the compiled timeline

## Objective

Make the call stack inspectable in the compiled timeline, not inferable from the renderer.

The timeline is already the boundary where a duration becomes frames and an identity becomes an
anchor. It is therefore the right place for the descent to become visible, and the wrong thing to
do is to leave it implicit in the shape of a React tree.

    narrate(root)
    enter(root, root/payment, payment)
    narrate(root/payment)
    enter(root/payment, root/payment/check, check)
    narrate(root/payment/check)
    exit(root/payment/check, root/payment)
    narrate(root/payment)
    exit(root/payment, root)
    narrate(root)

## Acceptance criteria

- A clip carries the scope it is spoken in; an anchor carries the address it reaches.
- `Scene.calls` carries every scope transition in frame order, with the frame it begins on and the
  frames it occupies.
- One function turns a scene into the merged event sequence above, and it is what the tests assert
  against.
- The sequence is well-formed: every enter has a matching exit, they nest, and the stack is empty
  at the end.
- Repeated compilation of the same source produces an identical sequence.
- The CLI reports the descent after a render, so the stack is visible without a test runner.
