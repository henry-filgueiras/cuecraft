---
id: drg_01KZJ51E42CSK9CFGA6N6533J2
sequence: 26
kind: dragon
status: open
created: 2026-08-08
---

# A matrix cell that wraps overruns the room the subtitle band reserved

## Context

`examples/off-the-record.yaml` slide 1 is a three-cell matrix with subtitles on. Its third cell,
`No permanent record`, is too wide for its column at the size `fitTerm` chose. It wraps to two
lines, the second line is drawn **through the subtitle's speaker label and over the first line of
the subtitle itself**, and the frame is unreadable in the one place the deck most needs to be read.

The cause is one line, and the shape of it is that a whole composition was missed by an earlier
round:

    src/render/theme.ts:229    export function fitTerm(count: number): number
    src/render/layouts.tsx:325 function Matrix(...)          // never calls useSubtitleBand()

`fitTerm` takes the **cell count and nothing else** — not the text, not the box. `Matrix` is the
only list composition that does not ask `useSubtitleBand()` how much room it actually has;
`IndexList` does (`layouts.tsx:419`), and so does `Cascade`. sprint:14 taught the compositions that
the band takes room they have to respect, and decision:42 states the principle — a composition is
laid out inside the box it was given. Matrix did not get either.

The overflow direction is why this survived four rounds unseen. The term is vertically centred in a
fixed `1fr` grid row, so a wrapped cell spills equally above and below. In the **top** row that lands
inside the frame and looks like tight leading. In the **bottom** row it lands on the band.

`examples/retry.yaml` slide 1 has two 24-character matrix cells — longer than the one that failed
here — and they wrap. They are in the top row. That is the whole reason the shipped recall specimen
never showed this, and it is not a property anybody chose.

There is also a gap between what the archetype *admits* and what it can *hold*. `TERSE_BULLET` is
24 (`src/render/layout.ts`), and 24 characters do not fit. Measured on the rendered frame at
`fitTerm(3)` in a 780px column: `Execution: Morgan` (17) sits on one line; `No permanent record`
(19) does not. The selection rule is looser than the composition by roughly seven characters.

## Question

Should `matrix` derive its type size from the box it was given, as every other list composition
already does — or should the archetype stop accepting a cell it cannot set on one line?

## Constraints

- **The principle is not in question, only its application.** decision:42 and sprint:14 settled that
  a composition is laid out inside the box it was given. This is a composition that did not get the
  memo, not a new argument about layout.
- **Tightening admission has a cost decision:10 was built to avoid.** `TERSE_BULLET` is documented as
  "where a phrase stops being a label and starts being a sentence" — a claim about *meaning*. Lower
  it to 17 and it becomes a claim about pixel width in a two-column grid at one type size, which is a
  rendering constant smuggled into the rule that picks compositions. decision:15's role-then-shape
  ordering would still hold; what would stop holding is the reason the number is what it is.
- **The precedent is one function away.** `fitIndex(rows, box)` already answers exactly this question
  for the neighbouring archetype, and `indexHeight` already asserts the answer fits. Whatever
  `fitTerm` becomes, it should not become a second, differently-shaped mechanism.
- **Two lines are not obviously wrong.** A three-word term set on two lines could read perfectly
  well. What is wrong is that *nothing accounts for the second line* — not the type size, not the row
  height, not the band. An answer that merely forbids wrapping decides less than it looks like it
  decides.

## Candidate direction

## Resolution criteria

Settled when a matrix cell long enough to wrap has been rendered in the **bottom** row of a
subtitled deck and either sits wholly inside the box the band left it, or the archetype no longer
accepts it and the deck that produced this frame is composed some other way. A fix judged from
source rather than from that frame does not settle it — this defect was invisible in source for four
rounds and took one deck to make it visible.
