---
id: ide_01KZC3N0RAMXAAH3M6XEH0DRZ3
sequence: 5
kind: idea
status: parked
created: 2026-08-06
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
