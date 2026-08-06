---
id: ide_01KZC3N0RAMXAAH3M6XEH0DRZ3
sequence: 5
kind: idea
status: adopted
created: 2026-08-06
adopted-by: "[[dec_01KZCABE8SGB5B5FH08QCG3590|Let a slide declare what its content is, and let the role choose the composition]]"
---

# Semantic content roles beyond title and bullets

## Problem

decision:10 chooses a composition from the *shape* of a slide's content — how many bullets, how
long they are. Shape is a weak proxy for meaning. A quote, a statistic, a definition and a
comparison can all arrive as "a title and three short bullets" and all get the same field of
terms, when each has an obvious and different composition.

## Sketch

Let a slide carry named content roles alongside its bullets, and let each role imply compositions
the current four cannot express:

```yaml
- slide:
    quote: "We have no idea what it did."
    attribution: "every engineer, eventually"
```

```yaml
- slide:
    title: "Sessions recorded"
    figure: "1,284"
    caption: "in the first week"
```

Roles stay semantic — `quote`, `figure`, `steps`, `contrast` — and never geometric. The renderer
still owns composition; the author still never sets a size or a position.

## Boundaries

Not a v0 deliverable, and the first thing that would break decision:10's ceiling of four
archetypes. Each new role wants at least one new composition, and roles multiply faster than good
compositions do.

The seam to preserve: `chooseLayout` takes a content object, not a title and a bullet list, so a
richer slide shape is a wider input rather than a rewrite.

## Evidence

Adopt when a real presentation cannot say what it means with a title and bullets — most likely a
pull-quote or a single number, both of which are common in talks and both of which currently
render as a `statement` with the wrong emphasis.

**Adopted by decision:15, and smaller than sketched.** Building a real minute of video demanded
exactly two of the four roles above, and the two it demanded were not the two this sketch leads
with.

- `code` — essential, and not in this sketch at all. It is the only content whose whitespace is
  the meaning, and the only evidence that can prove the product's own claim.
- `steps` — essential, and the clearest demonstration that roles are semantic rather than
  decorative: identical data to `bullets`, opposite composition, because "stages of one
  transformation" is a different statement from "points".
- `quote` / `attribution` — not wanted. Eighty seconds of argument had nowhere to put a
  pull-quote.
- `figure` / `caption` — not wanted, and instructive: there was no honest number to show, and a
  fabricated one would have been worse than none. A role that needs invented content to justify
  itself is not justified.
- `comparison` — not wanted. The comparison this deck makes happens *across a cut*, between
  scene 1 and scene 2, which costs no vocabulary at all.

The seam this sketch asked to preserve held exactly as hoped: `chooseLayout` took a content
object rather than a title and a bullet list, so a richer slide shape was a wider input rather
than a rewrite.

