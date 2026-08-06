---
id: dec_01KZC3J94MZ4WE3D1252ERNAFB
sequence: 10
kind: decision
status: accepted
created: 2026-08-06
---

# Choose composition from content shape, not from the author

## Context

The First Light deck was legible and empty. Every slide put a title at the top and a column of
dashed bullets under it, using roughly the top third of a 1920x1080 canvas, at sizes chosen for
a laptop 18 inches away. It looked like a styled bullet template because that is exactly what it
was: one template, applied to every slide regardless of what the slide contained.

The obvious fixes are both wrong. Letting authors position things reintroduces the hand-editable
projection decision:1 exists to prevent, and turns the YAML into a worse Keynote. Adding a
`layout:` key moves the decision to the author, who now has to know the catalogue, and freezes
the catalogue as public API before we know which entries are any good.

There is a third option, and it is the one Sway took: the author supplies structured content, and
the system makes opinionated composition choices within a constrained design language. The
author's job is to say what the slide *means*; the system's job is to decide what it looks like.

## Decision

**Semantic content in, curated composition out, chosen deterministically.**

    slide { title, bullets }
        |  analyzeContent — count, length, terseness
        v
      shape
        |  chooseLayout — four comparisons against three constants
        v
     archetype
        |
        v
    Remotion composition

Four archetypes, and four is a ceiling rather than a starting point:

- **statement** — no bullets. The title is the slide, at display scale.
- **matrix** — up to six labels of 24 characters or fewer. A field of terms under hairlines,
  two or three to a row, rows stretched to divide the canvas evenly.
- **index** — up to six phrases of 38 characters or fewer. Numbered rows, ordinals in accent.
- **lead** — everything else. Asymmetric: the heading holds a column, a rule divides, the points
  stack beside it.

Selection lives in `src/render/layout.ts` as plain TypeScript, is resolved in `buildTimeline`,
and is carried on the scene. That makes the whole of "content analysis" unit-testable without a
browser and lets `cuecraft render` report what each slide was given, which is the only feedback
an author gets about a decision they did not make.

**Typography is a decision, not a knob.** `TYPE` and `SPACE` in `theme.ts` are a modular scale
and an 8px rhythm. Headings step down at two length thresholds so a long title wraps to two
readable lines rather than three cramped ones. None of it is reachable from the YAML.

**The layout machinery is internal.** No archetype name appears in the source format, and no
`layout:` key exists. We are learning which compositions earn their place; publishing the
catalogue now would freeze that answer.

## Consequences

- An author cannot force a composition. Changing how a slide looks means changing what it says —
  shortening bullets until they are labels, or splitting one slide into two. That is the intended
  pressure, and it is also the obvious first complaint if the heuristics are wrong.
- The thresholds are characters, not words, and they are guesses calibrated against one deck.
  They will be wrong for content shapes we have not seen. Being three named constants rather than
  a scoring function means being wrong is cheap to fix.
- Adding a fifth archetype needs an argument. Two archetypes that differ only in proportion are
  one archetype with a bug. If selection ever wants a scoring function or a solver, the correct
  move is to delete an archetype, not to add a heuristic.
- Slides now look different from each other, which means a deck can look incoherent if the
  content shape changes arbitrarily between slides. Shared margins, one accent, one type scale
  and one motion vocabulary are what hold it together; those are load-bearing, not styling.
- Richer semantic roles — a quote, a statistic, a comparison, a term with a definition — are the
  obvious next source of composition, and are parked as idea:5 rather than built.
