---
id: spr_01KZEM4QE178Q5JP12M201A7Y5
sequence: 7
kind: sprint
status: active
created: 2026-08-07
---

# SHA-256 as a descent, and mathematics as a body

## Goal

Explain SHA-256 in about two minutes, as one continuous descent, and let the artifact decide
whether cuecraft can set mathematics.

    root         anything -> padded -> blocks -> squeezed into the state -> sixty-four characters
      child        sixteen words -> stretched to sixty-four -> one round, sixty-four times -> folded back
        grandchild   how sixteen words become sixty-four        (and the smear, as a formula)
        grandchild   what one round actually does               (choose and majority, as formulas)

Two things are being tested and they are not the same thing.

**Can a real subject use the call stack?** The online order was built to exercise the mechanism.
SHA-256 was not built for anything — it is a call stack because that is how the specification is
written, and if decision:31 is a language feature rather than a stunt it should fit without being
persuaded. It also makes the move dragon:9 has been asking for since decision:25: two interiors
in one scope, entered in sequence, so the camera finally has to go from inside one thing to
inside another.

**Can cuecraft set a formula?** At the leaves this subject stops being a flow and becomes
arithmetic. Two boolean mixers and a rotation are the whole of the "fancy" part, each is one
line, and a graph of two-word plates cannot say what they are. Set as ASCII they would look like
a screenshot pasted into a presentation, which is precisely the impression decision:16 exists to
prevent.

## Rationale

The formulas are **not** child modules, and working out why is most of the design.

A module exists because an interior wanted to *say something on its own* — that is decision:31's
whole argument, and it is why entering one is a call. A formula says nothing. It is an
illustration the surrounding sentence points at, which is exactly and only what an inline
`detail:` is for (decision:25). So the two mechanisms end up demonstrating their own distinction
inside one artifact: `child:` for a scope with its own narration, `detail:` for a thing that is
shown. It also costs no module depth, so the piece stays inside dragon:13's guard rather than
arguing with it on its first outing.

What the subject cannot be talked out of is **iteration**. Sixty-four rounds, forty-eight
expansions, N blocks — and cuecraft has no way to draw a loop. Every one of those becomes a
spoken "and this happens sixty-four times". For most subjects that is a rounding error. Here it
is the security argument: one round of SHA-256 is a reversible shuffle, and sixty-four is what
makes it a hash. The piece has to carry that in one sentence or it will teach the mechanism and
miss the point.

The audience is somebody who has typed `git commit` and never wondered what the forty hex
characters were. That is why it opens on provenance rather than on bits.

## Success criteria

- A `formula` body sets real mathematics — italic variables, proper operator spacing, real
  subscripts and superscripts — through an established typesetter rather than hand-rolled layout.
- A formula that will not typeset is a compile error naming the line, before anything is
  synthesized, like a mark that resolves to nothing.
- Nothing in the source names a font, a size, a colour, or a position. The author writes what the
  mathematics *is*.
- Narration reaches a line of a formula exactly as it reaches a bullet, and the formula opens as
  an inline interior — no new addressing, no new portal mechanism.
- The deck descends two module levels and enters **two** sibling scopes in sequence, which is the
  arrangement dragon:9 named and nothing has yet been watched doing.
- `examples/sha256/` renders end to end, runs about two minutes, and is watched at root, at each
  entry, at both formula portals, and at every return.
- The iteration problem is solved in the narration or written down as a failure. It is not
  papered over.
- Every existing deck still renders identically.
- `npm run check`, `npm run test:render` and `scarp doctor` are clean.

## Non-goals

A general mathematics vocabulary. Alignment environments, matrices, multi-line derivations,
numbered equations, or anything that would make `formula` a second content language — the whole
of what this subject needs is a handful of one-line definitions, and a body that could express a
proof would be a typesetting system rather than a role.

No animation of a formula, no stepping through a substitution, no highlighting inside a
expression beyond the line. No loops, no branches, no mutable state in the world vocabulary. No
raising of the module depth guard. No second visual language for mathematics: it inherits the
deck's palette and scale like every other archetype.

Bit-level accuracy is a goal; bit-level *depth* is not. The piece stops at the named functions
and never shows a rotation happening.
