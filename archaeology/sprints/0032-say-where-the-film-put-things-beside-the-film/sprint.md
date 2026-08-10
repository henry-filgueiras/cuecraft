---
id: spr_01KZMJ9XPH1NF6T6JRPXBD0HBF
sequence: 32
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Say where the film put things, beside the film

## Goal

Emit a small, deliberately projected symbol table beside every rendered MP4, so that a downstream
tool can find every slide and every semantic landmark in the film without sampling pixels.

    presentation.yaml  ->  out/demo.mp4
                           out/demo.symbols.json

The round is finished when an agent handed only `out/demo.symbols.json` can name the exact frame
interval of every slide in `out/demo.mp4`, and extract one representative frame from each — the
short final slide included — without opening the YAML and without guessing a sampling rate.

## Rationale

This adopts idea:26 tier 3, whose parking gate was explicit:

> Adopt tier 3 when something outside cuecraft actually wants to read an address. Not before: the
> value is entirely in there being a consumer, and there is not one yet.

There is one now, and it arrived as a failure rather than as a request. An agent inspecting a
cuecraft render sampled the MP4 at a fixed interval, covered the first N-1 slides, and missed the
last one because it was short. Nothing about that was unlucky: uniform sampling cannot see a slide
shorter than its period, and the film carries no way to tell it otherwise. Meanwhile `buildTimeline`
knew the exact frame that slide began on, and threw the number away at `renderMedia`.

`timeline.ts:488` has been waiting for this since sprint:4 — *"a later caption, seek or debugger
would read it in the other direction without this having to be rebuilt. Nothing today reads it
backwards; the point is that it could."*

Two constraints from idea:26 carry into this round unchanged, and they are the ones most likely to
be violated by accident:

- **This is a second output target, which crosses decision:2's v0 line.** It wants a decision
  before the first line of code, and that decision is the first task.
- **Tier 3 must be a deliberate projection, narrower than `Timeline`.** If it ends up being
  `JSON.stringify(timeline)` it has adopted idea:3 without the decision, and every external
  consumer pins the shape of every internal refactor.

decision:9 and decision:63 settle the coordinate system before it can be argued about. Frames are
the truth, `framesFor` is the only conversion, and `buildTimeline` is the one place relative seconds
become absolute frames — so the exported coordinate is an integer frame, and any second is derived,
rounded for legibility, and never authoritative.

## Success criteria

- A `.symbols.json` sidecar is written beside every rendered MP4, by a projection function that is
  a sibling of `freezeFacts` rather than a serializer of `Timeline`.
- Every rendered slide produces exactly one `slide` symbol with a stable key derived from an
  authored identity, an exact half-open frame interval, and a deterministic representative frame
  that is inside the slide and documented as to what it means.
- Slide symbols tile the film: contiguous, non-overlapping, starting at 0, ending at the media's
  own frame count.
- Additional symbol kinds are exported only where an authored identity already survives compilation
  intact. Every kind considered and refused is written down with the reason.
- A rigid fixture with hand-computable frame arithmetic asserts the interval, ordering,
  contiguity, containment, key-stability and determinism properties exactly, in the ordinary
  (no-TTS, no-browser) suite.
- At least one consumer exists that reads only the sidecar, and it is reachable from the CLI.
- The render summary names the sidecar, so nobody has to know about it from tribal knowledge.
- An end-to-end render of the rigid fixture extracts one frame per slide by semantic key, and the
  short final slide is among them.

## Non-goals

- **No MP4 metadata embedding.** The sidecar is the primary representation for this round; chapter
  atoms and WebVTT are idea:26's tier 2 and stay parked.
- **No new compiler capability.** This projects what compilation already derived. If a symbol
  cannot be given an unambiguous frame, that is a finding to record, not a reason to widen the
  compiler.
- **No presentation IR.** idea:3 stays parked. The export is narrower than `Timeline` on purpose,
  and nothing internal is reshaped to make exporting easier.
- **No second coordinate system.** No authored frames, no seconds-as-truth, no second rounding rule.
  `framesFor` is untouched.
- **No video analysis.** Frame extraction, if it happens, is deterministic lookup plus one ffmpeg
  invocation. Nothing decodes a frame to decide anything.
- **No symbol for everything the timeline holds.** Camera plans, layouts, lane allocations, subtitle
  cues, playback holds and scene fades are internal unless a downstream consumer can state a query
  they answer.

## Outcome

Every success criterion is met, and the round ended where it aimed. decision:66 carries the
contract, dragon:39 carries the one thing that could not be exported, and the sidecar is written by
`render` on every deck.

**What shipped.** `compile/symbols.ts` projects a finished compilation into a versioned,
self-identifying document beside the MP4 — `format`, `version`, a stated coordinate convention, the
media's own frame count, and one symbol per authored semantic address. Seven kinds: `slide`,
`scope`, `recall`, `utterance`, `anchor`, `span`, `beat`. Three consumers on the CLI — `inspect`,
`snapshot`, `snapshots` — which read the sidecar and open neither the YAML nor the synthesizer.
`compute/frame.ts` turns a declared frame into a PNG with one ffmpeg call and no decoding decisions.

**The non-goals held.** `framesFor` is untouched, no second clock exists, nothing authored can name
a symbol, no MP4 metadata was written, and idea:3 is still parked — the projection is written out by
hand precisely so that it can be.

**Two findings, and both were found by looking rather than by reasoning.**

The first is dragon:39. Applying decision:66's own test — *does an identity the author wrote survive
into the frames?* — to every compiled record turned up exactly one failure, and it is the newest
feature in the compiler. `footage.ts`'s `queue()` groups cues under the moment they name, uses the
name to look up a second, and emits a slice carrying a path and a duration. So the timeline knows
the exact frame at which a film freezes and does not know what it froze at, and `playback` is the
one kind that had to be refused. The round could have invented an answer; it recorded the question
instead, because the interesting part is what a rendezvous name should *mean* once carried, and
that is not a symbol-table question.

The second is a bug this work would have shipped. Frame extraction seeks half a frame off the
boundary, for dragon:38's reason — and the obvious direction is wrong. `-ss` yields the first frame
at or **after** the timestamp, so aiming at the middle of frame N's own interval discards N and
returns N+1, and the last frame of a film returns no image at all because nothing follows it. Every
snapshot would have been one frame late, silently. It was caught by decoding a film to a numbered
PNG sequence and comparing, which is now `compute/frame.live-test.ts`.

**The snapshot rule was also decided by looking at frames, and changed once.** The first rule was
the *onset* of the slide's last sentence, which is where decision:13 puts an anchor and reads like
the right moment. Extracting real frames refuted it: a `series` slide fills its population **across**
the sentence (decision:33), so the onset is the instant before any of it exists — the snapshot of a
slide about counting sixty-four things showed a gauge reading zero. The end of the sentence has
everything established and still has the sentence and its speaker in the subtitle band; one frame
later completes the fill and empties the band. Both were extracted and compared, and the trade-off
is written into decision:66 rather than left as an accident.

**Evidence.** The rigid fixture in `compile/symbols.test.ts` states every duration and asserts the
frames by hand — intervals, contiguity, tiling, ordering, key uniqueness, byte-identical
determinism, key stability across a re-compilation that moves every frame, and one assertion that
walks a fixed-interval sampler across the fixture and watches it miss the short final slide.
`pipeline.render-test.ts` renders a three-slide deck whose last slide runs under three seconds and
extracts one frame per slide by key, asserting the count, the short slide's presence, and that no
two frames are the same picture. `compute/frame.live-test.ts` sweeps every frame of a sixty-frame
film against ground truth.

Real decks were rendered and their snapshots looked at, which is how the two frame-level findings
above happened. 976 tests pass; `scarp doctor` is clean.
