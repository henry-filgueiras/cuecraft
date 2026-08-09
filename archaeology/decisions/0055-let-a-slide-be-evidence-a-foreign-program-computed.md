---
id: dec_01KZKPX6V23SFEEXRZVZHJY980
sequence: 55
kind: decision
status: accepted
created: 2026-08-09
---

# Let a slide be evidence a foreign program computed

## Context

Every body cuecraft has is something the compiler can read. A list has a length, a specimen has
lines, a world has a topology, a machine has a reachable set. That readability is what makes
decision:10 possible at all: composition, type size, colour and timing are derived because there
is something to derive them from.

There is content that will never be readable that way. A quarterly revenue chart is the cheapest
honest example: producing one means reading transaction rows, deriving a quarter, grouping, and
summing, and none of that is a shape a presentation format should learn. It is a shape a
statistical environment already knows.

The obvious answer — let a slide name a PNG — was refused, and refusing it is most of this
decision. A deck that can display a checked-in image can display a **stale** one, and decision:18
already established that a copy which has drifted looks completely authoritative while asserting
something false. It would also put rendered media in the repository, which decision:3's
source/projection line exists to prevent.

## Decision

A slide may carry an **exhibit**: a program to run, and the files it may read.

    exhibit:
      run: examples/revenue/quarterly-revenue.R
      with:
        transactions: examples/revenue/transactions.csv

The program runs during compilation, in a stage of its own before narration is synthesized, and
whatever picture it declares becomes the slide's whole visual.

**There is no `image:` key and there will not be one.** The only way to get pixels onto a cuecraft
frame is to say what computes them. An exhibit quotes a *computation* the way decision:18's
specimen quotes a file.

The R program is **handed** the box it must fill and the deck's palette — width, height, base type
size, and four colours — through its environment. It does not choose them and there is no key that
could let a deck override one. That is decision:42's rule ("a composition is laid out inside the
box it was given") reaching across a process boundary, and it is what keeps decision:10's line —
an author cannot set a size, a position or a colour — true *through* the escape hatch rather than
only up to it.

An exhibit declares nothing narration can reach. A figure has no reachable elements because naming
one would make its derivation circular; an exhibit has none because cuecraft has never looked
inside the image.

An exhibit may not be an interior, in either spelling. The program is told its box once, and an
interior is drawn at concept scale rather than frame scale, so the type inside the picture would be
sized for a room it is not in.

## Consequences

- **The claim is structurally true rather than asserted.** Deleting the generated PNG changes
  nothing; editing the CSV changes the film; there is no third way to get an image onto a slide.
  `src/examples.test.ts` fails if an image is ever committed beside the demo deck.
- **A deck is no longer reproducible from the checkout alone.** It now also needs an R, and nothing
  pins which one — see the dragon this opened. The Kokoro weights are pinned by a lock file; R is
  not.
- **cuecraft's understanding of a slide stops at the frame.** For the first time the compiler
  places content it cannot describe: it can say the picture is 3312 by 1104 and that R made it, and
  nothing else. Every derived behaviour that reads a body — activation, camera, projection — is
  simply absent here, and that absence is what keeps the feature small.
- **The escape hatch is one language wide.** The runner is named for R, runs R, and is small enough
  to copy rather than parameterise. Generalizing it is parked, not designed for.
- **Compilation now runs arbitrary code from the deck.** A presentation that could previously only
  read files inside the checkout can now execute one. Containment still holds for *paths* — the
  program and every input must be inside the repository — but a `.R` file in the checkout is a
  program, and rendering somebody else's deck runs it.
