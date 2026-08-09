---
id: spr_01KZKMCHASYR89994YFYWWWA0P
sequence: 24
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Attach the stub to the plate

## Goal

Attach an elision stub to the plate it is about, instead of to the far side of whatever the plate
has beside it.

## Rationale

sprint:23 shipped the stubs and they work — the reduction is more legible for having them, and the
notation is sparse enough to read as a footnote. Watching the film found the flaw that a still and a
measurement both missed.

`Running` carries a self-loop, and the loop's reserved room includes its caption. The stub is
anchored outside all of it, so `-> 3` sits roughly five hundred world units from the plate it
describes — vertically aligned with it and directly right of `lease renewed`. That is defensible
from the geometry and wrong from the frame: a mark that far away has to be *worked out* rather than
read, and `stubGap` going to 78 to fix a crowding problem made it worse for every plate that was
never crowded.

The rule was wrong rather than the constant. A stub should read as an edge **leaving the plate** —
which means starting on the plate's own boundary, at no distance at all. The flank is the one place
it cannot do that, because the flank is where a self-loop lives.

## Success criteria

- A stub begins on the plate's boundary, not beyond anything reserved beside it.
- One rule for every plate, whether or not it has a self-loop. A placement that is really two
  placements is refused.
- The gap between arrowhead and count is small enough that they read as one mark.
- No stub crosses a self-loop, a route, an event label or another plate, on either example.
- Still distinguishable from a real transition without a legend, and still recessive against
  occupancy — checked on a mid-film frame, which is what caught the last round's real risk.
- `examples/leases.yaml` renders pixel-identically.
- Judged on the rendered film, not on a still: this defect was invisible in the stills that passed
  sprint:23's two inspection passes.

## Non-goals

- **No layout change**, for the fourth sprint running. Whatever room a stub uses, the composition
  already has.
- No second policy about which plates are marked — idea:21 stays parked.
- No new colour and nothing in the accent. Raising the count's contrast is in scope; changing what
  it is drawn in is not.
- Not a redesign. If attaching at the boundary cannot be made to work without crossing something,
  the finding is recorded and the flank placement stands.

## Outcome

**The stubs attach to their plates now, and the rule that gets them there is asymmetric.**

    outgoing   leaves the plate's lower-right, on a forty-five degree diagonal
    incoming   arrives straight into the plate's left edge, level with it

Both begin on the boundary itself, so `MACHINE.stubGap` fell from 78 to 20 and now means only how
far past the arrowhead a count sits. Its old justification — standing clear of a self-loop's caption
— went with the placement that needed it.

### The mirror was the obvious answer and it was wrong

Up-and-left for incoming is the natural mirror of down-and-right for outgoing, and it put `Queued`'s
mark **outside the frame**. `Queued` is the topmost plate, `layout.bounds` ends at its top edge, and
`canonicalOverview` is fitted to those bounds. The composition has room below its lowest plate and
beside its leftmost; it has none above its highest, and this round's non-goal said a stub may not
ask for any.

So each direction takes the side that is free for it. Outgoing cannot use the right flank, because a
self-loop always lives there — which is exactly what sent sprint:23's mark five hundred units away.
Incoming can use the left flank, because nothing is ever reserved on it. **The two marks are not
symmetric because the plate's two flanks are not**, and a rule that pretended otherwise drew off the
edge of the film.

### Contrast, judged rather than assumed

The stroke stays at 0.5 alpha, which is what an untaken transition is drawn at: a stub is not a
transition and must not out-weigh one. The count went to 0.92 from 0.75, because it is the payload,
it is small, and at 0.75 it read as texture rather than as a number. Checked where it could have
gone wrong — at frame 1650 `Claimed` is occupied and glowing and its `1` sits directly beside that
glow, still plainly subordinate. The brighter count did not buy its legibility from the accent.

### Against the success criteria

Met: stubs begin on the boundary; one rule per mark with no branch on whether a self-loop is
present; the count reads as one mark with its arrowhead; nothing crosses a loop, route, label or
plate on either example; still distinguishable from a real transition and still recessive against
occupancy; `examples/leases.yaml` pixel-identical at `x 447..1847, y 149..962`; judged on the
rendered film.

Recorded and not fixed: `Running`'s `3` lands between `handler exceeds its deadline` and
`cancellation withdrawn` — legible, and in the busiest quarter of the busiest machine. Whether that
wants solving is a question for a frame that convicts it rather than for this round.

### What was refused and stayed refused

**No layout change**, for the fourth sprint running: `layoutMachine`, `audition.ts`, `DEFAULT_LAYOUT`
and `layout.bounds` are untouched, and the clipped mirror was solved by moving the stub rather than
by widening the bounds it fell outside. No second policy about which plates are marked — idea:21
stays parked. No new colour and nothing in the accent; the only change was one alpha on the count.
