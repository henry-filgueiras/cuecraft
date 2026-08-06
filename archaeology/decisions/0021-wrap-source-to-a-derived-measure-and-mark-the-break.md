---
id: dec_01KZCGVTNYPW6BZ44AV2VEEQDA
sequence: 21
kind: decision
status: accepted
created: 2026-08-06
---

# Wrap source to a derived measure, and mark the break

## Context

decision:20 closed dragon:6 by selecting less source, and named the limit it could not touch:
the region contains a 74-character line of real historical prose, and no selection rule
shortens a sentence somebody wrote. The scene set at 36px against the deck's 44px ceiling.

The measurement that decided this round is the pair of numbers underneath that figure:

```
scene "Change it, and nothing else"     literal
  rows                    5             height used   274 / 644 px   (43%)
  longest line           74 chars       width used   1604 / 1622 px  (99%)
  binding constraint    WIDTH           -> 36px
```

The frame had no spare width and 370px of spare height. In a monospace block those are the
**same resource**, and wrapping is the exchange rate between them. Searching the exchange —
every measure from the literal width down, costing each one through the existing `fitSpecimen`:

```
columns   74      67      64      63       60      45
rows       5       6       6       6        7       8
size     36px    40px    42px    44px     44px    44px
                                  ^ ceiling, and the widest measure that reaches it
```

One break, on one line, buys 22% more type and lands exactly on the largest size the deck sets
any specimen at. The two other source-backed scenes are height-bound (30px at 14 rows, 28px at
13) and wrapping makes both strictly worse — which the same search discovers on its own.

A second measurement decided *how*. Tokenizing a wrapped fragment on its own is wrong:

```
"  - \"They read files, search code, run tools, and decide what"
   -> hljs-bullet, hljs-string("They read ... decide what)
"to do next.\""
   -> hljs-string(to), hljs-string(do), hljs-string(next.")
```

The tail loses the string entirely — three scalars with the spaces between them unclassified —
so a wrapped sentence would change colour halfway through. A specimen that does that is telling
the viewer something false about the file.

## Decision

**Source too wide for its frame is projected: broken to a measure cuecraft derives, with the
break marked.**

Truth and projection are separate layers, and the projection is allowed to look different from
the file. It is not allowed to differ *silently*.

```
repository bytes            decision:18   quoting, not copying
  -> semantic selection     decision:20   the construct the story is about
  -> presentation projection  <- this      the same text, shaped for the frame
  -> rendering              decision:16/17 type, palette, activation
```

**Content is preserved exactly.** A projection is a partition of a logical line into character
ranges. Nothing is dropped, reordered, reflowed or reworded — rejoin the fragments with the
break spaces and the file's bytes are back, which the tests assert as a property over every
line of the canonical deck at every measure rather than promising in a comment. A line with no
break opportunity inside the measure is returned **whole and overflowing**, and measured at its
real width so the search cannot mistake it for a fit. There is no path that cuts text.

**Breaks are structural, not arithmetic.** Only at a space, never inside a word, and never
inside a line's own indentation — indentation is the structure being shown, so it is not a
break opportunity. A continuation hangs at its line's own indent, which puts the mark in the
column the list marker would have occupied: `-` opens an item, `↳` continues one.

**The mark is the honesty.** `↳` is drawn in the deck's dimmest grey, is the only thing the
renderer draws in the code area that is not source, and appears in no language cuecraft sets.
A viewer never has to work out which lines are the file's.

**The author is not consulted.** No wrap column, no manual break, no width, no measure. The
renderer already knows the viewport, the type scale and the advance width, and `fitSpecimen`
already reports what a given shape sets at — so choosing the measure is a **search over an
existing function**, not a new authored quantity. It runs from the literal width downwards and
keeps a measure only when it *improves* the size, so the winner is the widest projection
achieving the best size: the least wrapping that pays for itself, and none at all where height
already binds. Same trade as decision:14 and decision:10, one layer further down.

**Only wrapping.** The round's brief offered wrap, elide and fold in order of increasing loss.
The specimen demanded the least lossy one and it was sufficient, so the other two do not exist.

**One semantic identity may own several rendered regions.** A fragment carries the index of the
logical line it came from, and nothing else changed: marks (`specimen.ts`) and a change's
derived region (`change.ts`) both resolve against *source* lines, so a region that covered one
line now covers all of its fragments without any layer in between learning that wrapping exists.
The revision archetype's swap row is now as tall as its taller side's *fragment count*, with one
band and one gutter mark over the whole of it.

**The block is tokenized, the fragment is sliced.** highlight.js still owns the grammar
(decision:16); a new `render/tokens.ts` turns its markup back into tokens with offsets so a
fragment can be cut out of a *line's* tokenization rather than earning its own. This also
removed the last `dangerouslySetInnerHTML` and the generated `<style>` element from the
renderer — tokens are React elements with the palette applied directly.

## Consequences

- **The scene reached the ceiling.** 36px to 44px, five visual rows to six, and the only line
  that broke is the one the previous round named as the limit. `fitSpecimen`, the archetypes'
  geometry, and the activation model were not changed; a new step was inserted in front of them.
- **The two other specimens are byte-identical on the frame.** Both are height-bound, the search
  finds no measure that improves them, and `wrapped` comes back false. Projection is opt-out by
  arithmetic rather than by a flag.
- **Framing weakened further** — see dragon:6, closed by decision:20 as *weakened*. The scene
  that prompted the camera argument now sets at the same size as the deck's largest specimen,
  with the changed region occupying four of six rows. There is nothing left for a zoom to do
  that the type is not already doing.
- **Colour was widened from one hue to two, and the reason is perceptual rather than aesthetic.**
  Monochrome had a specific defect: the brightest thing in a cuecraft specimen was the *keys*,
  and the dimmest was the strings — which are the author's own prose and the only part of the
  frame a viewer is asked to read. Brightness now follows what matters and hue carries structure
  instead: cool mid-bright keys, near-paper prose, the accent on literals. Three classifications
  a viewer can name, not a theme, and still nothing reachable from the YAML.
- **A wrapped swap row leaves a line of slack in the incoming state.** The row is as tall as its
  taller side, so when the two-fragment outgoing line is replaced by a one-fragment incoming
  one, the row keeps its height and a blank line sits under the change. Sizing the row to the
  visible side instead would move every line beneath it mid-swap, which is the one thing the
  revision composition exists to prevent. The band covers the slack, so it reads as air around
  the change rather than as a blank line in the file — but it is the weakest thing on the frame.
- **The exchange rate is only favourable while height is spare.** This works because a well
  selected region is short. A block that is both tall and wide has nothing to trade and would
  need elision, which is the pressure recorded in dragon:7 rather than built here.
- **Projection looks code-specific, and the seam does not.** The wrapping rule is about
  monospace, indentation and token runs, and generalises to nothing. But the *layer* — a
  derivation between semantic selection and rendering, invisible to both — cost one module and
  one call site per archetype, and both archetypes needed the same search. That is one piece of
  evidence, not a framework; see idea:3, still parked.
