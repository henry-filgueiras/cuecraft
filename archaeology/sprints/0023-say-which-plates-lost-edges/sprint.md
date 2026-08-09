---
id: spr_01KZKJZXJ4VSA798XRH4V88KQX
sequence: 23
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Say which plates lost edges

## Goal

Say, on each plate, that edges were pruned from it — one stub for the omitted outgoing edges and one
for the omitted incoming ones, each carrying a count.

decision:54 made a reduced slide declare its aggregate under the title. That says *how many*
transitions are missing and cannot say *where*, and the gap is not academic: in
`examples/leases-narrated.yaml`, `Running` draws four of its seven exits and nothing on the frame
says so. A viewer reading that plate believes the machine says something it does not.

## Rationale

sprint:22 shipped the reduction and recorded the residual dishonesty in its own outcome: omitting a
state is announced in the counts, but understating a state that was *kept* is announced nowhere.
This closes that.

The information is already computed — the induced subgraph knows what it dropped — and measuring it
before building says the notation will carry information rather than decorate:

    leases-narrated (6 of 9 states, 9 of 14 transitions)
      queued       out 1/1   in 1/2     1 in omitted
      claimed      out 1/2   in 1/1     1 out omitted
      running      out 4/7   in 3/3     3 out omitted
      retry        out 1/1   in 2/2     —
      cancelling   out 2/2   in 1/1     —
      cancelled    out 0/0   in 1/1     —

      2 of 6 plates marked for outgoing, 1 for incoming. Three carry nothing.

    leases (whole)     0 of 9 marked
    elevator (whole)   0 of 6 marked

**It needs no flag and no coupling to `scope`.** A mark is a pure function of *declared* edges
against *drawn* edges, which is zero for any whole-scope machine — so every existing deck is
untouched by construction rather than by a conditional, and any future mechanism that elides an edge
lights it up for free.

**And it says what the aggregate cannot.** "9 of 14 transitions" is a total; per-plate marks are the
distribution. That is decision:49's ledger-against-wake argument one level down, and the same test
applies: if the marks merely restate the counts, they are chrome competing with the map.

### The claim, stated so it can fail

> A stub with a count, on the plates that lost edges, makes a reduced machine honest about which
> states it is understating — without competing with the map or with occupancy.

It fails if the frames say it is noise. `Running` is a hub with a self-loop and a stub on the same
flank, and three stubs on a six-state machine may read as clutter rather than as notation. The
render is the judge, and a refusal here is a result: the aggregate counts under the title already
ship and already work.

## Success criteria

- One stub per direction per plate: outgoing omissions summed into one mark, incoming into another.
  Not one stub per dropped edge.
- Each carries the count it stands for. A stub without a number says "something is missing" and is
  the `…` decision:49 refused.
- The two directions are told apart on the frame without a legend.
- A plate that lost nothing gains nothing. An unreduced film is unchanged, checked on pixels.
- It recedes: drawn in the topology's own steel, never in the accent, and never brighter than a real
  transition. It is a footnote about the map, not part of it.
- Legible at the canonical overview, judged on a rendered frame rather than on a font size.
- Two inspection passes, and an honest verdict. If the frames convict it, it comes out.

## Non-goals

- **No layout change.** Stubs are drawn in room the composition already has — outside `node.box`,
  which is the plate plus whatever was reserved beside it for self-loops. If they can only be made
  to work by reserving new room through dagre, that is a finding and a separate round.
- **No second policy.** Not "only entry and terminal states", not "only hubs", not a threshold on
  the count. If the frames say the notation is too busy, the candidates are recorded as an idea and
  judged next round, not guessed at now.
- **No naming what was dropped.** A count, never a list. dragon:18 refused a rail of sentences and
  this is that rail attached to a plate.
- **No new colour, and nothing in the accent.** The one warm thing on a machine frame is occupancy.
- **No change to `scope`, to the reduction criterion, or to the aggregate declaration.**

## Outcome

**The stubs stay.** The claim held: a stub with a count, on the plates that lost edges, makes a
reduced machine honest about which states it is understating, and the frames say it competes with
neither the map nor occupancy.

    leases-narrated, at the canonical overview
      Queued       1 in       Retry wait   —
      Claimed      1 out      Cancelling   —
      Running      3 out      Cancelled    —

Three of six plates unmarked, which is what makes this notation rather than decoration. `Running`
draws four of its seven exits and now says so.

### What the frames decided that the measurement could not

**The mid-film frame was the one that mattered.** At frame 1650 `Claimed` is occupied and glowing,
and its stub sits beside it in steel, plainly recessive and correctly *not* lit. An elision is a
fact about the machine rather than about the run, so a mark that brightened when the traveller
arrived would be answering the wrong question with the composition's only warm colour. It does not.

**Pass one found the one real defect, and the first fix for it was wrong.** `Running` carries a
self-loop and three elided exits, and at `stubGap` 26 the stub sat close enough to `lease renewed`
that the two read as one mark — a caption with an arrow and a number after it, which is the `×N`
grammar exactly. The instinct was that the stub was anchored too close in; it was not. `loopRoomFor`
already measures a self-loop's caption as well as its arc, so the anchor was correct and the
*distance* was wrong. `stubGap` went to 78, with that reasoning recorded next to the constant so the
next person does not re-derive it.

### Against the success criteria

Met: one stub per direction per plate, summed rather than per dropped edge; each carries its count;
the two directions are told apart by side and arrowhead without a legend; plates that lost nothing
gain nothing and `examples/leases.yaml` renders pixel-identically at `x 447..1847, y 149..962`;
drawn in the topology's steel below the weight of a real transition and nowhere near the accent;
legible at the canonical overview, judged on a frame; two passes and a verdict.

**No layout change**, which was the non-goal most likely to be argued with. The stubs are drawn in
room the composition already had — outside `node.box` — and no machine moved. `layoutMachine`,
`audition.ts` and `DEFAULT_LAYOUT` are untouched for the third sprint running.

Traded and named rather than hidden: at `stubGap` 78 every stub stands further off its plate,
including the ones that were never crowded. `Queued`'s incoming mark is looser than it was —
unambiguous, because it sits on the plate's own centre line, but looser. One gap for every plate
rather than a wider one only where a self-loop crowds it, because a per-node special case is a rule
that is really two.

### One thing learned about the criterion, from a failing test

A test written to assert that a dropped self-transition is reported in both directions failed, and
the assertion was wrong rather than the code: **a self-loop on a surviving state can never be
elided**, because both its endpoints are that state and the induced subgraph keeps it whenever it
keeps the state. It is now pinned as that property instead — the one shape where "the run never took
it" and "the slide does not draw it" come apart, and a later criterion that broke it would be
quietly hiding a state's own loop.

### What was refused and stayed refused

No second policy. idea:21 records the two candidates — entry-and-terminal-states-only, and a
threshold on the count — parked with the density that made them unnecessary and the evidence that
would bring them back. Naming what was dropped stayed refused: a count, never a list. No new colour,
nothing in the accent, and no change to `scope`, to the reduction criterion, or to the aggregate
declaration under the title.
