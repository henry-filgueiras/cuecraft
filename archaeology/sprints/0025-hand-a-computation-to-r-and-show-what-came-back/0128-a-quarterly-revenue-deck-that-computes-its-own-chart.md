---
id: tsk_01KZKNG29GRATQA2PQWARP8238
sequence: 128
kind: task
status: closed
sprint: spr_01KZKNE2VBP4FK8GVSTT50E27Z
created: 2026-08-09
closed: 2026-08-09
---

# A quarterly revenue deck that computes its own chart

## Objective

A deck that makes the claim checkable: raw transaction rows in, a chart out, and narration that
says what happened.

## Acceptance criteria

- The CSV is transaction-level and unaggregated: no quarter column, no totals.
- The R program derives the quarter, groups by quarter and region, and sums revenue.
- The chart is legible from a room: large type, few colours, no chartjunk.
- The deck shows its own `exhibit:` block as a specimen, so the film contains its own source.
- The narration says the chart was computed during the build, and that is true.
- No PNG is committed.

## Done, and the deck shows its own source

`examples/revenue/`: 468 transaction rows (date, region, product, revenue — no quarter, no totals),
a 120-line R program, and a five-slide deck. The R derives the quarter from each date, aggregates by
quarter and region, and draws.

**The chart is small multiples on a shared scale, not four coloured series**, and the reason is a
constraint rather than a preference: four hues would have to come from a ramp between the two
colours cuecraft supplies, which is exactly the palette that cannot be told apart at a distance or
with any colour vision deficiency. Identity is carried by each panel's title and magnitude by the
single accent, so nothing is encoded in hue at all — and cross-region comparison stays direct
because the y axis is shared. It also happens to be the palette discipline `theme.ts` already
describes for specimens: one accent and four greys.

The third slide quotes the fourth slide's own `exhibit:` block through `code: { file:, slide:,
opens: }`, so the film contains its own source and cannot drift from it.

`src/examples.test.ts` gained three checks that keep the deck honest: the population it draws must
be the CSV's per-region counts and the narration's spoken "four hundred and sixty-eight" must be the
row count; "Asia Pacific doubles" and "Latin America does not move" are computed from the data and
fail if they stop being true; and **the directory must contain exactly three files**, so committing
an image makes the test fail rather than making the deck a liar.
