---
id: ide_01KZKVD4HD7HA7Z8RC0AGJQ8T1
sequence: 25
kind: idea
status: parked
created: 2026-08-09
---

# Let a region be the panel, not the plot area inside it

## Problem

The highlight frames the bars and leaves "Asia Pacific" outside it, sitting just above the box. It
reads slightly wrong: the thing being talked about is the panel, and the panel's name is not in the
rectangle that says so.

## Sketch

**cuecraft needs no change at all**, which is the interesting part. The region is whatever the
program reported, and `examples/revenue/quarterly-revenue.R` reports `par("usr")` — the *plot*
region, the data area inside the margins. The title lives in the margin above it, so it is outside
by construction.

R already knows the other rectangle. `par("fig")` is the **figure** region and is already in
normalized device coordinates, so it is both more correct and shorter than what the program does now:

    fig <- par("fig")
    cat(sprintf("#cuecraft region %s %.4f %.4f %.4f %.4f\n",
      id, fig[1], 1 - fig[4], fig[2], 1 - fig[3]))

That would enclose the title, the axis and the bars — the whole panel.

## Boundaries

What this is really an instance of: **cuecraft never decides what a region *is*.** decision:57 gives
the program the whole of that judgement, and this nit is the first evidence that the judgement is
real rather than nominal — two defensible rectangles exist for the same panel and the program picks.

So the temptation to resist is a cuecraft-side "expand the region to include nearby labels" rule.
It would need to know what a label is, which is exactly the knowledge the exhibit body exists to
avoid having.

Untried, and not obviously free: the figure regions of four `mfrow` panels **tile the whole
picture** with no gap, so adjacent highlights would touch edge to edge where they currently have
visible air between them. The handover would also travel a shorter distance. Whether that reads
better or worse than the present version is a question for a rendered frame.

## Evidence

Noticed watching the film after sprint:27, and deliberately not fixed — the round it belongs to was
finished and the deck is good enough to ship. Worth doing next time the revenue example is opened
for another reason, and worth checking against the tiling question above rather than assumed.
