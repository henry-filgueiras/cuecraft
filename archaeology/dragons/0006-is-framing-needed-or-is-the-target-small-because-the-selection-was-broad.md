---
id: drg_01KZCF16PE8C1FYJPZ34TGCTFC
sequence: 6
kind: dragon
status: closed
created: 2026-08-06
resolved-by: "[[dec_01KZCFBH53DXJDMFEXZYYN5H5N|Let a specimen name the construct it wants, and show only that]]"
---

# Is framing needed, or is the target small because the selection was broad?

## Context

decision:19's evidence scene works and is too small. Its code sets at 30px where the deck's
other specimens have managed 44px, and the changed region — the thing the whole scene exists to
show — is five rows out of fourteen.

The tempting reading is that the target is small and the renderer should therefore move a camera
to it. Before believing that, the arithmetic was worth doing, because `fitSpecimen` reports which
constraint binds:

```
scene                     rows  longest  byHeight  byWidth  ->  size   changed
"Change it, and nothing"    14       74      30.3     36.4      30px    5 / 14
  same change, cropped
  to the `say:` block        5       74      84.7     36.4      36px    3 /  5
```

The binding constraint at 30px is **height**, and height is a function of how many lines were
selected. Crop the selection to the construct the narration is actually about and the height
term stops binding entirely — it goes to 84.7, well past the 44px ceiling — while change density
nearly doubles.

So the causal chain looks like this, and only the last arrow is about the renderer:

```
selection too broad -> too many lines -> type shrinks -> target is a small
fraction of the frame -> "the renderer should zoom"
```

decision:18 already recorded that the smallest quotable region is a whole slide, and filed it as
a want rather than a defect. This is the evidence that it is a defect.

## Question

Is perceptual framing a capability cuecraft needs, or is the apparent need for it an artifact of
selecting more source than the evidence requires?

## Constraints

The measurement above is arithmetic, not perception. It says the type can be larger and the
target can occupy more of the frame; it does not say the result reads well, and 36px is not 44px
— cropping moves the binding constraint from height to *width*, where the limit is one 74-character
line of real historical prose that no layout rule can shorten.

Framing is also genuinely cheap to want and expensive to have. Any version of it introduces
geometry that no other archetype has, a second thing that moves during activation alongside
decision:17's envelope, and a category of source that cuecraft has refused since decision:10.

## Candidate direction

Fix selection first and measure again. If a contained specimen at presentation scale makes the
changed region obvious on its own, framing is not earned and the honest record is that an
attractive downstream abstraction was compensating for an upstream representation problem.

If it is still perceptually weak after that, framing has been isolated as a real need rather
than assumed, and the smallest possible version can be argued for on evidence.

## Resolution criteria

Render both states and judge them the way decision:17 was judged — by watching while listening,
not by inspecting. Close this as one of: framing **earned** (the contained specimen still needed
it), **deferred** (plausible, but this artifact does not demand it), or **weakened** (the need
was mostly the selection problem wearing a disguise).
