---
id: drg_01KZEWFNGDCQJBJRTG7FY9V1NE
sequence: 16
kind: dragon
status: open
created: 2026-08-07
---

# An authored count is drawn in the voice of a derived one

## Context

decision:33's field renders as a grid of members and a running count, and the count is drawn *by*
the composition — `40 of 64`, derived from the same progress the cells are drawn from, so the two
cannot disagree.

Which raises a question the project has been quietly avoiding since decision:27: cuecraft now puts
**numbers on the screen that no author typed**.

The precedent is `figure`, which draws the compilation's own measurements, and decision:27 was
careful about the acyclicity — facts are frozen after the timeline is final, and a presentation
cannot read a derived value, so narration cannot change the measurements it is describing. A
series count is different in kind: it is not a fact about the compilation, it is a fact about the
*subject* that the author asserted, rendered back at them as a numeral.

That is fine when the number is right. It is a new failure mode when it is wrong, because the
composition lends it the authority of a derived value. `examples/sha256/` says `count: 64` and the
film asserts sixty-four rounds in large type; nothing about the rendering knows or could know
whether SHA-256 has sixty-four rounds. `src/examples.test.ts` checks it, and that test exists
because this artifact happened to be checkable against a standard. Most subjects are not.

## Question

Does a number an author asserts deserve to be set in the same voice as a number the compiler
derived?

## Constraints

The honest positions are both defensible and they are not compatible.

- **It is just content.** A bullet that says "sixty-four rounds" is equally unverifiable and
  nobody worries about it. Setting a count in large type is no different from setting a claim in
  large type, and a presentation tool is not a fact-checker.
- **It is not just content**, because the composition *counts along with it*. A numeral that ticks
  up as a field fills reads as a measurement of something happening, and that is the impression
  `figure` earned honestly and this one borrows. A viewer cannot tell which of the two they are
  looking at, and the whole of decision:27's care was about not letting them be confused.

There is a third position worth writing down: the distinction may be invisible and unimportant to
every viewer, and only matter to the archaeology.

## Candidate direction

Leave it. Write down that it was noticed, because the next thing that draws an authored number in
a derived voice will be the second data point and two is when a pattern is worth acting on. If it
ever needs answering, the cheapest answer is probably typographic rather than architectural —
`figure` and `series` could be set in visibly different registers, so that "the compiler measured
this" and "the author asserted this" do not look alike.

## Resolution criteria

Close as **resolved** if a second authored-number composition appears and a rule is chosen. Close
as **weakened** if watching several of these makes it clear no viewer could be misled.
