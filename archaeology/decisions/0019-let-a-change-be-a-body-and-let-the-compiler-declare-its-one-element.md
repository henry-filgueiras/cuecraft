---
id: dec_01KZCDZTTAQZ5K0CYF122E8W77
sequence: 19
kind: decision
status: accepted
created: 2026-08-06
---

# Let a change be a body, and let the compiler declare its one element

## Context

The self-demo makes five claims and, until this round, demonstrated four. The one it only
asserted was the most important: *change the source, and everything downstream follows it.* It
was said in prose over a static frame, which is the register the rest of the video avoids, and
it was unshowable because a specimen has one state (idea:11).

There was a second question hiding behind the first, and it is the more interesting one.
decision:14 established that an author states a *relationship* and the compiler derives the
*time*. A diff raises the next level: the compiler already knows which region of the frame is
the change, so does the author still have to give that region a name?

## Decision

**A change is a body, and the compiler declares its one element.**

```yaml
change:
  before:
    language: yaml
    source: |
      ...
  after:
    file: examples/witnessglass.yaml
    slide: "Coding agents are black boxes"
```

Two truthful source states, each a specimen in either of decision:18's forms, and **nothing
else**. No annotation of which lines differ, no marks, no colours, no ordering, no timing. The
schema rejects any other key with a message saying why: which lines differ is derived, not
authored.

**The derivation is `jsdiff`'s**, per CLAUDE.md — line granularity, no word-level splitting
inside a line, which at presentation scale is noise. `presentation/change.ts` turns the parts
into a display model of **kept rows** and **swap rows**, where a hunk is a fixed stack as tall
as its taller side and removed line *i* shares a row with added line *i*. Two identical states
are a hard error: a slide claiming something changed had better be able to point at it.

**The compiler declares `change`.** `bodyElements` on a change body returns one element whose
id is `change`, and narration reaches it exactly as it reaches a bullet:

```yaml
say:
  - speech: "Somebody named one term, and pointed one sentence at it."
    activates: change
```

Nothing in the presentation declares that identity. It is still **scoped to the slide**, it
still appears in the `(declared: ...)` list of every anchor error on that slide, and misspelling
it is a parse-time failure naming the cue. There is no global namespace and no magic name — one
body declares one element, and it happens to be the compiler doing the declaring.

**The renderer treatment is `revision`, the seventh archetype.** The changed lines swap *in
place* and every unchanged line around them holds still, so the frame shows one thing becoming
another rather than a list of two things. A stacked removed-then-added diff was rejected on
exactly that ground: it makes the viewer reconstruct the transformation a presentation should be
showing them. Context recedes as the change lands (`0.7 - 0.22 * degree`), so focus moves without
anything moving. No red, no green, no `+`/`-` gutter — removal is something leaving, addition is
something arriving in the accent that means "narration has been here" everywhere else.

**It consumes decision:17's envelope and adds no clock.** The two halves of the crossfade are
staggered *inside* `degree` — the outgoing line is gone by 45%, the incoming one starts at 40% —
so the frame never holds two overlapping lines of code, and the archetype still has no curve of
its own.

## Consequences

- **Semantic structure can generate a visual endpoint, and the boundary is clean.** The author
  supplies the structure (two states), the compiler supplies the identity (`change`), the author
  supplies the *reference* (`activates: change`), and the measured audio supplies the moment.
  The one thing the author no longer types is the thing the compiler already knew. That is the
  same trade decision:14 made with timing, one level up, and it required **no change to timing,
  anchoring or validation** — `bodyElements` absorbed it entirely, which is the evidence that
  that seam is real rather than decorative.
- **A derived identity is only safe because it is local and closed.** One body, one element, one
  name, checked statically against the slide that declares it. A second derived element, or an
  identity visible from another slide, would give up the property that makes every anchor error
  a statement rather than a search (idea:13 argues the same point from the other side).
- **A change behaves like an event wearing a content role, and that is recorded rather than
  generalized.** `change` is the first body that is about a *transition* rather than a state,
  and the honest reading is that a `transforms` verb is already present in the artifact. It is
  deliberately not exposed as one: the format gains a noun, not a vocabulary, and the taxonomy
  stays unbuilt until a second content role argues for it.
- **The `before` state cannot be checked.** The `after` is quoted from the file and cannot lie;
  the `before` is a historical state and nothing in a checkout can confirm it. See dragon:5.
- **Row pairing inside a hunk is positional and occasionally arbitrary.** When a hunk removes
  two lines and adds three, `pause: 350ms` becomes `speech: "..."` in one row because they are
  both first, not because they correspond. At hunk scale the eye reads the block rather than the
  rows, so it works; a longer hunk might not, and the fix would be a better pairing rather than
  a longer animation.
