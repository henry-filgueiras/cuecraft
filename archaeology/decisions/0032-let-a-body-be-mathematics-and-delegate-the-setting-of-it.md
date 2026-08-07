---
id: dec_01KZENRC726S6Q9AY9129ZVG3X
sequence: 32
kind: decision
status: accepted
created: 2026-08-07
---

# Let a body be mathematics, and delegate the setting of it

## Context

Nine bodies, and every one of them added because a real artifact could not say what it meant
without it. Eight are sequences — of prose, of stages, of source, of things and relations — and
the ninth is content the compiler supplies. All of them are things you *read*.

Explaining SHA-256 ran out of all nine at the bottom. `Ch` and `Maj` are the only two places in
the algorithm where something specific is happening rather than numbers being moved around, and
at world scale each of them is three words on a plate. Three words cannot say what a multiplexer
is. Neither can bullets, and code is worse than either: setting a boolean identity as ASCII —
`(e AND f) XOR ((NOT e) AND g)` — puts a screenshot on the frame, which is precisely the
impression decision:16 built a palette to prevent.

## Decision

**A body may be mathematics, spelled in TeX, set by KaTeX.**

```yaml
formula:
  - tex: '\mathrm{Ch}(e,f,g) \;=\; (e \wedge f) \;\oplus\; (\lnot e \wedge g)'
  - id: maj
    tex: '\mathrm{Maj}(a,b,c) \;=\; (a \wedge b) \;\oplus\; (a \wedge c) \;\oplus\; (b \wedge c)'
```

**A list of lines, exactly as `bullets` is**, and that is the load-bearing reuse rather than a
coincidence of spelling. A formula body is a sequence of things a sentence can point at, which is
what an anchored list already is — so it resolves through `bodyElements`, addresses through
`bodyAddresses`, activates through the same three-state envelope, and opens as an inline interior
through decision:25 with nothing added anywhere. The seam idea:5 asked to be preserved has now
held six times, and this is the first time it held for content that is not text.

**The vocabulary is TeX's, and inventing one was refused.** A semantic mathematics vocabulary was
the obvious cuecraft-shaped move and it is wrong for the same reason `->` is right for a relation
(decision:22): the thing being written already has a notation that everybody who would write it
can read. A cuecraft spelling of `\oplus` would be a worse notation with a smaller audience, and
it would need a specification, which is a language.

**What is absent is what would make it a typesetting system rather than a role.** No alignment
environments, no numbering, no multi-line derivations, no inline-versus-display, no macros, no
size, no colour, no position. A line is a line. A body that could express a proof would be a
document format living inside a presentation format — the mistake decision:25 avoided by making
an interior an ordinary slide body, made again one level down.

**It is validated at parse time**, and this is not a nicety. A formula that will not typeset would
otherwise put a broken picture on a frame under a heading claiming it is mathematics, which is the
same failure class as a mark that resolves to nothing (decision:18) and gets the same answer:
refuse to build. KaTeX's own message is carried through verbatim, because it points at the
offending token with a caret and nothing this could paraphrase would be better.

**The archetype centres, and it is the only one that does.** Everything else in the deck hangs off
the left margin because it is read left to right and a ragged left edge is a reading obstacle. An
equation is not read that way — it is looked at whole, and its relation sign is its axis. Setting
it flush left would put that axis somewhere arbitrary.

## Consequences

- **One dependency: KaTeX.** Pure, offline, deterministic, about four megabytes installed of which
  most is fonts. It is doing something cuecraft has no business doing itself, which is decision:5's
  test, and it is the smallest mature answer available — MathJax does the same job with a
  document-processing pipeline attached.
- **It is the first typography in cuecraft that is reproducible.** Every other face is a system
  stack resolved against whatever the host machine has, which dragon:4 records as a defect this
  project has been living with since First Light. KaTeX ships its faces and they are bundled with
  the composition, so a formula sets identically everywhere. That does not close dragon:4 — it
  narrows it, and it proves the fix is affordable.
- **The cost of bundling a face is that it has to load.** A renderer capturing frames as fast as it
  can will otherwise photograph the fallback, so `Formula` holds the frame with `delayRender` and
  asks the browser for each family by name. Waiting on `document.fonts.ready` was tried and is
  wrong: it resolves immediately when nothing has *started* loading, and whether anything has
  started depends on whether layout has run.
- **A formula estimates its own width rather than measuring it**, like `headingLines` and
  `fitSpecimen` before it, so composition still resolves without a browser. Control sequences
  collapse to the one glyph they usually set. For a definition that is close enough to choose a
  size; for a page of algebra it would not be, and a body that could hold a page of algebra is
  already outside this decision.
- **The bug worth remembering** is that the first cut of the line validator returned *either* the
  TeX or the complaint, both as strings, and therefore could not tell them apart: every malformed
  line was handed to KaTeX, typeset as prose, and accepted. A discriminated return fixed it. The
  tests caught it; the types should have, and that is the lesson rather than the fix.
- The tenth archetype makes `chooseLayout` ten branches long. layout.ts says a ceiling was
  intended at nine, and this is the second time a *role* rather than a shape has pushed through it
  — which is evidence that the ceiling was about arrangements and never about meanings.
