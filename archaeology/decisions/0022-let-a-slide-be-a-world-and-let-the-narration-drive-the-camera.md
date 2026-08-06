---
id: dec_01KZCMYG4WX63GKDGPCHJSHD68
sequence: 22
kind: decision
status: accepted
created: 2026-08-06
---

# Let a slide be a world, and let the narration drive the camera

## Context

Every composition cuecraft had fitted a slide into 1920x1080 and stopped there. dragon:6 asked
whether a *camera* was needed and answered no — the specimen looked small because the selection
was broad, and decision:20 fixed the selection instead. That answer was right, and it is not
being revisited. It was an answer about **illegibility**: something that fitted the frame badly
and could be made to fit it well.

This is a different question. A transformation with eleven concepts and thirteen relations
between them does not fit a frame at presentation scale, and no amount of better selection makes
it fit — laid out at a size a viewer can read, it is about two and a half viewports wide and one
and a half tall. The choice is not "frame it or fix it". It is "show a fifth of it at a time and
move, or show all of it at a size nobody can read".

So framing here is not compensation for a representation problem. It is the only representation
of a world larger than the window, and it is being tested on the one artifact that earns it.

## Decision

**A slide may be a world. cuecraft lays it out, and the narration drives the camera.**

    world { entities, relations }
      |  dagre                    ->  a position for every entity, a route for every relation
      |  graph shape              ->  each entity's colour, and which one is the product
      |  measured narration       ->  when each entity ignites  (decision:13, decision:14)
      |  hot entity + established
      |    neighbours             ->  the bounds this moment wants on screen
      |  d3 interpolateZoom       ->  the path between two shots, and how long it takes
      v
    atlas

The authored vocabulary is **two words**, and stopping at two was the design problem:

```yaml
world:
  entities:
    source: The source you write
    cues: Narration cues
  relations:
    - source -> cues
```

Entities are a *mapping* because in a world an identity is not optional — a bullet may carry an
`id`; an entity *is* one. Relations are arrow literals for the reason durations are `700ms`:
small, written many times, and already notated in a way everybody reads correctly.

**Nothing geometric is expressible, and no key could become geometric later.** There is no
position, size, colour, rank, group, direction, order, path, zoom, or duration for anything to
move over. The word `camera` does not appear in the format and cannot be made to.

**Layout and pathing are delegated, and the two libraries are the whole of the new dependency
budget** (decision:5). `@dagrejs/dagre` does layered graph layout — rank assignment, crossing
reduction, coordinate assignment, edge routing — deterministically, offline, in about 200KB of
pure JavaScript. `d3-interpolate`'s `interpolateZoom` is Van Wijk and Nuij's smooth-and-efficient
zooming, the published answer to moving a viewport between two rectangles without inducing motion
sickness. elkjs was the other candidate and is eight megabytes; graphviz needs a binary. Neither
library is asked to do anything cuecraft could plausibly own.

**The camera rule is one sentence.** Frame the entity the narration just reached, plus as much of
the context it connects to as fits without losing it — established neighbours taken nearest-first
until the shot would exceed a maximum width. Only *established* neighbours count; a relation to
something not yet reached is not context, it is a spoiler.

**The pacing is derived too.** `interpolateZoom` reports the duration its own path wants at
constant perceived velocity; divided by a constant that becomes frames, clamped by the gap to the
next cue. A hop between neighbours comes out brisk and a traversal across the world unhurried,
and nobody chose either.

**The final reveal is derived from the absence of narration.** A closing cue that reaches no
entity, arriving after every cue that reaches one, is a remark about the world rather than about
anything in it — so that is where the camera stops looking at concepts and pulls back to the
whole machine. The author asks for it by writing a closing sentence and a `post_say` long enough
to hold it. Both of those are things they were already writing.

**The world is laid out exactly once.** Every frame of the scene reads the same coordinates.
That is not an optimisation; it is the entire perceptual claim. Re-running layout per cue would
produce the same pictures and none of the meaning, because what makes this a place rather than a
slideshow is that the thing off the left edge is still there when you come back to it.

## Consequences

- `SlideBody` gains a fifth case and `bodyElements` a fifth branch. Nothing in timing, anchoring,
  or validation changed: an anchor resolves to an index into the entity list exactly as it
  resolves into a bullet list. The seam idea:5 asked to be preserved has now held four times.
- `atlas` is the eighth archetype and the first with a camera. It is also the first to ask
  `Frame` for full bleed: a composition showing something larger than the frame has no margins to
  respect, and the progress rule is chrome over a window.
- `ANCHOR_ID` moved to its own module. A world's entities are keyed by identity, so the rule had
  to be reachable from below the parser without importing it.
- The atlas runs a longer activation envelope than the rest of the deck (`WORLD_TIMING`). It is
  the only composition that activates something the camera has not arrived at yet, and the deck's
  eight-tenths of a second burns out before the shot lands. Same shape, different duration.
- Two new runtime dependencies, both small, both pure, both offline. That is a real cost and it
  is the one this decision is least certain about.
- Whether this is a durable cuecraft capability or a specimen with good machinery behind it is
  genuinely open, and is dragon:8 rather than an assertion here.
