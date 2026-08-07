---
id: tsk_01KZEM6846NG0PXKN7KKGVC4M4
sequence: 27
kind: task
status: pending
sprint: spr_01KZEM4QE178Q5JP12M201A7Y5
created: 2026-08-07
---

# Let a body be mathematics, and let KaTeX set it

## Objective

Let a slide, an interior, or a module say that its content is **mathematics**, and set it properly.

    formula:
      - id: choose
        tex: '\mathrm{Ch}(e,f,g) = (e \wedge f) \oplus (\lnot e \wedge g)'

A list of lines, each of which narration may reach — the same shape `bullets` has, for the same
reason: it is a sequence of things a sentence can point at, and inventing a second shape for that
would be inventing a second addressing scheme.

The typesetting is delegated. KaTeX is the mature answer to "put TeX on a screen" (decision:5),
it is pure, offline and deterministic, and it ships its own fonts — which makes a formula the
first thing cuecraft renders that does *not* depend on what the host machine happens to have
installed (dragon:4). That is a real improvement rather than a new liability, and it is worth
saying so in the decision.

Validation happens at parse time, because a formula that will not typeset is exactly the same
kind of failure as a mark that resolves to nothing: something that would otherwise put a broken
picture on a frame under a heading claiming it is mathematics.

## Acceptance criteria

- `formula` is accepted wherever a body is: on a slide, as a `detail:`, and as a module's body.
- Each line is TeX or `{ id, tex }`, and a duplicate id is an error, as it is for a bullet.
- Malformed TeX fails at parse time, naming the slide and the line, with KaTeX's own complaint.
- The archetype is chosen from the role and never named by the author. Nothing in the source
  names a font, a size, a colour, an alignment or a position.
- Variables are italic, operators are spaced, subscripts and superscripts sit where a
  mathematician would expect them, and the result reads at 1080p from across a room.
- A line narration reaches passes through the same three-state envelope every other element does.
- Fonts are loaded before the first frame is captured, deterministically, rather than hoped for.
- The dependency is recorded, with its size and what it replaces.
