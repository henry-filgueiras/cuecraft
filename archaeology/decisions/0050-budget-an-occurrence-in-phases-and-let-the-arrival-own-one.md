---
id: dec_01KZJHM65G7T6EYDWBNW5Z80EJ
sequence: 50
kind: decision
status: accepted
created: 2026-08-08
---

# Budget an occurrence in phases, and let the arrival own one

## Context

decision:35's derived clock gives a silent occurrence one number: transit plus a reading allowance
for its label, clamped, decayed across a run. sprint:19 transferred it to a machine without a
constant changing and recorded that as its strongest evidence about which of cuecraft's policies are
real.

`cuecraft explain` — built in this round precisely so a claim about perception could be checked —
says the transfer was incomplete, and the numbers are not close:

    elevator   3 silent occurrences, stable hold 0, 0 and 18 frames
    leases     6 silent occurrences, stable hold 0, 0, 0, 0, 18 and 24 frames

Four of nine had **no stable frame at all**. Two things were happening at once and the module could
not see either, because one number cannot be spent in two places and be seen to have been.

- **The crossing eats the front of it.** `MACHINE.cross` is sixteen frames and it comes out of the
  middle of the allowance, so a 962ms occurrence has thirteen frames left after the traveller lands.
- **The camera eats the back of it.** `MACHINE.lead` kept a move from running into the traversal it
  served and said nothing about the traversal *before* it, so the move for occurrence N+1 routinely
  began before occurrence N had landed.

## Decision

**An occurrence is a budget over named phases, and the stable arrival is one of them.**

    camera      the move that serves it, which happens before it, out of the tail of the one before
    traversal   the traveller crossing. A motion, capped by the occurrence's own length
    arrival     the frame occupancy lands on. Not an interval
    narration   what is said over it, if anything
    hold        the stable frames after arrival: nothing moving, occupancy established

The phases are derived in one place (`occurrencePhases`), consumed by the instrument and the tests,
and they are what the assertions are written against — so "the camera never moves while the
traveller does" is a property of the *timeline* rather than an inference from two constants.

**A silent occurrence is priced by the larger of tracing and arriving, never by the sum.**
`occurrenceDwellFor` is `max(dwellFor(label, run), TRANSIT + ARRIVAL_MS · decay)`. The larger,
emphatically: the viewer reads the label *during* the stable window rather than after it, so the two
are not additive, and two padding mechanisms added together is how a film ends up four minutes long
with nothing in it. One decay, applied once to whichever term wins.

**The finding is that the arrival binds and the prose does not.** For every label in both example
machines occupancy prices the occurrence; only a label past about forty characters takes the length
back. decision:46 valued "rewording an event retimes the frame that shows it", and that property is
now true of long labels and of every narrated occurrence and is no longer true of a short silent
one. It was traded deliberately: a frame that retimes to the word and cannot be perceived is not
worth the property. `dwellFor` and `dwellMs` are untouched and the transcript is timed as it was —
this is a machine asking for something a protocol has no equivalent of, not a protocol policy bent.

**A camera move must fit between the previous arrival's flare and this occurrence's lead, or it does
not happen.** The window opens at `arrival + MACHINE.arrivalQuiet`, which is the length of the
arrival flare and therefore derived rather than picked — a camera that leaves while the announcement
is still going has interrupted it. If the window is shorter than a move, the shot holds, and the
consequence is the interesting part: **a run of silent occurrences cannot afford a move between
them, so the shot that opens the run has to contain the whole run.** That is not a rule anybody
wrote; it is why decision:51's planner has to look forward.

**The closing shot is budgeted against the end of the film rather than left over.** The pull-back
starts late enough that `MACHINE.closingHold` frames of motionless canonical overview follow it, and
never before the narration ends. Silence written beyond that holds the *last occurrence's* shot,
which is a picture of something, rather than extending an overview that stops being one after about
three seconds.

## Consequences

- Measured after, on the same instrument: elevator 42–52 frames of stable hold on every silent
  arrival (1400–1733ms), leases 20–52. The post-roll went from 9000ms — of which 4333 was the camera
  still travelling — to a budgeted 3000ms settle, and `post_say` in both examples came back from
  9000ms to 4000ms because it is no longer buying a framing decision in silence.
- **The two wants genuinely conflict and no rule can have both.** A silent occurrence runs about
  sixty frames and a camera move needs about thirty-six of them, so on an occurrence between two
  neighbourhoods the arrival's stillness and the camera's repositioning are competing for the same
  frames. An explicit price for intruding on an arrival was written, measured and **removed**: it
  cannot discriminate, because a move only happens when the held shot no longer *contains* the next
  occurrence, and every alternative — including retreating to the overview — is equally a move and
  pays the same intrusion. `MACHINE.movePrice` already refuses a move that is merely an improvement;
  what is left is a move that is compulsory, and charging a compulsory move changes nothing. Two of
  the leased runner's six silent arrivals keep 667ms rather than 1400ms for that reason, and it is
  recorded rather than papered over.
- The 1.25–1.75s the round proposed as a hypothesis survived contact: 1400ms sits inside it and the
  rendered frames were checked against the frames rather than against the hypothesis.
- Scoped to `circuit`. Nothing about `beat.ts`'s four rules changed, and the protocol still gets
  `dwellMs`.
