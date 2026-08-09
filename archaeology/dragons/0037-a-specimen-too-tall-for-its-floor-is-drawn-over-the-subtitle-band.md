---
id: drg_01KZMF4H2CT9PTKVSJXA072F3P
sequence: 37
kind: dragon
status: open
created: 2026-08-09
---

# A specimen too tall for its floor is drawn over the subtitle band

## Context

sprint:31's k-means deck quotes its own YAML on slide 3, exactly as `examples/pivot/pivot.yaml`
does. The first cut quoted a sixteen-line slide, and the last two lines of the specimen were drawn
**through the subtitle band and over the subtitle's first line**.

The cause is one clamp with no companion:

    src/render/theme.ts   fitSpecimen(...)
      return Math.max(CODE.minSize, Math.min(CODE.maxSize, Math.floor(Math.min(byWidth, byHeight))))

`byHeight` correctly reports the size at which the block would fit the box it was given, including
the room the band took (`bodyBox(title, type, band)`). `Math.max(CODE.minSize, ...)` then throws
that answer away when it comes out below 26 — and nothing afterwards notices that the block no
longer fits. The floor is right; what is missing is what happens **when the floor is not enough**.

Measured on the deck that found it, at `CODE.minSize = 26` and `CODE.lineHeight = 1.52`:

| band | body box height | lines that fit | lines asked for |
| --- | --- | --- | --- |
| 0 (no subtitles) | 644px | 16 | 16 |
| ~200 (two-line subtitles) | 552px | 13 | 16 |

So the same specimen is exactly at the limit with subtitles off and three lines over with them on,
which is why nothing before this round hit it: `pivot.yaml`'s equivalent slide quotes four lines.

## Question

**What should a composition do when the size that would fit is below the size that is legible?**

This is dragon:26's failure mode in a second composition, arrived at by a different route, and the
pair is now enough to name the shape:

- **dragon:26 (Matrix)** never asked how much room the band took. A composition that did not know.
- **this (Specimen)** asks, is told, computes the right answer, and then **discards it at a floor**.
  A composition that knew and could not act.

Both end with content drawn over the one part of the frame a viewer is guaranteed to be reading.
decision:42 says a composition is laid out inside the box it was given; a floor without an elision
is a way of not doing that which passes every test that checks the size.

It is distinct from dragon:7, which is about specimens being *small* — 28px and 30px, legible but
mean. This one is about a specimen that is not small enough and spills. dragon:7's cure (find a
lever: wrap, columns) would help here too, and would not close it, because a block can always be
one line taller than any lever leaves room for.

## Constraints

Not the deck's fault, although the deck provoked it. "Quote fewer lines" is a real answer for an
author and is what sprint:31 did to ship a clean artifact — but an author has no way to know the
limit, because it depends on the *subtitle band*, which depends on the longest sentence anywhere in
the deck (dragon:23). So a deck can start overflowing because somebody lengthened a sentence on
another slide.

## Candidate direction

The archetypes that solve this already exist in the codebase and disagree about how, which is the
interesting part. `series` refuses past a ceiling. `register` **elides** and says what it elided —
"rows 11–16 of 24" — and decision:60 chose that deliberately, because a table that silently shows
six of twenty-four asserts there are six. A specimen has the same problem and the same available
answer: idea:14 is exactly this, parked, and it now has a second reason to exist that is about the
frame rather than about the reader.

The cheap interim is a refusal: a specimen that does not fit at `minSize` fails the build with the
line count, the box, and the two ways out. That is worse for authors and better than a film that
renders perfectly and covers its own caption.

## Resolution criteria

A deck whose specimen cannot fit at `CODE.minSize` either elides visibly, or fails to compile. In
neither case does a rendered frame draw source over the subtitle band, and `examples/kmeans/`'s
slide 3 restored to its untrimmed sixteen lines is the fixture that proves it.
