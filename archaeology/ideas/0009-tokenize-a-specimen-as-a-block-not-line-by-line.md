---
id: ide_01KZCAESH2B8H8J7HF3497YAPD
sequence: 9
kind: idea
status: parked
created: 2026-08-06
---

# Tokenize a specimen as a block, not line by line

## Problem

decision:16 tokenizes a code specimen one line at a time, because the `specimen` archetype needs
a DOM element per line to hang a region's tint and gutter mark on, and splitting highlight.js's
block output apart would mean re-balancing spans that cross a newline.

So a construct that spans several lines is tokenized as if each of its lines stood alone. In
YAML the obvious casualty is a block scalar:

```yaml
source: |
  everything in here is prose,
  and every line of it gets tokenized as if it were a mapping
```

The second line would be coloured as though `and every line of it gets tokenized as if it were a`
were a key.

## Sketch

Two ways out, both real:

1. **A custom emitter.** highlight.js lets a caller supply the object that receives token events,
   so the tokens could be collected as data and split at newlines with the scope stack intact.
   Correct, and couples cuecraft to an interface the library documents but does not promise.
2. **Highlight the block, then re-balance.** Tokenize the whole source, split the emitted markup
   at newlines, and close and reopen any span crossing a boundary. This is the standard
   line-numbering problem and has known solutions.

Either way, `highlightLine` becomes `highlightBlock` returning one entry per line, and nothing
else in the archetype changes.

## Boundaries

Not a syntax-highlighting engine, and not a second grammar. The whole of this is "give the same
tokens back, grouped by line".

## Evidence

Adopt when a specimen a deck actually wants to show contains a multi-line construct. Neither of
the self-demo's two does, and they should not: a specimen is an excerpt chosen to be legible from
across a room, which is a strong filter against the kind of source that has block scalars in it.

Until then this is a limitation with a known fix and no victim, which is the cheapest kind.

**Reassessed after decision:21 (2026-08-06).** Still parked, and half the cost has been paid by
something else.

decision:21 needed the *opposite* split — one logical line's tokens cut into two rendered
fragments — and to get it, `render/tokens.ts` now turns highlight.js's markup back into a flat
token run with character offsets. That is sketch 2's re-balancing machinery, built for a
different reason and already tested: `sliceTokens` cuts a run at an arbitrary offset and keeps
every classification intact.

What remains unbuilt is only the *input* end. Tokenizing the block would mean handing
`hljs.highlight` a multi-line string and splitting the result at newlines, which the same parser
would do without changes — a span crossing a newline arrives as one token containing `\n`, and
splitting on it is a `split`, not a re-balance.

So the estimate has dropped from "a custom emitter or a re-balancer" to "call it once and split
the tokens", and the reason to wait is unchanged: no specimen in any deck contains a multi-line
construct, and a presentation is a strong filter against source that does.
