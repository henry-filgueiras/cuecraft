---
id: ide_01KZHG68T0H8JVQYE6CSHMB1DS
sequence: 18
kind: idea
status: parked
created: 2026-08-08
---

# Inline shorthand for who speaks, and the family it belongs to

## Problem

decision:39's object form is correct and slightly heavy. A cue that wants nothing but a different
speaker has to stop being a string and become a mapping — three lines where there was one — so a
deck that alternates often reads as configuration rather than as prose.

## Sketch

An inline marker at the head of a cue:

```yaml
say:
  - "The reader says this."
  - "@aside And this is the other one."
```

## Boundaries

cuecraft has no inline syntax anywhere, and decision:11 refused to invent one at the moment it
would have been easiest: nothing is embedded in the prose, and a cue is a YAML value rather than a
little language. Adding the first sigil for the first feature that asks for one is how a format
acquires a syntax nobody designed.

`@name` is also not the only shorthand this project will eventually want. `activates:` and `fills:`
are both "this sentence and that element are the same idea" and both cost an object today; a reach
into part of a line (idea:15) would want something similar. The family should be designed once,
against all of its members, rather than one sigil at a time — each defensible alone, and
collectively a dialect.

Also out: anything that makes the marker mean more than one thing, and anything that lets it carry
state past its own cue. Whatever the spelling turns out to be, decision:39's lexical rule stands.

## Evidence

Deferred by decision:39 on the reasoning above. What would unpark it is a deck that is genuinely
hard to read in the object form — an extended alternation, written and watched — rather than the
observation that the object form is verbose. `examples/aside.yaml` has one override per slide and
does not make the case.
