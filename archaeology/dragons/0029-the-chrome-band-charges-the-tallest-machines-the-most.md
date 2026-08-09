---
id: drg_01KZJBFQ8HVNP9X0HM0000V2TJ
sequence: 29
kind: dragon
status: closed
created: 2026-08-08
resolved-by: "[[dec_01KZJHNFNYJCX8MPF0EYC3J6DC|Choose the shot sequence, not each shot]]"
---

# The chrome band charges the tallest machines the most

## Context

`MACHINE.chrome` takes a fixed 216-pixel strip off the top of every frame of a `circuit`, so the
camera can never draw a state under the title or the readout. It was added because the first render
of `examples/elevator.yaml` printed the deck title across the first transition's label, and it is
the same trick `useSubtitleBand` plays at the bottom of the frame.

The cost is not symmetric and it is not small. A **wide** machine's shots are width-bound and pay
nothing at all — `examples/leases.yaml` is byte-identical in framing with the band and without it.
A **tall** machine's shots are height-bound and pay about a third more width for every shot in the
film: the elevator's worst shot went from 2903 to 3603 world units, and its event labels from 22
screen pixels to 18.

So the composition currently charges its tallest artifacts the most, for chrome that is fully
present for about a second of the establishing shot and then reduces to a two-line readout in the
opposite corner.

## Question

Should the reserved band be a constant, or should it be what the chrome actually occupies at this
frame — and if the latter, how does the camera avoid moving when the chrome changes?

## Constraints

The band cannot vary per frame without varying the camera per frame, and a viewport that grew when
the title faded would be a zoom nobody asked for and no author wrote. That is the reason it is a
constant, and the reason is good.

It could vary per *film*: the title's height is known before anything is laid out, and so is the
readout's. But they are nearly the same height, which is why one number covers both, so that buys
almost nothing.

The genuinely different option is to stop putting chrome over the composition at all — to give a
`circuit` a real gutter that the machine is drawn beside rather than under. That is a bigger change
than it sounds, because the atlas and the transcript both bleed, and a third bleeding composition
that does not bleed is a fourth kind of frame.

## Candidate direction

## Resolution criteria

Close as **correct** if a third and fourth machine both pay the band without the loss being
noticeable — that is, if no shot in either is judged too wide because of it. Close as **wrong** if
a machine appears whose shots are visibly compromised, in which case the answer is probably the
gutter rather than a smaller number.

## Resolution

**Closed as wrong, and the gutter was the answer** — the one this dragon named and called "a bigger
change than it sounds". sprint:20, decision:51.

What made it affordable was not a change of mind about the cost. It was that the round had to build
a gutter anyway: decision:49's execution ledger is a screen-fixed rail down the left of the frame,
and once a `circuit` has one of those the deck title has somewhere to live that is not on top of
anything. The band's whole justification was that a caption fixed to the frame collides with
whatever is behind it; a caption in a gutter is behind nothing.

So the reservation is now entirely horizontal and the asymmetry reverses:

    elevator   height-bound. Paid the band in full, pays the gutter nothing.  26.5px -> 37.5px
    leases     width-bound.  Paid the band nothing, pays the gutter in full.  23.4px -> 23.9px

The elevator's forty percent is the band being refunded; the leased runner's small gain is
decision:52's layout audition paying for the gutter out of a better-fitted map. Both films also lost
the title fading out thirty seconds in, which was never a feature — a film whose title disappears is
a film a viewer cannot name from a paused frame.

The cost did not vanish, it moved: the composition now charges its **widest** machines rather than
its tallest, and for a chronology that is on screen for the whole film rather than a caption that is
on screen for a second. That is a better trade and it is still a trade, which is dragon:30.
