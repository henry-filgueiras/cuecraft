---
id: drg_01KZCN0WYCW29EX4K12EA0S04B
sequence: 8
kind: dragon
status: open
created: 2026-08-06
---

# Is a semantic world a cuecraft body, or one very good specimen?

## Context

decision:22 shipped on the strength of one artifact. That artifact is good — `examples/cathedral.yaml`
is 74 lines including its comments, of which 26 are the world and 24 are narration, and it produces
fifty-eight seconds of camera work through a space two and a half viewports wide. The expressive
multiplier is the highest anything in this repository has produced.

But every archetype in cuecraft was added because a real slide looked wrong without it
(decision:10, decision:15), and `atlas` is the first one added because a *specimen* wanted to
exist. The order is reversed, and that is worth being nervous about rather than pleased with.

Three specific reasons for doubt, in descending order of how much they would cost to be wrong
about:

1. **Two dependencies bought for one composition.** dagre and d3-interpolate are small, pure and
   offline, and they are still the largest addition to the toolchain since Remotion. If `atlas`
   turns out to be the only body that ever wants them, they were bought for one slide.
2. **The world had to be shaped for the frame.** The first honest graph of the cuecraft pipeline
   laid out at 9:1, which fits a 16:9 reveal at a scale where the labels are ten pixels. Getting
   to 2.5:1 meant merging two concepts into one entity and tuning `nodesep` to nearly four times
   `ranksep`. Nothing about that is authored, but it *is* the world being chosen partly for how it
   photographs, and a general capability would have to survive worlds that were not.
3. **Nobody has written a second one.** The camera rule, the reveal rule and the pacing constant
   are all one-artifact calibrations, exactly as decision:10's thresholds were, and decision:10's
   thresholds turned out to be wrong for content shapes it had not seen.

## Question

Is a semantic world a durable cuecraft body, or an excellent demonstration that happens to have
real machinery under it?

## Constraints

The cheap test — write a second world — is not as cheap as it sounds, because the honest second
world is *somebody else's* system, and the cathedral's credibility comes partly from being about
the thing that rendered it. A second world about cuecraft would mostly re-test the first.

The expensive test is the one that matters and cannot be run alone: whether an author who is not
the person who built it can describe a world they have in their head and get something they
recognise back, without reaching for a coordinate.

## Candidate direction

Wait. Do not extend the vocabulary, do not add a second archetype for worlds, and do not
generalise the camera. The next world that a real presentation needs is the evidence; if none
appears, that is evidence too.

If a second world does appear, watch specifically for whether its author tries to fix the layout
rather than the world — the pressure named in idea:16 is where the format would start becoming a
graph language.

## Resolution criteria

Close as **fundamental** if a second, unrelated world is authored and needs no new key; as
**bespoke** if the second one immediately wants grouping, ranks or a hint about where things go;
as **narrow** if no second world is ever wanted, in which case `atlas` is a good specimen
composition and should be described as one rather than quietly presented as a general capability.
