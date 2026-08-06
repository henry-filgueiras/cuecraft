---
id: dec_01KZCFBH53DXJDMFEXZYYN5H5N
sequence: 20
kind: decision
status: accepted
created: 2026-08-06
---

# Let a specimen name the construct it wants, and show only that

## Context

decision:18's evidence scene set at 30px and dragon:6 asked whether that was a reason to build
a camera. The arithmetic said no before any code was written: `fitSpecimen` reports which
constraint binds, and at fourteen rows it was **height** — a number the author had no way to
influence, because the smallest quotable region was a whole slide.

```
selection too broad -> too many lines -> type shrinks -> the target is a small
fraction of the frame -> "the renderer should zoom"
```

Only the last arrow is about the renderer, and it is the only one that looked like a feature.

## Decision

**A quoted specimen may name the construct it wants, and cuecraft shows that construct.**

```yaml
code:
  file: examples/witnessglass.yaml
  slide: "Coding agents are black boxes"
  opens: "say:"
```

**One selector with two jobs.** `slide` is the scope and `opens` is the semantic point of
interest inside it. Neither is redundant and neither is a query: `say:` occurs once per slide,
so it is unique inside one and hopeless across a file — the slide is exactly what makes the
second key resolvable, which is why this is not a step toward a path language.

**The point and its containing unit are the same key.** The sketch that prompted this round had
`opens` naming a location and a separate `containing` deciding how much to show around it. In a
language where indentation carries structure they collapse: the construct beginning at a line
*is* the smallest meaningful unit that contains it. `opens: "say:"` means "the narration block",
not "four characters", and there is nothing left for a second key to say. That collapse is a
property of YAML, not a general truth — see the deferral below.

**No new machinery.** The containment rule is `blockEnd` from `specimen.ts`, which has resolved
marks since decision:16: the line plus everything indented beneath it, with interior blank lines
carried along. One rule now does two jobs — how much of a specimen to *emphasise*, and how much
of a file to *show* — and needed no generalisation to do the second. No parser, no dependency,
no AST.

**It never widens on failure.** A selector matching nothing and a selector matching several
lines are both hard errors naming the file and the slide. Falling back to the whole slide would
silently reinstate exactly the defect this exists to remove, and would do it invisibly.

**Two states must name the same construct.** Where both sides of a change select, the selectors
must be identical; cuecraft does not work out that one revision's `say:` is another's
`narration:`, because that is arbitrary code correspondence and not a problem a presentation
tool should be solving. Alongside it, a change whose two states share **no line at all** is
rejected: that is a replacement rather than a change, and it is the signature of a
mis-selection — the failure mode where inconsistent containment actually misleads.

`opens` is refused on a specimen written out inline, because such a specimen is already the
region its author meant to show.

## Consequences

- **The scene fixed itself, and the renderer was not touched.** Fourteen rows became five,
  30px became 36px, and the changed region went from five rows of fourteen to three of five.
  Not one line of `layouts.tsx`, `theme.ts` or `anchor.ts` changed. `fitSpecimen` was never
  wrong; its input was.
- **The binding constraint moved from height to width**, and the new ceiling is one
  74-character line of real historical prose. That is an honest limit rather than a layout
  defect: no rule can shorten a sentence somebody wrote. It also means further cropping buys
  nothing on this specimen, which is a useful thing to know before optimising it again.
- **Framing was weakened, not earned** — recorded in dragon:6. The changed region is
  unmistakable at presentation scale with two rows of context, and a camera move would enlarge
  type that is already legible while removing context that is already minimal. An attractive
  downstream abstraction turned out to be compensating for an upstream representation problem,
  and the evidence for that is arithmetic rather than taste.
- **The deck gained a whole-then-detail progression for free.** Scene 2 shows a slide entire;
  scene 3 shows its narration half changing. Last round those two scenes carried identical
  content at identical scale, which was the redundancy decision:19 shipped with. Semantic
  extraction produced the effect a camera would have been bought for.
- **TypeScript was considered for the hero specimen and rejected on story, not on cost.** A real
  change to `bodyElements` would have set at 44px and is genuinely self-referential. But the
  self-demo's thesis is about what an *author* writes, and showing cuecraft's internals would
  have made it a more inward video — while costing a second highlight grammar, a second palette
  mapping, and either the TypeScript compiler API or a brace-closing heuristic, because
  `blockEnd` does not include a `}` that dedents back to its opener. The colourful option was
  the wrong one.
- **Brace languages are deferred, and the reason is now specific.** Indentation containment
  works because a construct's extent is visible in its whitespace. A language that closes with a
  delimiter needs either that delimiter understood or a real parser, and a `containing:` selector
  becomes genuinely necessary once the point of interest is a line in the middle of a body that
  opens nothing. None of that is needed until a deck needs it.
