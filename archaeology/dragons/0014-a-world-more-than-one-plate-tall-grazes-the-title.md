---
id: drg_01KZENSC7WMW9MF6VRT4BHPWAC
sequence: 14
kind: dragon
status: open
created: 2026-08-07
---

# A world more than one plate tall grazes the title

## Context

`Atlas` draws the deck's title, and now a breadcrumb above it, at the top-left of the frame in
screen space — deliberately not in world space, so it does not travel with the camera. Its
opacity is *derived*: it fades as the shot narrows, because a close shot on one concept is not a
shot about the world and does not want the world's name on it.

That rule was written against three worlds and every one of them was a single horizontal chain.
A chain lays out one plate tall, so the establishing shot — which fits the whole world at 16:9 —
leaves the top and bottom thirds of the frame empty, and the title sits in clear space.

sprint:7's first draft had two worlds that were not chains. `compress` had two entry points and
`round` had three, so dagre stacked them two and three ranks tall, so the establishing shot was
height-bound, so a plate sat exactly where the heading is. The title is drawn over it and stays
legible, but the plate reads as debris behind the words.

Both were fixed in the *artifact* — the worlds became chains, which they should have been anyway
(idea:16: the correct response to a layout problem is usually to change the world). The fix was an
improvement to the deck on its own merits, which is why it was the right one to make. It also
means the machinery has not been tested, only avoided.

## Question

Is "a world is one plate tall" an accident of the three artifacts so far, or a constraint the
atlas is quietly imposing?

## Constraints

The obvious fixes are each wrong in an instructive way.

- **Fade the title when content is near it.** Derived, cheap, and it would blank the title on
  exactly the shot that needs it most: the opening establishing shot of a tall world is when a
  viewer most wants to be told what they are looking at.
- **Put a scrim behind the title.** A box of darkened background over a travelling world, which is
  the "fixed caption over moving content" problem decision:22 explicitly solved by deriving
  opacity instead. Going back to a scrim would be undoing that.
- **Inset the world's fit so it never reaches the top band.** Honest, and it makes every wide shot
  of every deck slightly smaller in order to reserve space for a caption that is often invisible.
- **Move the title.** There is nowhere better. Bottom-left collides with the progress rule;
  centred is a different design.

The version of this that actually matters is not cosmetic. A world laid out three ranks tall is
*already* being shown badly — its plates come out small, its edges bow across the frame, and the
camera's travel between concepts becomes vertical, which reads worse than horizontal at every
scale. The title collision may be a symptom of a world that wanted to be flatter, in which case
the right response is the one taken here and there is nothing to build.

## Candidate direction

Do not fix it. Write down which worlds have been drawn and how tall each was, and watch for the
first artifact whose subject genuinely does not flatten — something with real parallel structure,
where the branching *is* the content rather than an artefact of how the entities were chosen. If
that world also looks bad in every other way, this closes as a symptom. If it looks fine except
for the title, the atlas needs a rule about where the world may not go.

## Resolution criteria

Close as **resolved** if a world that must branch is drawn and the title has to move or fade.
Close as **weakened** if two or three more artifacts all turn out to want chains, which would say
the composition is for transformations and branching worlds are a different question.
