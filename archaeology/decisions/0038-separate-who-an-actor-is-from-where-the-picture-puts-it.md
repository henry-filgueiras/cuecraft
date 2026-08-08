---
id: dec_01KZFJRG3QTB6376BC0DW6CDA9
sequence: 38
kind: decision
status: accepted
created: 2026-08-07
---

# Separate who an actor is from where the picture puts it

## Context

The transcript composition (decision:34) gives x a meaning — **x is who** — and then spends one
column per declared actor for the whole running time. `examples/tap.yaml` is the case that makes
that look free: five parties, all present for almost the whole film, and stable positions a viewer
learns once and never has to relearn.

`examples/deploy.yaml` is the case that makes it look expensive. Eight parties, several of whom say
four things in the first fifteen seconds and are never heard from again, each holding a column for
the remaining ninety. The cast comes to 4547 world units, which is close enough to
`TRANSCRIPT.widest` that the establishing shot sets eight names at around twenty-four screen pixels
(dragon:18), and every later shot is scaled to a world that is mostly nobody.

What makes that fixable rather than inherent is something cuecraft has and a diagram editor does
not: **it reads the whole protocol before it draws a frame.** An actor's first and last step are
both known offline, so an actor has a *live interval*, and two actors whose intervals do not
overlap could be given the same column at different times — `N` semantic actors, `M` physical
columns, `M < N` when the exchange permits it. That is interval allocation, and the resemblance to
a register allocator is exact: the intervals are known in advance, the assignment is a pure
function of the source, and it is computed once and never revised.

The thing that makes it *hard* is not the arithmetic. Interval colouring is solved and its answer
for `deploy` is four columns. The hard part is that **semantic death is not visual death.** An
actor's last message is not the moment it leaves the picture: its arrows are still on screen,
decaying but legible, for as long as the camera keeps them. Dropping a new name into a column while
its predecessor's traffic is still in frame makes the film assert something nobody wrote — that this
party continues that one — and no entrance treatment repairs a claim the geometry is making
underneath it.

## Decision

**An actor's identity and its presentation column are different things, and the compiler owns the
second one.**

A new pass, `src/render/tenancy.ts`, sits between parsing and layout:

    parse  ->  actor lifetimes  ->  physical column allocation  ->  existing layout  ->  existing camera

- **Arrival order, lowest free column.** Actors are considered in the order they enter the story,
  ties broken by declaration order, and each takes the lowest-numbered column it may. Nothing is
  ranked by lifetime, traffic or degree, and there is no scoring function.
- **A free column is one that has cooled**, not merely one whose tenant is semantically finished.
  Reclamation requires strictly more than `TRANSCRIPT.maxHistoryRows` clear rows — the constant that
  already answers "how far back may a frame reach". The rule states as: *a column cools for as long
  as a shot can remember*, so the outgoing tenant's last row and the incoming tenant's first row
  cannot appear together in any frame `stepBounds` is capable of composing.
- **A plate marks the head of a tenancy, not the head of a lane.** A column's first tenant has held
  it since before the film began, so its plate is in the cast row exactly as before. A later tenant
  takes possession in place: the outgoing lifeline closes with a **terminator**, and the incoming
  actor's plate is drawn immediately below it, in vertical room the row cursor reserves so that no
  arrow or label can ever be underneath it.
- **A terminator is a fact about the column and never about the actor.** "This column stops being
  this party" is something the layout knows; "this party is finished" is a claim about the protocol
  it does not get to make. So an actor that keeps its column to the end keeps its lifeline to the
  end, and a protocol that reclaims nothing draws exactly what it drew before.
- **The rail names the current tenant.** Tenancy changes exactly where the arrival plate is drawn,
  so the rail and the picture cannot disagree, and a viewer who missed a handover because the camera
  was three columns away can still never be told a wrong name.
- **Nothing author-facing changed.** No `lane:`, no `importance:`, no policy name, no override. The
  allocation is reported by `cuecraft render` — actors, columns, peak live, reuses — because a
  derived decision an author cannot see is a decision they cannot argue with.

**Ranking by lifetime was auditioned and rejected.** The tempting hypothesis is that longer-lived
actors should get the leftmost, most structurally anchored columns. `examples/tap.yaml` refutes it
in one line: its longest-lived actor is the shop's bank, and lifetime order gives a cast of
`bank, network, issuer, you, terminal` — which destroys the one thing that file gets for free, that
the question travels left to right and the answer comes back the way it went.

The pathology ranking was invented for — disposable early actors permanently staking the best real
estate — turns out to be handled by **reuse alone, and better**. Early actors that vanish do not
need to be demoted; they need to *vacate*, and vacating hands the leftmost columns to whoever comes
next without anybody being ranked. `examples/coldstart.yaml` is built to show exactly this.

## Consequences

Measured on the three artifacts, with the camera untouched:

    example     actors  columns  peak live  reuses   cast width      pan      zoom range
    tap              5        5          5       0   2493 (=)     4749 (=)     1088 (=)
    deploy           8        6          4       2   3300 (-27%)  4819 (-27%)  2597 (-41%)
    coldstart        9        7          5       2   3988 (-22%)  3892 (-24%)  4004 (=)

- **`examples/tap.yaml` is byte-for-byte the film it was** — every lane position, plate, row, band,
  bound and camera key identical, confirmed against the previous implementation and by SSIM against
  the previous render. The healthy case pays nothing, and a test asserts it.
- **The camera improved exactly in proportion and not more.** `deploy`'s pan fell 27% and its world
  narrowed 27%; pan measured as a fraction of world width is unchanged at 1.45. So width reduction
  bought absolute travel and bought nothing behavioural, which is the cleanly separated answer the
  round wanted. The 41% fall in zoom range is the more interesting gain: shot sizes are more
  consistent because the world no longer contains regions the shot has to open up to reach.
- **The cooling rule costs real columns**, and the cost is reported rather than absorbed: `deploy`
  uses six where four are arithmetically possible, `coldstart` seven where five are. Whether that
  price is worth paying is genuinely open — see dragon:19, which records what a maximally aggressive
  boundary produced when it was built and watched.
- **A reclaimed column is always one an early actor vacated, which is always a leftmost one**, while
  the late phase of a protocol usually lives on the right. So a newcomer tends to land *far* from
  the actor that introduced it: `coldstart`'s cache takes column one while the orders service sits
  in column six, and `orders -> cache` crosses the whole picture. The choice among free columns
  never actually arose on either example — every reclamation had exactly one candidate — so this is
  not the lowest-free rule being greedy. It is structural, and it trades world width for arrow
  length.
- **Hue is a fact about the column, so two tenants share one.** Deliberate, and the weaker half of
  the handover notation: hue answers "who sent this arrow whose tail is off the frame", which is a
  question about the present, and no two tenants are ever present together. Distinguishing them in
  *memory* is the terminator's, the plate's and the rail's job.
- **dragon:18 is loosened, not resolved.** `examples/coldstart.yaml` has nine actors — one past the
  ceiling that dragon recorded — and establishes cleanly, because only seven of them are ever in the
  opening row. But the opening row is still "the first tenant of every column", which is not the
  same thing as "who this story is about", and a protocol with nine *simultaneously live* actors is
  exactly as unshowable as it was.
- **`examples/deploy.yaml`'s prologue now counts eight parties over six plates.** True of the
  protocol, no longer true of the opening frame. Left alone rather than reworded, because editing
  the adversarial artifact to flatter the implementation is the thing that artifact exists to
  prevent.
