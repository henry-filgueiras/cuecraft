---
id: drg_01KZCE046CB12Y1TE1F6P32JCN
sequence: 5
kind: dragon
status: open
created: 2026-08-06
---

# A change needs two states; a checkout has one

## Context

decision:18 made a specimen unable to lie: it quotes a file, so the text on the frame is the
file's text or the render fails. decision:19 then built a body that takes **two** source states
and derives the change between them.

Those two things do not compose all the way. A checkout holds one state of a file. A change is
by definition a statement about two, and the earlier one no longer exists anywhere the compiler
can reach.

The self-demo hits this at its most important moment. Its change scene shows
`examples/witnessglass.yaml`'s first slide acquiring a semantic identity — a real edit, made in
the same commit, and its `after` is quoted from the file and checked. Its `before` is a literal
in `examples/cuecraft.yaml`: the exact prior text, typed once, and from then on unverifiable. It
is the copy problem, surviving in the one place quoting cannot reach.

It is not currently *wrong*. It is unfalsifiable, which is a weaker property than the rest of
the format has, and it is asymmetric in a way an author will not notice: one side of the diff is
enforced and the other is trusted.

## Question

Should a `before` state be checkable at all, and if so, against what?

## Constraints

The obvious answer is Git, and it is bigger than it looks. `before: { file: X, slide: Y, at:
HEAD~1 }` puts a revision selector in the source language, makes a deck's output depend on
history rather than on a checkout, breaks reproducibility from an exported tree, and means a
rebase can change a video. That is a large expansion for one slide, and it was explicitly out of
scope for the round that raised this.

## Candidate direction

Three cheaper directions, none of them obviously right:

1. **Leave it.** A historical state is prose about the past, and prose about the past is what a
   presentation is mostly made of. Document the asymmetry and stop.
2. **Make the pairing checkable a different way** — for instance, requiring that the two states
   differ *only* in ways the deck's narration is about, so a drifted `before` produces a diff
   that no longer matches what is said. Vague, and possibly not mechanizable.
3. **Let the repository hold both.** Two real files, or a small directory of frozen prior states
   promoted deliberately, the way decision:3 promotes approved narration. This is the direction
   that fits the existing thesis best: a `before` that has been *frozen into source* is checkable
   because it is source.

## Resolution criteria

Because the honest answer probably depends on whether a change scene turns out to be a thing
decks want more than once. One instance is not enough evidence to add a history model, and it is
enough evidence to record that the format currently has one input it cannot check.
