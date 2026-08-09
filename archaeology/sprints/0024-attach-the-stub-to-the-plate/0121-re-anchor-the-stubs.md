---
id: tsk_01KZKMCHBSWS7K38HXZV8E8P2K
sequence: 121
kind: task
status: closed
sprint: spr_01KZKMCHASYR89994YFYWWWA0P
created: 2026-08-09
closed: 2026-08-09
---

# Re-anchor the stubs

## Objective

Re-anchor the stubs to the plate's own boundary, under one rule, and close the gaps.

## Acceptance criteria

- Outgoing and incoming both start on the plate boundary, by one rule that does not branch on
  whether the plate has a self-loop.
- The count sits close enough to its arrowhead to read as one mark.
- Nothing crosses: no self-loop, route, event label or plate, on either example.
- `MACHINE.stubGap`'s reason is rewritten or the token removed, so no constant is left carrying a
  justification that is no longer true.

## Done, and the rule is asymmetric on purpose

Outgoing leaves the plate's lower-right on a forty-five degree diagonal. Incoming arrives straight
into the plate's left edge, level with it. Both begin on the boundary itself.

**The first attempt mirrored them and clipped.** Up-and-left for incoming is the obvious mirror of
down-and-right for outgoing, and it put `Queued`'s mark outside the frame: `Queued` is the topmost
plate, `layout.bounds` ends at its top edge, and `canonicalOverview` is fitted to those bounds. The
composition has room below its lowest plate and beside its leftmost. **It has none above its
highest**, and sprint:24's non-goal says a stub may not ask for any.

So each direction takes the side that is free for it. Outgoing cannot use the right flank because a
self-loop always lives there (`selfLoop`), which is what sent sprint:23's version five hundred units
away; a corner diagonal clears the loop because a loop attaches inside the plate's middle band and
bulges sideways. Incoming can use the left flank precisely because nothing is ever reserved there.

That is one rule per mark rather than one rule with a branch inside it, and it is the honest shape:
the two marks are not symmetric because the plate's two flanks are not.

`MACHINE.stubGap` fell from 78 to 20 and now means only "how far past the arrowhead its count sits".
Its old justification — standing clear of a self-loop's caption — is gone along with the placement
that needed it.

Nothing crosses a loop, a route, a label or a plate on either example. One crowding noted and not
fixed: `Running`'s `3` lands between `handler exceeds its deadline` and `cancellation withdrawn`.
Legible, and in the busiest quarter of the busiest machine.
