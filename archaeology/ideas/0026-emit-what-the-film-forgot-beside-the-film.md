---
id: ide_01KZMA1RAAFAJR0J96BTKB8FAX
sequence: 26
kind: idea
status: parked
created: 2026-08-09
---

# Emit what the film forgot, beside the film

## Problem

The MP4 is the only thing a render emits, and it is the one artifact that has forgotten everything.

By the time `renderMedia` returns, cuecraft knows — exactly, and from the compilation rather than
from analysis — that at frame 1247 the narration reached the entity the author named `check`, three
modules deep, inside a replay of slide 2. None of that survives into the file. A post-hoc tool can
recover scene cuts by differencing pixels and speech by transcribing audio; it cannot recover an
*address*, because the address was never in the picture.

`./0014-*.md`'s record in `compile/timeline.ts` has been waiting for this since sprint:4:

> a later caption, seek or debugger would read it in the other direction without this having to be
> rebuilt (decision:14). **Nothing today reads it backwards; the point is that it could.**

Nothing has read it backwards yet.

## Sketch

A sidecar emitted beside the MP4: absolute timings joined to semantic addresses.

It sits at exactly `facts.ts`'s freeze boundary — after the timeline is final, before anything is
projected — which makes it `freezeFacts`'s sibling rather than a new subsystem. Facts are the
compilation's derived data *shown inside the film*; this is the same data *emitted beside it*,
under the same guarantee that nothing downstream can write to it.

**It publishes the vocabulary that already exists rather than inventing a tag taxonomy.** `Scene`,
`Clip`, `Anchor` (a moment), `Span` (a range), `Beat` (an occurrence), `Call` (a scope entered or
left), `Recall` (a replay, with the mapping back to its source), `SubtitleCue`. Each of those means
something the others do not, and emitting `{ type: "slide_transition", t: 12.4 }` would be a second
name for something that already has one.

Two details that are not details:

- **Frames are the truth and seconds are a convenience.** decision:9 puts one rounding rule in one
  place; a sidecar that published only seconds would have consumers re-deriving frames and drifting,
  which is the exact failure `framesFor` exists to prevent. Publish `frame` and `fps`, with any
  `seconds` explicitly marked derived.
- **The join key is the address, not an index.** `root/payment/check` survives an edit to slide 1;
  `elementIndex: 3` does not.

## Boundaries

Three tiers, and only the first is obviously worth it:

1. **Golden manifests for the showpiece decks, internal and unversioned, as a test fixture.** The
   first consumer is cuecraft's own suite, and it is free and certain: today the only way to check
   that a change did not move timing is to render and compare pixels. sprint:29 did that at length
   and still shipped a deck with a slide running off the bottom of the frame, caught by a human
   watching. A semantic timing assertion needs no browser.
2. **WebVTT and MP4 chapter atoms**, derived from `subtitles` and `scenes`. Both are standards, both
   are already consumed by tools nobody has to write, and neither needs a new vocabulary or a new
   public surface. If free chapter markers go unused, a bespoke JSON was never going to be used.
3. **The semantic sidecar**, versioned and opt-in — `explain --sheet` is the precedent for an
   optional sidecar and decision:56 is the idiom for describing an output. It has to earn its place
   on what the first two cannot express: anchors, scopes, beats and recalls.

Embedding in MP4 metadata is explicitly *not* the first move. A sidecar can be diffed, grepped and
read; an atom needs `ffprobe`. Chapters are the exception, because they are a standard container
feature rather than a private encoding.

**The tension to hold, and the reason this is parked rather than started:** a rich published
manifest is "a resolved, fully-timed scene list", which is what idea:3 describes. The distinction is
that idea:3 is an *internal* seam to restructure the compiler around, and this is an *external
publication* of what the compiler already produces. If tier 3 ends up being `JSON.stringify(timeline)`
it has adopted idea:3 without the decision, and every external consumer pins the shape of every
internal refactor. Tier 3 must be a deliberate projection, narrower than `Timeline`.

It is also a second **output target**, which crosses decision:2's v0 boundary — so it wants a
decision before the first line, and it is plausibly the round that either adopts idea:3 or refuses
it on the record.

## Evidence

Adopt tier 1 the next time a timing or layout change has to be verified and the only available
instrument is a rendered frame. That has now happened twice (sprint:29, and the `<code>` defect it
uncovered, which had been invisible for twenty-eight sprints).

Adopt tier 3 when something outside cuecraft actually wants to read an address — a deep link into a
film, a semantic diff of two renders, a navigable or described version of a deck. Not before: the
value is entirely in there being a consumer, and there is not one yet.
