---
id: ide_01KZCBG9ZSK0QQ92E90BC0AHG2
sequence: 11
kind: idea
status: parked
created: 2026-08-06
---

# Let a specimen show a change, and let the diff be the anchor

## Problem

The self-demo makes five claims and demonstrates four of them. The one it only asserts is the
most important: *change a sentence, and everything downstream follows it.* Scene 4 says it in
prose over a static frame, which is exactly the register the rest of the video avoids.

It is unshowable today because a specimen has one state. There is no way to say that this source
became that source, so there is no way to show the consequence of an edit — which is the entire
argument for deriving timing rather than authoring it.

## Sketch

Let a specimen have a before and an after:

```yaml
code:
  language: yaml
  source: |
    - "Agents do a lot of invisible work."
  becomes: |
    - "They do a surprising amount you never get to see."
```

The renderer diffs the two with an established library and composes the change: the old lines
recede, the new ones land, and the frame holds the after.

The interesting part is what this does to anchors. **A diff is a mark generator.** The changed
region is derivable, so narration can reach it without the author naming a line at all:

```yaml
say:
  - speech: "Reword one sentence,"
    activates: changed
  - "and every duration after it is measured again."
```

That is the same trade the format already makes with timing — state the relationship, derive the
mechanics — applied one level up.

## Boundaries

Two states, not a history. No `git` integration, no three-way anything, no merge view. Line
granularity is enough; word-level diffing inside a line is a separate and much larger problem,
and probably never worth it at presentation scale.

The real risk is that this is the closest thing cuecraft has proposed to an animation, and it
must not become the wedge for an animation DSL. The guard: one transition, derived entirely from
the difference between two authored strings, with no timing, easing or ordering in the source —
the same guard `decision:17` puts on the anchor envelope.

## Evidence

Adopt when a deck needs to show the consequence of an edit rather than describe it. The
self-demo needs it once, at its highest-value moment, and would be materially more convincing
with it.
