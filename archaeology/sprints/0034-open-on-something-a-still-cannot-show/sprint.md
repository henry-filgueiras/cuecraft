---
id: spr_01KZMPN6YTF45B7CDBMHDJNBWT
sequence: 34
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Open on something a still cannot show

## Goal

Write the presentation that occupies showpiece slot 1, and make it the strongest single argument
this repository can make in under three minutes.

The round produces one new deck and the README section that carries it. The deck is authored
work, not a feature: nothing in `src/` should need to change for it to compile, and if something
does, that is a finding about a gap rather than permission to widen the format.

Concretely: an explanation of the phantom traffic jam — the stop-and-go wave that appears on a
uniform ring of cars with no crash, no lane change and no cause — built from the Sugiyama et al.
(2008) circular-track experiment. Twenty-two cars, a 230-metre ring, one instruction: hold thirty
kilometres an hour. Within minutes a car stops dead, and the stop travels backwards around the
ring for as long as anyone cares to watch.

## Rationale

Two things are true about the README as it stands, and they point at the same fix.

**The temporal exhibit is invisible.** `examples/kmeans/` — sprint:31, decision:64, decision:65 —
appears **zero times** in README.md. The newest capability in the project, and the only one whose
evidence moves, cannot be found by a reader. That is the actual documented gap.

**Slot 1 opens on a placeholder.** `<!-- VIDEO: tap -->` has no attachment, so the first thing a
reader meets is a comment saying the video is not there yet. The showpiece order is described as
"the order that makes the argument", and the argument currently opens on nothing.

Promoting `examples/kmeans/` into slot 1 would fix the first and not the second. It was written to
prove a mechanism and it proves it well, but its subject is a clustering algorithm and its register
is "yes, we can call into R for classic statistics." That is a competent example. It is not a
reason to read the rest of the page.

What slot 1 has to do is different from what every other slot does. Slots 2 through 8 argue; slot 1
has to make somebody want to hear the argument. The audience is people who lose afternoons to
Keynote, and the specific wound to reach for is the one nothing else here reaches: **the screen
recording that has to be re-cut every time the voiceover changes.** A sentence that stops a film,
and a sentence that rewinds twenty seconds of it, with no number anywhere in the source — that is
the closest thing this project has to a trick, and no reader can currently find out it exists.

The subject is chosen against the same test idea:27 set and sprint:31 met: the evidence must be a
computation over a time-like dimension, where a still throws away the content. A photograph of a
traffic jam is a picture of stationary cars. The entire phenomenon is that the cars move forwards
and the jam moves backwards, and it cannot be said any other way. It is also, unlike k-means,
something every viewer has personally sat inside, and unlike a fictional incident review it is a
real published experiment with real numbers — which keeps this deck honest in the way
`examples/sha256/` is honest.

The secondary reason for wonder over utility: a flagship people find delightful is a flagship
people want to contribute to. A quarterly-review deck argues that cuecraft could replace an
afternoon of work. A backwards-travelling wave argues that it makes something possible. The second
is the better first impression, and slots 6 and 7 already carry the first.

## Success criteria

- A new deck exists at `examples/phantom/`, renders end to end from a clean checkout with
  `npm run bootstrap:r`, and contains no size, position, colour, duration, coordinate, timecode or
  frame number — verified by reading the file, not asserted.
- Its centrepiece is a **temporal exhibit**: an R program simulates the ring, draws every frame,
  encodes an MP4, and names the states the run reaches. The narration starts it, stops it at a
  named state, replays an earlier interval slower, and lets it finish. `decision:64` and
  `decision:65` are exercised as authored, with no new vocabulary.
- The deck exercises a genuine cross-section — at minimum: an ordinary content slide, a
  `protocol:` whose messages travel backwards through the cast, the temporal exhibit, a `code:`
  specimen quoting this same deck, and an SVG exhibit whose elements the narration addresses by
  name. Every one of them earns its place by being the right way to say the next thing; a slide
  that is there to demonstrate a feature is cut.
- The simulation is a real car-following model over the published parameters, not a scripted
  animation. The wave's backwards speed is **measured from the run** and matches the literature's
  ~20 km/h; if it does not, the model is wrong and gets fixed rather than narrated around.
- The rendered film is inspected **through its symbol table** (`decision:66`), slide by slide and
  at every anchor — never by uniform sampling, which is the failure sprint:29 already paid for.
- README slot 1 is rewritten around the new deck, `tap.yaml` keeps its whole section one slot
  lower, the stale "Seven videos" count is corrected, and a `runme/` entry exists for the upload.
- `out/upload/` carries a compressed MP4 under 10 MB, produced by `npm run compress:upload`.
- `npm run check` and `scarp doctor` pass, and no PNG, MP4 or generated artifact is committed.

## Non-goals

- **No changes to the format.** This round authors a deck with the vocabulary that exists. If the
  deck wants a key, the answer is that the deck is wrong, and the want gets written down as a
  dragon rather than satisfied. decision:2's boundary is not negotiable inside a README round.
- **No new archetype, no new composition, no new output type.** Four exhibit output types is what
  there is.
- **No second temporal medium and no concurrency.** One film, one slide, one cursor. Everything
  sprint:31's non-goals refused is still refused.
- **No table exhibit in this deck.** That is showpiece 7's argument and slot 1 does not get to
  spend it. Likewise no descent — slots 2 and 3 own `child:`, and a flagship that does everything
  makes every other section redundant.
- **No second narrator, no jokes.** `examples/meridian-bickering.yaml` and
  `examples/off-the-record.yaml` are the comic register and they stay in the laboratory. The first
  video a stranger watches is played straight.
- **No demo reel.** Every mechanism present must be the natural way to say that sentence. The
  moment the deck reads as a feature tour it has failed at the only job slot 1 has.
- **No retirement of `examples/kmeans/`.** It is the mechanism's own test artifact and it stays
  exactly as it is; this deck does not replace it and must not quietly become its successor.

## Outcome

### What the round did

`examples/phantom/` exists and is showpiece 1: the Sugiyama (2008) ring experiment, simulated
during the render, played as a film the narration stops four times, replays an interval of, and
lets finish. `decision:68` records why that slot went to a temporal exhibit rather than to
`examples/kmeans/`, which was the obvious and cheaper move.

Against the success criteria:

- **The deck renders and holds the line.** No size, position, colour, coordinate, timecode or
  frame number anywhere in `phantom.yaml`, and no key that could become one. The only durations
  in it are `pre_say`, `post_say` and `pause:` — authored narration silence, which every deck in
  this repository has and which decision:10 has never counted as a projection instruction. That
  is the honest form of the claim; "no duration" as originally written was too strong.
- **The temporal exhibit is exercised as authored**, with no new vocabulary: `play:`, four
  `during:` rendezvous, one `replay:`. The replay was verified frame to frame — it runs the
  twelve seconds from the closed gap to the standstill more slowly and returns to the frame it
  was frozen on, which the film then carries on from.
- **The cross-section is six bodies and no tour.** Field of terms, protocol, temporal exhibit,
  specimen of this same file, addressed SVG, statement. The table exhibit and `child:` were kept
  out on purpose; they are showpieces 3 and 8's arguments.
- **The film was read through its symbol table**, slide by slide and at every anchor, never by
  sampling. Three defects were found that way and fixed: the freeze printed "1.0 km/h" under the
  sentence "a car is at a standstill"; R dropped alternate y-axis labels on the drawing and the
  two it dropped first were the two the last sentence is about; and cairo's sans has no U+2191,
  so an arrow glyph in the film was a replacement box.
- **README slot 1 is rewritten**, `tap.yaml` keeps its whole section one slot lower, every
  subsequent slot is renumbered, the stale "Seven videos" is corrected, and `examples/kmeans/` is
  findable at last — as a sibling inside slot 1, named as the artifact `sprint:31` built the
  machinery against. `runme/upload-phantom.md` exists; `runme/upload-order.md` was deleted,
  having asked to be deleted once its video was attached, which happened two sprints ago.
- **`out/upload/phantom.mp4` is 7.70 MB** at crf 23. `npm run check` and `scarp doctor` pass.

### Where it ended up somewhere else

**The wave is slower than the experiment it reproduces.** `task:174` said the measured backward
speed had to land in the literature's 15–20 km/h and that the model would be fixed if it did not.
It does not: it is 11.9. Four parameter axes were swept and the answer is 10.7–15.5 across every
set that produces a single jam, no collision and a plausible free speed; faster waves appear only
alongside three to nine simultaneous jams, which is a different phenomenon and makes the
measurement meaningless. The task was closed on the rest of its criteria and this one is now
`dragon:42`. The deck says the measured number and claims no agreement with the literature, so
nothing false is on screen — but the slide would like to be able to say "and that is what is
measured on real motorways" and cannot.

**Two models were rejected by measurement before IDM was reached.** Optimal-velocity is unstable
at this density and drives the cars nearly two metres through each other. Full-velocity-difference
does not collide and does not go unstable either — the term that stops the crashes is the term
that damps the instability. Undelayed IDM stays uniform at every setting swept. The reaction
delay is what makes the ring unstable, which turned out to be the honest statement of the
phenomenon rather than a modelling convenience, and it is now the deck's second slide.

**The control had to become analytic.** "Run the even ring and watch it hold" is the obvious
check and it is the wrong one: the uniform ring is a fixed point *and it is unstable*, so the
wrap's last-bit asymmetry is itself a perturbation and grows given long enough — measured at
about seven times later than the ten-centimetre nudge. `uniform_is_fixed()` checks the derivative
instead, exactly, and `nudge_dominance()` puts the number on the difference.

**The film is 3:36, and that is the round's weakest result.** It opened at 4:48. Two trimming
passes and a faster film cut 73 seconds, and it is still the longest video in the README by 47
seconds over `examples/sha256/`. A deck with six bodies and four rendezvous cannot be short, but
slot 1's job is to hook rather than to be complete, and a third pass would have to cut a slide
rather than words. That is a judgement the next round can make with the film in front of it.

**Two things the deck cannot defend are written down.** `dragon:41`: the quantities the narration
speaks — fifteen centimetres, twelve seconds, twelve kilometres an hour — are checked by nothing,
and the obvious test would be a second copy of the claim rather than a check of it. The partial
guard that was built is in `src/examples.test.ts`: the states the deck stops the film at are
checked against the program, the names it addresses are checked against the drawing, and nothing
generated may be committed beside the deck. All three run without R installed.
