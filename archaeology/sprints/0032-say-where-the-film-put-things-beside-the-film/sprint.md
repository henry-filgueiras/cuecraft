---
id: spr_01KZMJ9XPH1NF6T6JRPXBD0HBF
sequence: 32
kind: sprint
status: active
created: 2026-08-09
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
