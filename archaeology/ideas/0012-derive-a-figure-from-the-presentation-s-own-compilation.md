---
id: ide_01KZCBH8SYEHS33HPNSQXNZXBT
sequence: 12
kind: idea
status: parked
created: 2026-08-06
---

# Derive a figure from the presentation's own compilation

## Problem

idea:5 sketched a `figure` role — a slide that is one number. The self-demo rejected it, and the
recorded reason was that there was no honest number to show and a fabricated one would have been
worse than none.

That reason was right about invented numbers and wrong about there being none. cuecraft knows
several true things about the deck it is compiling — how long it runs, how many slides it has,
how many lines its source is — and not one of them can reach a frame. Every number in the video
is prose a human typed, including the claim that the source is "small enough to read in a
minute", which is an estimate rather than a measurement.

## Sketch

A figure whose value the compiler measures:

```yaml
figure:
  of: duration
  caption: "of narrated video, from ninety lines of source"
```

`of` takes one of a **closed set** of facts about this presentation: `duration`, `slides`,
`words`, `source-lines`. Not an expression. Not a path. Not a name looked up in a scope.

The author states what they want to show; the compiler measures it; the renderer sets it at
display scale. That is the same trade as everything else in the format, applied to the
presentation's own shape.

## Boundaries

The moment `of:` accepts an expression, or a figure can be interpolated into a title or a
sentence, this is a template language and should be rejected outright. A closed enum or nothing.

**A figure can never be spoken.** dragon:1's ordering is strict: narration is synthesized before
timing exists, so `duration` is unknowable at the moment the words are made. The number is
visual only, and narration has to be written around it — "this is how long it took" rather than
"this took eighty-four seconds". That constraint is not a wart; it is the compilation order
showing through, and it should be documented rather than engineered around.

## Evidence

Adopt when a deck wants to state something true about itself. The self-demo wants it once and
currently lies slightly instead.

The recursion it unlocks is the deepest available here and costs almost nothing: a slide that
says how long the video you are watching is, and is right, because nobody typed it.
