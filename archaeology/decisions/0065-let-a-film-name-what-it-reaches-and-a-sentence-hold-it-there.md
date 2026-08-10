---
id: dec_01KZMGJESEHN3HJSBR3M43FQDB
sequence: 65
kind: decision
status: accepted
created: 2026-08-09
---

# Let a film name what it reaches, and a sentence hold it there

## Context

decision:64 gave cuecraft a film it can play whole. idea:27's other half is the relationship the
format was actually missing, and decision:63 stated it as a duality worth taking seriously:

    activates:   narration reaches a representation
    ???          a representation reaches a state, and hands the floor back

The second one is what a computation over a time-like dimension needs. The interesting thing about
k-means is not the answer; it is a state the run *reaches* — a centre crossing a sparse gap on the
third pass — and the sentence explaining it wants to be spoken while the medium is holding that
state, not before it and not after it. Drawing that pass as a still throws away the thing that made
it worth showing.

idea:27 also named two ways this could die, and both were tested rather than argued:

- **A first medium whose events want authored timecodes.** They did not. The film names its own
  states; the deck names them back; no number crosses.
- **A lowered form the camera planner cannot survive.** Not falsified, and not confirmed either —
  see the consequences.

## Decision

**A film may name the states it reaches. A sentence may name one back, and the film holds there
while it is spoken.**

    #cuecraft moment pass-3 4.066666          the program, in the film's own seconds

    - play: kmeans
    - speech: "Hold it there. One centre has crossed the sparse middle of the cloud."
      during: pass-3

`moment` is decision:56's third verb, and it is deliberately the smallest thing that could work: a
**stable identifier and a local timestamp**. No type, no payload, no duration, no nesting, no
category. decision:63 predicted that would be enough and it was; anything more would be an event
ontology for a problem with one shape.

**The times are local to the film and always will be.** A program cannot know where in a deck it
will be placed and is not told. The format has never contained an absolute timecode, and this is the
feature that would most plausibly have introduced one — so it is worth stating that it did not: the
only numbers anywhere are measured from the start of the film by the program that made it.

**Annotation is not subscription.** A film may name every pass it runs; only the states a sentence
names become places it stops. The k-means demonstration declares seven and holds at one. This is
decision:63's set intersection, and it is a `Map` lookup at compile time rather than anything at
runtime.

**Several sentences on one state are one rendezvous.** They are grouped under the state they name,
in the order the deck wrote them, so two sentences about `pass-3` stop the film once and are both
spoken over the held frame — rather than freezing, resuming for no frames, and freezing again.

**Where a `during:` may be written is positional, and that is the point.** It belongs in the run of
cues immediately after the `play:` whose film reaches that state; the first cue that is neither a
subscription nor a pause inside one ends the run. So the source reads top to bottom in the order
the viewer hears it, and **the lowering reorders nothing**. The alternative — a `during:` anywhere
in the list, moved into place by the compiler — would make the page a lie about the film, which is
the one thing this format has never done.

**Two disagreements are refused, both against the film rather than against the author's taste.** A
state the film does not reach, listing the ones it does; and two states held in an order the film
does not reach them in, because a deck reads in the order its film runs.

### The lowering, which is the whole architecture

    play: kmeans, film 8.13s, pass-3 at 4.07s, two sentences subscribed

      ->  slice[0.00 .. 4.07]   <both sentences>   slice[4.07 .. 8.13]

Three ordinary occupants of the one serial cursor, each with a duration known before the cursor
arrives. `compilePresentation` places them by borrowed duration exactly as it places a recall;
`buildTimeline` walks them on the same cursor as speech; `framesFor` is still the only conversion
in the codebase.

**The aside's own sentences are what extend the film.** They are speech cues and always were. The
medium did not ask for time and could not: it was cut at a point it was going to pass through
anyway, and the narration in the gap is what makes the gap.

**A slice's length comes from its endpoints, not from its length.** `to` of one slice is the `from`
of the next, the same number, so converting that one number once makes the two slices share a frame
boundary exactly. Converting each slice's *duration* independently does not, and the difference is a
single repeated frame of film at precisely the moment the narration is pointing at.

### The freeze is not implemented

This is the result worth keeping. **Nothing in the renderer changed to add the freeze**, and nothing
in it knows the word. `buildTimeline` already derived a *hold* between slices — an interval that
covers frames the slices left over, with the mapping's rate set to zero — and a hold is what an
aside is standing in. So:

    mediaFrame = sourceFrom + floor((frame - from) * rate)

with `rate = 1` is playback, `rate = 0` is a freeze, and there is no branch between them. decision:63
observed that `RecalledCanvas` was already a time remap and that a freeze is the same expression
with a slope of zero. That turned out to be exactly, literally true.

Proven rather than asserted: rendered as lossless stills, the last frame of the first slice, the
whole of the 13.7-second aside, and the first frame of the second slice are **byte-identical across
the freeze and the resume**, and the frames either side of them are not. That is sprint:15's proof
with a different noun.

## Consequences

- **`framesFor` is unchanged, one cursor is unchanged, and no scheduler exists.** The strongest
  claim decision:63 made survives contact with a real medium: cuecraft has one producer of
  presentation time, and rich temporal constructs compile into known-duration serial occupants
  before absolute frames are assigned.
- **One unrelated subsystem did need to learn the word, and it is worth naming.** `subtitle.ts` now
  treats a slice as a boundary, because a caption whose rule is "until the next audible thing"
  otherwise hangs over eight silent seconds of animation asserting that somebody is still speaking.
  That is one line and it is a correction rather than a special case — but the honest statement is
  "one subsystem, not none".
- **The camera was never exercised, so idea:27's second kill condition is untested.** A temporal
  exhibit selects the `exhibit` archetype, which has no camera: `cameraPlan` is built for a world, a
  transcript and a machine. Whether a plan built from anchors and calls survives having a segment
  inserted between two cues is still an open question, and the first deck that puts a rendezvous
  inside a *world* is what will answer it.
- **A moment on a frame boundary is a rounding hazard**, because the protocol carries decimal
  seconds and the cut takes the first frame at or after one. Recorded as a dragon; the k-means
  program rounds down and says why.
- **`during:` is the format's second relationship between narration and content and its first in the
  other direction.** `activates:` and `fills:` both start at the narration. This one starts at the
  medium, which is new, and the surface it needed was one key.
- **Still no runtime, still no negotiation, still no overlap.** A medium is annotated; it does not
  bargain. Everything decision:63 refused permanently is still refused.
