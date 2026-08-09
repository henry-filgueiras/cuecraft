---
id: drg_01KZKZJPGCMZK4RGQHE221KE9J
sequence: 35
kind: dragon
status: open
created: 2026-08-09
---

# The technique that names an SVG element lives in the deck

## Context

decision:59 lets a program name what it drew by drawing in a sentinel colour, finding that colour in
its own SVG output, and rewriting it into a name plus the real fill. It works, it is base R, it needs
no package, and it is **twelve lines that live in the deck's own R program**.

`examples/pivot/quarterly-chart.R` carries them. Any second deck that wants an addressable drawing
copies them.

## Question

Where does that helper belong, if anywhere?

The obvious answer is a cuecraft-supplied R file the runner prepends to every program, and it is
refused today for a reason that is easy to state and hard to hold: **an R library cuecraft ships is
a plotting API with one function in it**, and decision:55's whole boundary is that cuecraft does not
have one. The moment there is a `cuecraft.R`, the pressure to add `cuecraft_palette()`,
`cuecraft_theme()` and `cuecraft_barplot()` to it is continuous, and every one of those moves a
judgement about how a picture looks back across a boundary that exists to keep it on R's side.

But duplication has its own failure. The technique depends on an implementation detail of cairo's
SVG output — one `<path>` per drawing call, a fill written as three percentages. If a future cairo
writes `fill="#ff0001"` instead, every copy of the helper in every deck breaks independently, and
the ones that break silently are the ones whose `stop()` guard somebody deleted.

## Constraints

- **cuecraft may not learn what a bar is.** Any shared helper that takes a plot rather than a colour
  has crossed the line.
- **The refusal has to survive being convenient.** sprint:25's finding was that the *refusal* did
  more work than the feature; this is the same shape.
- **There is exactly one deck.** One caller is not evidence — the same rule that kept occupancy out
  of `anchor.ts` for three rounds (idea:20, decision:61).

## Candidate direction

- **Nothing, and say so.** Twelve lines is a small thing to copy, and a deck that copies them owns
  them. This is the position today.
- **A documented technique rather than a shipped file** — the helper as prose in `src/compute/svg.ts`
  and in the example, which is where it is now, so a second deck copies from a place that explains
  itself rather than from another deck.
- **A `#cuecraft tag` protocol verb**, which would move the naming out of the SVG and back beside it
  — and would be regions again, with the drawback decision:59 exists to remove.

## Resolution criteria

A second deck wanting an addressable drawing. If the copy is mechanical and correct, the duplication
is fine; if it is subtly wrong in a way the first deck's `stop()` guard would not catch, the helper
needs a home.
