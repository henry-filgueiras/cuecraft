---
id: tsk_01KZEFMY3AFS2W2HE6BCPBG6QS
sequence: 25
kind: task
status: pending
sprint: spr_01KZEFJJVPNCDAJ6MJHYZCN95M
created: 2026-08-07
---

# Build the online-order specimen and its flat control

## Objective

Build the artifact that decides whether any of this explains anything.

**Anatomy of an online order.** Three scales, one causal path, no jargon:

    root         you press Buy  ->  paying  ->  packing  ->  it turns up
    child        the shop asks  ->  the check  ->  yes or no  ->  money set aside
    grandchild   what is known  ->  weighing it up  ->  allowed

The narration has to prove both resumptions or the artifact proves nothing: something is said in
the paying world *before* the check is opened and again *after* it closes, and something is said
in the root world after paying closes.

And the control, `examples/order-flat.yaml`: the same three worlds and substantially the same
sentences, as three ordinary slides. It exists to make the claim falsifiable. If the nested
version is only prettier, the honest place to write that down is the sprint.

## Acceptance criteria

- The root file references a child, and the child references a grandchild, each by a relative path.
- Both artifacts render end to end through `cuecraft render`, with the commands recorded.
- Frames at root context, first entry, grandchild depth, return to child and return to root are
  extracted and looked at.
- The two are compared on explanation rather than on motion, and the comparison is written down
  whichever way it comes out.
- No generated media is committed.
