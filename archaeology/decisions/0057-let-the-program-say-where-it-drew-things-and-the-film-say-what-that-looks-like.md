---
id: dec_01KZKRZZSP4JCP7A8AMPD1E1WR
sequence: 57
kind: decision
status: accepted
created: 2026-08-09
---

# Let the program say where it drew things, and the film say what that looks like

## Context

dragon:32 is the gap the film exposed: narration says "Asia Pacific doubles across the year" and
nothing on the frame responds, because cuecraft has never looked inside the picture. Two mechanisms
were spiked before choosing (task:131, task:132).

**They turned out not to be alternatives.** Base R's `svg()` emits a flat stream of clipped paths
with no `id` outside `<defs>`, no grouping per panel, and no `<text>` — text is outlined into glyph
paths. An SVG exhibit is geometry without meaning, so **addressing a particular thing requires the
program to say where it is, whichever format carries the picture**. What SVG independently buys is
resolution independence, which is dragon:31's problem, not this one.

## Decision

**The program declares where it drew things; cuecraft decides what being talked about looks like.**

One more protocol line beside the output (decision:56), in fractions of the drawn image, top-left
origin:

    #cuecraft region asia-pacific 0.5430 0.1377 0.7543 0.8192

and the deck reaches it with the vocabulary it already has:

    say:
      - speech: "Asia Pacific doubles across the year."
        activates: asia-pacific

cuecraft draws its **existing** activation treatment over that rectangle, at a frame derived from
measured audio, in the deck's own palette. There is no new emphasis vocabulary, no way to name a
colour, a duration, a border or a coordinate, and no key that reaches an element.

**A slide declares the identities its picture will have.** `exhibit:` gains a third key:

    exhibit:
      run: examples/revenue/quarterly-revenue.R
      with: { transactions: examples/revenue/transactions.csv }
      shows: [north-america, europe, asia-pacific, latin-america]

This is forced by an ordering, and the ordering is worth stating plainly: **anchors resolve at parse
time and R runs afterwards.** `activates:` resolving against `bodyElements` is how every identity in
this format is checked, and an exhibit's elements do not exist until a subprocess has finished. The
choices were to defer anchor resolution for one body kind — a special case cut deep into the
parser — or to have the author declare the names. The author declares them, and **materialization
refuses any mismatch in either direction**: a name the program never drew, or a region the deck
never asked for.

That refusal is what stops `shows:` being a second copy of something cuecraft could know. It cannot
know it at parse time, and the two statements are checked against each other on every render, so
they cannot drift. Reading the YAML also now tells you what the picture can be asked about without
running R.

**Emphasis is subtractive.** A raster cannot show part of itself at a different opacity, so the
treatment is a veil over the whole picture with a hole where the reached region is, driven by the
same `anchorState.degree` every other archetype uses. Same vocabulary, only mechanism a picture
allows.

## Consequences

- **dragon:32 is closed for regions and stays open for anything smaller.** Narration can reach
  something the program was willing to name. It still cannot reach "the third bar" unless the
  program declares the third bar, and it can never reach anything the program did not think of.
- **The palette came back as a handle nobody designed.** Because decision:55 hands R the deck's
  colours, an inlined SVG can be restyled from cuecraft's own stylesheet with no protocol at all —
  a rule matching the accent fill recoloured every bar in the spike. That is a *category* handle,
  not an instance one, and it is recorded rather than used.
- **The geometry cost nothing.** A wrapper carrying the drawn image's `aspect-ratio` with both
  maxima *is* the letterboxed image box, so regions are percentages inside it — no arithmetic and no
  DOM measurement, verified at three room aspects.
- **The `y` flip lives in the program.** R's device origin is bottom-left, CSS's is top-left. That is
  a fact about R and belongs on R's side of the boundary.
- **SVG is not rejected, it is deferred to its own question.** It would dissolve most of dragon:31
  and would make an exhibit immune to dragon:4 — text-as-paths has no font dependency — and neither
  of those is what this round was about.
