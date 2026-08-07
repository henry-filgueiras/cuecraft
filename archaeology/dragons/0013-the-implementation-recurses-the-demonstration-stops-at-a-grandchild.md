---
id: drg_01KZEHVANYF098Q5X046J52PSM
sequence: 13
kind: dragon
status: open
created: 2026-08-07
---

# The implementation recurses; the demonstration stops at a grandchild

## Context

decision:31's implementation recurses. Nothing in the loader, the flattener, the addressing, the
camera stack, or the renderer counts levels — a grandchild is resolved by the same function as a
child, with the inclusion chain one longer, and the transforms compose because each interior is a
composition scaled into a rectangle in its parent's coordinates.

The demonstrated contract is nevertheless two levels, enforced by one constant, and that gap is
deliberate. But it leaves a real question unanswered, because the thing that would fail at four is
not the compiler.

What was actually observed at three scales:

- **A grandchild is legible.** At the depth of `root/paying/check`, the world inside is drawn at
  roughly one composition pixel per screen pixel, and it reads exactly as a slide does. The two
  chamber borders sit just outside the frame edge and register as a *place*, not as clutter.
- **Orientation had already stopped being free at two.** The breadcrumb was added because the
  grandchild frame could not otherwise say which of three near-identical worlds it was. At three
  scales it is one short line; at five it would be a sentence, and a sentence of chrome is a
  different design.
- **Time compounds.** Each descent costs 1.9s in and 1.7s out (dragon:12) and the specimen spends
  7.2 seconds of a 98-second piece on thresholds. That is fine at two. At four it is a fifth of a
  short video spent travelling.

## Question

Is there a depth at which a descent stops explaining and starts being a journey, and is it a
property of the medium or of the material?

## Constraints

The cheap evidence is used up in the same way dragon:9's was. Rendering a four-deep artifact is
about twenty minutes of work and would answer nothing on its own, because the interesting failure
is not "it looked wrong" — it is *whether a viewer can still say what they were being told* after
coming back up through four returns. That is a question about a person, not about a frame.

There is also a structural warning sign that has nothing to do with taste. Unwinding is the part a
viewer has to do without help: going in is announced by a sentence, and coming out is announced by
nothing except the camera. The online order gets away with two returns partly because its parent
narration says "all of that took about a second" — a line that *acknowledges* the return. That is
authorial craft compensating for a missing signal, and it will not scale silently.

## Candidate direction

Do not raise the limit to see what happens. Raise it when an artifact genuinely has four scales
worth of causal structure — and when it does, watch specifically for whether the *returns* land.
If the unwind needs help, the help is more likely to be an acknowledgement in the narration
vocabulary than a bigger breadcrumb.

## Resolution criteria

Close as **resolved** when a four-deep artifact is watched and either holds or names what broke.
Close as **weakened** if two levels turns out to be the natural limit of the form rather than the
limit of what has been tried.
