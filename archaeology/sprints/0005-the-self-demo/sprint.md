---
id: spr_01KZC8JTE9C5CST3JCV1DNSQ3J
sequence: 5
kind: sprint
status: closed
created: 2026-08-06
closed: 2026-08-06
---

# The self-demo

## Goal

Use cuecraft to make a ~60–90 second video that explains cuecraft, and let that one concrete
artifact decide what vocabulary gets added.

The video is the deliverable. The vocabulary is the finding.

Four pieces of work, in dependency order:

1. **Make the existing anchor treatment perceptually legible.** decision:14 shipped one
   treatment — contrast plus the accent ordinal, over ten frames. It works and it is easy to
   miss while listening. Give activation a three-state shape (future → hot → established)
   without exposing any of it in the source.
2. **Storyboard first, schema second.** Decide what the video says and what evidence says it,
   then look at what the format cannot express.
3. **Add only the roles the storyboard demands.** Candidates are many; the artifact picks.
4. **Write `examples/cuecraft.yaml`, render it, watch it, and revise the artifact rather than
   the machinery** wherever revising prose is cheaper than adding capability.

## Rationale

Every previous round optimized one mechanism against a four-slide specimen chosen to exercise
it. The specimen was a test fixture wearing a deck's clothes. Nothing in it had to hold an
argument together for a minute, and so nothing in it exerted pressure on the format that came
from *meaning* rather than from mechanism.

A real minute-long artifact exerts different pressure. It needs a beginning, a development and
a close; it needs scenes that do not all look like the same template; it needs to show its own
source, which title-and-bullets cannot represent at all. The gaps it reveals are the ones worth
filling, and the gaps it does not reveal are evidence that idea:5's speculative role list is
speculative.

Self-reference is the right subject for a second reason beyond convenience. The strongest claim
cuecraft makes is that presentational intent and rendering mechanics can be separated. A video
that shows its own source while narrating the separation *is* the argument, and a viewer can
check it — the file on screen is a file in the repository.

The perceptual bar moves this round. "It renders" is satisfied. The bar is now: show it to a
technically curious stranger without apologizing first.

## Success criteria

- `examples/cuecraft.yaml` is a genuine, readable presentation source that a stranger can read
  and understand the intent of, with no rendering implementation details in it.
- `out/cuecraft.mp4` renders, plays, runs roughly 60–90s, 1920x1080 at 30fps, h264/aac.
- Anchor activation is noticeable to someone listening naturally, and stays restrained enough
  to use on several slides in one deck.
- Every new semantic role names what the content *means*. No role, key or value in the source
  describes a size, a position, a column count, a duration in frames, or an animation.
- No scene reads as a dashboard, a card grid, or the previous scene with different words.
- The deck holds together as one visual argument rather than as unrelated slides.
- Deterministic logic added this round — role parsing, composition selection, anchor state —
  is unit-tested without a browser or a model.
- `npm run check`, live TTS tests, render integration and `scarp doctor` are all clean.

## Non-goals

Browser or Playwright scenes, screenshots, image generation, remote inference, captions,
background music, `freeze`, the content-addressed cache, parallel synthesis, forced alignment,
word-level timing, a theme system, a transition or animation DSL, shared-element transition
infrastructure, arbitrary coordinates, a GUI, and the generalized IR of idea:3.

Roles from idea:5 that this artifact does not actually need are not built. A role that would
have made one scene cooler is not evidence.
