---
id: ide_01KZCH1QE2AYAN0SWGW5RSGERP
sequence: 15
kind: idea
status: parked
created: 2026-08-06
---

# Let narration reach a phrase inside a line

## Problem

decision:21 established that one semantic region can own several rendered regions — a wrapped
line is two boxes with one identity. The symmetric question is whether a region can own *less*
than a line: a token run inside one, surviving selection, tokenization, wrapping and rendering,
so narration can make a phrase hot rather than a construct.

## Sketch

An activation whose target is narrower than a mark:

```yaml
say:
  - speech: "The author only says what should happen."
    activates: <the `speech:` key of the projected specimen>
```

`render/tokens.ts` makes the endpoint cheap: a line's tokens have offsets now, and `sliceTokens`
would find the run. The cost is entirely in the authored vocabulary and in the treatment.

## Boundaries

Ask first whether cuecraft already knows the sub-region — it usually does:

- a **mark** already means "this line and everything indented under it" (decision:20), which in
  YAML is the construct, which is what a person points at out loud;
- a **change** already knows its own changed span and declares one identity for it
  (decision:19).

Neither needed a phrase. A phrase selector would add a second addressing grammar beside `line:`
whose scope is narrower than a line, and every version of it is a step toward the query language
decision:18 refused: a substring that must be unique *within* a line, or an occurrence index, or
a token ordinal.

The perceptual half is the harder one. A line band and a gutter mark work because they are
large; a hot span inside a line has to compete with the syntax colour it sits in without becoming
a highlighter pen — and it has to survive a wrap landing in the middle of it.

## Evidence

That last case is the interesting one and the reason to keep this filed: a span split across two
fragments is the same "one identity, several rendered regions" property decision:21 established,
tested at the only scale where it is hard.

Adopt when a deck's story genuinely turns on a phrase rather than on a construct. Building it
first would be designing for a scene nobody has needed.
