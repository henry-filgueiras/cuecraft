---
id: tsk_01KZKJZXKF30SS2S3AK8MJ9BE8
sequence: 119
kind: task
status: closed
sprint: spr_01KZKJZXJ4VSA798XRH4V88KQX
created: 2026-08-09
closed: 2026-08-09
---

# Draw the stubs, and look

## Objective

Draw the stubs, and let a rendered frame decide whether they stay.

## Acceptance criteria

- A stub per direction per marked plate, with its count, drawn in room the composition already has.
- Outgoing and incoming are distinguishable without a legend.
- Drawn in the topology's steel, below the weight of a real transition, and nowhere near the accent.
- No plate that lost nothing gains anything, and `examples/leases.yaml` renders pixel-identically.
- Two inspection passes over real frames at the canonical overview.
- A verdict, and if it is negative the stubs are removed rather than kept and tuned.

## The verdict: it stays

Two passes, one defect found and fixed, and the notation earns its place.

**What it looks like.** A dashed stub on the plate's flank with the count it stands for: incoming on
the left pointing *into* the plate, outgoing on the right pointing *away*. Both arrowheads run the
same direction, so the pair reads as through-flow rather than as two unrelated ornaments. Steel,
below the weight of a real transition, never the accent.

**It is sparse, which was the whole case for it.** `Queued 1 in`, `Claimed 1 out`, `Running 3 out`,
and `Retry wait`, `Cancelling` and `Cancelled` carry nothing. Three of six plates unmarked is a
notation carrying information; six of six would have been decoration.

**Pass one found the crowding.** `Running` carries both a self-loop and three elided exits, and at
`stubGap` 26 its stub sat close enough to `lease renewed` that the two read as one mark — a caption
with an arrow and a number after it, which is the `×N` grammar exactly. The first attempt at a fix
was wrong and worth recording: the stub was already starting outside `node.box`, because
`loopRoomFor` measures the loop's *caption* as well as its arc. So the problem was never the anchor,
it was the distance, and `stubGap` went to 78 with that reason written next to it. The guard against
`node.box` was kept anyway rather than reverted, because this module should not silently depend on a
reservation that belongs to `./machine.ts`.

**Pass two, mid-film, is the test that mattered most.** At frame 1650 `Claimed` is occupied and
glowing, and its stub sits beside it in steel — plainly recessive, and correctly *not* lit. An
elision is a fact about the machine, not about the run, so it must not brighten when the traveller
arrives. It does not.

**`examples/leases.yaml` is pixel-identical**: `x 447..1847, y 149..962` before and after, which is
the "no flag, no coupling to scope" property holding by construction rather than by a branch.

One thing traded and worth naming: at `stubGap` 78 the unmarked-plate stubs stand further off their
plates than they did — `Queued`'s incoming mark in particular. Unambiguous, because it sits on the
plate's own centre line, but looser than it was. One gap for every plate, rather than a wider one
only where a self-loop crowds it, because a per-node special case is a rule that is really two.
