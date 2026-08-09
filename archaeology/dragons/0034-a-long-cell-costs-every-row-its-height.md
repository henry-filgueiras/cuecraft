---
id: drg_01KZKZJPG11F8M6PDM47TH1EF9
sequence: 34
kind: dragon
status: open
created: 2026-08-09
---

# A long cell costs every row its height

## Context

decision:60 makes a register's row height uniform, and derives it from the tallest cell anywhere in
the table. That is what turns "reveal row 73" into `73 * rowHeight` — a multiplication, with no
running sum, no per-row measurement and no state — and it is most of why the viewport can be a pure
function of the narration's claims rather than of the previous frame.

The bill arrives in the showcase. `examples/pivot/`'s table has one prose column, and its longest
value is 46 characters against four numeric columns of five. Every one of the twenty-four rows is
sized for that sentence, so the room holds six rows where a table of numbers alone would hold nine.
A single long value in a single cell costs a third of the viewport for the whole table.

## Question

Should a register's rows be uniform?

The layout arithmetic wants them to be. The content does not: a table where one row in eight has
something long to say is exactly the table somebody would put on a slide, and it is the case where
uniformity is most expensive.

## Constraints

- **The viewport must stay a pure function of the claims.** `registerScroll` folds over sentences,
  not frames, so a still is reproducible in isolation. Variable row heights make "where is row 73"
  a prefix sum, which is fine — it is still pure — so this constraint is *not* actually the
  blocker it looks like. What it does cost is that `visibleRows` stops being one number and becomes
  a function of where the viewport is.
- **`overflows`, the readout and `reveal` all read `visibleRows` today.** "rows 11–16 of 24" is
  derived from a constant window; a variable one makes it "rows 11–15 of 24" on some frames and
  "11–16" on others, which is correct and reads as flicker.
- **Elision is not the alternative.** Capping every cell at one line would remove the cost and lose
  the content, and the prose column is the one that says which rows are worth looking at.
- **The current behaviour is not wrong**, only expensive. Nothing overruns, the bound holds, and the
  film is legible. This is a cost, not a defect.

## Candidate direction

- **Leave it and document it**, which is what decision:60 does today: a long cell is expensive for
  every row, and a deck that wants nine rows writes shorter values.
- **Two-tier rows.** Let a row be one or two lines and make the viewport a prefix sum. Costs a
  variable window and a readout that moves.
- **Give the prose its own treatment** — a second line under the row rather than a column of its
  own, so the numeric grid stays one line tall. That is a *composition* answer rather than a layout
  one, and it is the only candidate that does not make the arithmetic worse.

## Resolution criteria

A table whose row count is visibly too low for what is on screen — or a measurement showing that the
decks that actually get written do not have one long column. The showcase does have one and it still
reads well, so this is not yet convicted.
