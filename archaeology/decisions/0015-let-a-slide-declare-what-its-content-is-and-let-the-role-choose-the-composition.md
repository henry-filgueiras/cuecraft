---
id: dec_01KZCABE8SGB5B5FH08QCG3590
sequence: 15
kind: decision
status: accepted
created: 2026-08-06
---

# Let a slide declare what its content is, and let the role choose the composition

## Context

decision:10 derived composition from the *shape* of a slide's content: how many bullets, how
long each one is, how long the title is. It closed by predicting its own limit — richer semantic
roles are "the obvious next source of composition" — and parked them as idea:5, a speculative
list of four: quote, figure, steps, comparison.

Making a real minute of video settled which of those were real.

The self-demo needed to show cuecraft source on screen. A code block cannot be measured into a
composition, because the measurement that matters is not its length: its indentation is the
content, its line breaks are not reflowable, and no count of characters distinguishes it from
three long bullets. Shape analysis has nothing to say about it.

It also needed to show a compilation pipeline. That one *could* be forced through the existing
rules — four short phrases select `matrix`, a field of parallel terms — and the result is wrong
in a way shape can never detect. `Speech, Timing, Composition, Video` are not parallel. Each
consumes the one before it. Presented as a field they read as four unrelated features; numbered
as an `index` they read as an enumeration. Both are *false statements about the content*, made
by a renderer that was never told what the content was.

The remaining two candidates from idea:5 — quote and figure — were not needed by eighty seconds
of real argument, and were not built.

## Decision

**A slide declares what its content is. The role selects the composition; shape decides only
within a role.**

    slide { title, body }
      |
      |  body.kind ------------------> specimen   (code)
      |                  \-----------> cascade    (steps)
      |
      \  bullets -> analyzeContent -> shape -> matrix | index | lead | statement

Three bodies, and at most one per slide:

```yaml
bullets: [...]      # these are points
steps:   [...]      # these are stages of one transformation
code:    {...}      # this is source, and its whitespace is the content
```

`bullets` and `steps` carry **identical data**. That is the test of whether these names are
semantic rather than decorative: the same four strings compose as a field of terms or as a
descending cascade depending only on what the author said they *were*. Nothing about direction,
offset, connector, order of arrival, or size appears in the source.

**The body is a closed union, not an extension point.** `SlideBody` is four cases including the
absence of one, and `bodyElements()` is the single function every downstream stage uses to find
what narration can reach. Anchors resolve to an index into that list, so a list item and a mark
on a code specimen are the same kind of endpoint (decision:14 called this `bulletIndex`; it is
now `elementIndex`, which is the only change the anchor representation needed).

**Six archetypes is the new ceiling**, replacing decision:10's four, and the rule that raised it
stands: an archetype is added when a real slide in a real artifact looked wrong without one, and
the correct response to a selection problem is to delete an archetype rather than add a
heuristic.

## Consequences

- `AuthoredSlide.bullets` is gone; slides carry `body`. Every deck written against the old shape
  still parses, because `bullets:` is still `bullets:`.
- Adding a seventh role now costs a parse branch, a `bodyElements` case, a selection line, and a
  composition. It does not cost anything in timing, anchoring, or validation. That is the seam
  idea:5 asked to be preserved, and it held.
- The pressure toward the generalized IR of idea:3 was real and was answered with the smallest
  thing that works: a tagged union carried verbatim from parse to render. The Scene no longer
  flattens content into a bullet list, which is what the IR was mostly *for*.
- Three of idea:5's four sketched roles turned out to be unwanted by a real artifact. Keeping
  them parked is now evidence rather than caution.
- `bullets` remains a slightly mechanical name — a bullet point is a rendering artefact, and
  `points` would be more honest. Renaming it would break every existing deck for a nicety, so it
  stays, noted rather than fixed.
