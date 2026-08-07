---
id: drg_01KZEHVANTGCWRQ9V2CS82G67M
sequence: 12
kind: dragon
status: open
created: 2026-08-07
---

# The length of a descent is neither authored nor derived

## Context

Every duration in cuecraft is either authored or measured. `pre_say` is written down. A clip's
length is measured off the samples (decision:13). A camera move's length is asked of
`interpolateZoom`, which reports what its own path wants at constant perceived velocity
(decision:22) — nobody chose it, which is the whole reason it is defensible.

decision:31 introduced two that are neither:

    ENTER_MS = 1900
    EXIT_MS  = 1700

They are not authorable, and that part is right: a key that let a deck set them would be a camera
instruction wearing a duration's clothes, and decision:22's rule about geometry applies exactly.
But "not authorable" is not the same as "derived", and nothing derives these. They are two numbers
that looked right on one artifact, and they are load-bearing — they are the silence the descent
happens in, so they set the pace of every entry and exit in the piece.

decision:25's `enterTravel` and `exitTravel` have the same character and a better excuse: they are
*durations of a transition*, and the decision argues them as a directorial choice about how long a
threshold should take to cross. These are longer than that. They are the transition plus an
approach plus a beat, and the reason they are 1.9 and 1.7 rather than 1.4 and 1.2 is that the
online-order specimen sounded better that way.

## Question

Is the length of a descent a directorial constant, or is it derived from something nobody has
found yet?

## Constraints

There are candidates, and each has a problem:

- **Derive it from the camera**, as the length the approach plus settle plus expansion actually
  needs. Circular in the wrong direction — the camera currently fits itself into the window the
  narration left, and inverting that would make narration timing depend on graph layout, so a
  world laid out differently would speak at a different pace.
- **Derive it from the child**, so that a long module gets a longer threshold. Plausible, and
  probably wrong: how long it takes to walk through a door has nothing to do with the size of the
  room.
- **Let the author pause.** `- pause: 800ms` before an `enter:` already works and composes. That
  might be the whole answer — make the constant the *minimum* and let an author who wants a slower
  descent write the silence they already know how to write.

The last one is the cheapest and is not obviously right either, because it hands an author a way
to make the transition look broken.

## Candidate direction

Leave them as constants and watch what happens on a second nested artifact with a different
rhythm. If they need to change, that is evidence they are content-dependent and the third option
becomes the shape. If they survive a piece that is faster or slower than the online order, they are
directorial constants like `revealTravel`, and the decision should say so explicitly rather than
leaving them looking accidental.

## Resolution criteria

Close as **resolved** when a second nested artifact either keeps them or shows what they should
have been derived from. Close as **superseded** if the descent stops being a fixed silence at all.
