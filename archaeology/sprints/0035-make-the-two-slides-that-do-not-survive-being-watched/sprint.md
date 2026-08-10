---
id: spr_01KZMT59TE6S528DXCD68THMBX
sequence: 35
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Make the two slides that do not survive being watched

## Goal

Fix the two slides of `examples/phantom/` that do not survive being watched, and leave the
showpiece in a state where the first video a stranger meets has nothing visibly wrong with it.

Two defects, found by watching the film rather than by reading the symbol table — which is itself
the finding, because sprint:34 read every slide and every anchor through
`out/phantom.symbols.json` and neither of these is a thing a frame extraction reveals:

1. **Slide 4's specimen overflows its floor.** The quoted `say:` block is twenty-four lines where
   about thirteen fit, and the overflow is drawn straight through the subtitle band and over the
   subtitle's own text. This is `dragon:37` exactly — `fitSpecimen` computes the size at which the
   block would fit, then discards it at `CODE.minSize` and nothing afterwards notices.
2. **Slide 5's drawing reads as broken.** Three of twenty-two marks are named, so three flicker
   between accent and dim while nineteen never change. There is no perceived pattern, and the
   chart's whole subject is a pattern: a disturbance walking down the staircase one car at a time.

## Rationale

`decision:68` put a deck in slot 1 on the argument that it is the first thing anybody sees. That
cuts both ways. A specimen drawn over its own subtitles, in the slide whose entire job is *"here is
the whole source of what you just watched"*, is the worst possible place in this repository for a
layout failure — the slide is asking to be read closely and then cannot be.

The second is subtler and worse. Slide 5 is not merely unclear; it looks like a bug. Marks
flickering with no discernible relation to the sentences reads as an emphasis system that does not
work, on the slide immediately after the one that just demonstrated that everything is derived.

Neither fix is a compiler change. `dragon:37` stays open and stays a compiler problem — the deck
is one of two decks that have now hit it, and that evidence belongs on the dragon rather than
being spent as a reason to widen this round.

## Success criteria

- Slide 4's specimen fits inside its box with the subtitle band present, verified on an extracted
  frame at full resolution, and still shows all three marks — `play:`, a `during:` sentence, and
  `replay:`. Quoting less is the fix; the slide keeps its point.
- Slide 5's drawing reads as one thing moving. Whatever the mechanism, a viewer who has not been
  told what to look for should see the emphasis travel down the staircase rather than blink at
  three unrelated places.
- Every name the drawing writes is a name the slide shows and the narration reaches, in all three
  directions, and `src/examples.test.ts` still enforces it.
- The film does not get longer. It is 3:35.9 and that was already the weakest result of
  `sprint:34`; a fix that costs thirty seconds is not a fix.
- `dragon:37` records `examples/phantom/` as its second sighting, with the measured numbers.
- `npm run check` and `scarp doctor` pass, `out/upload/phantom.mp4` is regenerated under 10 MB,
  and the README's duration matches the film.

## Non-goals

- **No compiler change, and no attempt on `dragon:37`.** "What should a composition do when the
  size that would fit is below the size that is legible?" is a real question affecting at least
  two archetypes, and it is not answered in a round whose purpose is to make one deck correct.
  Elision, scrolling and shrink-past-the-floor are all out.
- **No new archetype, no new vocabulary, no second temporal exhibit.** The obvious way to make
  slide 5 cascade is to have `wave.R` return an MP4 and animate it. That would delete the only
  addressed-SVG demonstration in the deck to solve a legibility problem, and slot 1 already has a
  film.
- **No re-litigating the subject or the slide order.** `decision:68` is settled.
- **No new spoken quantity.** `dragon:41` is open and this round does not make it worse; anything
  the narration would like to say about where the wave has got to is said by the picture instead.

## Outcome

Both slides fixed, both at the deck rather than at the compiler, and the film got shorter rather
than longer.

### The specimen


Slide 3's `say:` block went from twenty-four lines to thirteen. `opens:` shows a construct whole —
the line plus everything indented beneath it — so there is no way to quote part of one, and the
block itself had to shrink.

The sentences spoken over a frozen frame were the right place to take it from, and this was a
better deck all along: "Hold it there. One gap has closed by fifteen centimetres." is a held
breath, where the version it replaced ran on for a second clause because it had been written to
be read rather than to stop a film. All four states are still reached, `replay:` still runs, and
the three marks the specimen calls out are all inside the quote.

It paid twice. Slide 3's narration fell from 71.3s to 52.0s and the film came down with it: 3:35.9
to 3:16.1, which is twenty seconds off the result sprint:34 called its weakest.

### The drawing

Two causes, both addressed. The marks are now joined by a chain, so the run down the staircase is
visible before anything is said — twenty-two unconnected dots were a scatter that happened to
descend, and the subject of the slide is that they are one thing going somewhere. And five marks
are named instead of three, spread through the order rather than gathered at its ends, so the
emphasis walks the chain.

The names are computed from the cast — `first`, `behind`, `quarter`, `half`, `last`, at
`round(CARS / 4)` and `round(CARS / 2)` — so they mean what they say at any ring size, and no new
spoken quantity was introduced. Where the wave has got to is said by the picture.

### What this round found out

**The symbol table cannot see a layout failure.** sprint:34 read every slide and every anchor of
this film through `out/phantom.symbols.json`, exactly as `decision:66` intends, and shipped a
specimen drawn through its own subtitles. The sidecar reports where meaning landed *in time*; an
overflow is a failure *in space*, and the frame that reveals it is not one of the frames a symbol
names. Reading a render through its symbols is necessary and it is not sufficient, and the gap
between those two is now a deck that went out wrong.

**Emphasis on a drawing is only legible in proportion to how much of the drawing is named.**
decision:59's rule — the other *named* elements recede, and what the program never named carries
on — is right, and it has a consequence nobody had met yet: name three of twenty-two and
activating one produces a flicker at three unrelated places while nineteen marks never move. It
does not read as emphasis. It reads as a bug. The count of named elements is a legibility
decision, not just a vocabulary one.

**dragon:37 has its second sighting and is unchanged.** The clamp in `fitSpecimen` still computes
the size that would fit and still discards it at `CODE.minSize`. Two decks have now paid for it
and the measured numbers are on the dragon. Fixing it was this round's first non-goal and stayed
one.
