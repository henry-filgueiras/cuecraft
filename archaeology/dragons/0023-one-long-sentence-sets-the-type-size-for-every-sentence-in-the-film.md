---
id: drg_01KZHTWKZ1TYMFEGC7DN6H67PJ
sequence: 23
kind: dragon
status: open
created: 2026-08-08
---

# One long sentence sets the type size for every sentence in the film

## Context

`fitSubtitle` is fitted across every sentence the film will show, deck-wide, and that is deliberate:
type that resized when the narration moved on would put a change of size under every full stop
(decision:40, and `fitQuote`'s move before it). It was right on both specimens it was designed
against, because `witnessglass` and `aside` say short sentences of roughly uniform length.

`examples/orpheus-failover.yaml` says 59 sentences, of which one is:

    "The time service informs both regions that now is Tuesday, although it has declined to
     specify the same Tuesday to each of them."

128 characters. It drives the fit to `SUBTITLE.minSize`, and every other cue in the film pays it —
including "To which Tuesday?", "I agree. West does not." and "Reliability approves." `witnessglass`
sets its subtitles at 42px; both bickering decks set theirs at 30.

A two-narrator argument has exactly the shape that provokes this: dozens of one-clause retorts, plus
two or three set-piece speeches from whoever is doing the explaining. It is the shape the Retry
explainer will have.

There is a second-order effect that made it worse before decision:42. A two-line block at 30px is
*shorter* than one at 42px, so the deck with the longest sentence gets the **smallest** band — 206px
against `witnessglass`'s 238 — which left less room for the composition above, not more.

## Question

Should the subtitle's size be fitted across the whole deck, or across something smaller than a deck
and larger than a cue?

## Constraints

- Per-cue fitting is settled and refused. It puts a change of type size under every full stop, and
  the subtitle is supposed to be the least eventful thing on the frame.
- Per-slide would mean the size changes at slide boundaries, where the whole composition changes
  anyway. That is the interesting candidate and it is not obviously safe: two adjacent slides whose
  longest sentences differ slightly would step the type for no reason a viewer could name.
- A percentile — fit to the 90th-longest sentence and let the outlier take a third line — trades one
  deck-wide constant for another and needs `SUBTITLE.lines` to stop being a preference.
- Nothing here may touch the band's derivation from the fit, or the room the composition gives up
  would stop being one number.

## Candidate direction

Watch the Retry explainer. If a film built deliberately for two narrators reads well at whatever its
longest sentence dictates, this is a property of two decks written to stress-test a layout rather
than of the feature. If it does not, the first thing to try is the percentile, because it keeps the
deck-wide constant that makes the band derivable.

## Resolution criteria

- **A film where the type size is the thing a viewer notices**, rather than a number that looks
  small next to another deck's.
- Or a deck where the longest sentence is genuinely necessary and the film is genuinely harmed by
  it — which is a question about the writing as much as about the fitter.
