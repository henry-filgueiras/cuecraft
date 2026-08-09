---
id: drg_01KZM82VQNMWVW2QQXDC5XSSMA
sequence: 36
kind: dragon
status: open
created: 2026-08-09
---

# A lead's list is laid out into the room the subtitle band reserved

## Context

sprint:14 found that `index` and `cascade` sized themselves from constants rather than from the
box they were handed, so a subtitle band took a strip out of the bottom of the frame and the
composition ran straight through it. Both were fixed: `fitIndex` and `fitCascade` now ask how much
room there is and take that much, and `theme.ts` records the measurement that found it.

dragon:26 records the same shape for `matrix` — a cell that wraps overruns the room the band
reserved.

**`lead` has it too, and nobody had looked.** `Lead` in `render/layouts.tsx` never calls
`useSubtitleBand`, never calls `bodyBox`, and sets its items at `TYPE.item` inside a `flex: 1`
column. `Frame` applies the band as bottom padding and a `flex: 1` container whose `min-height`
resolves to `auto` refuses to shrink below its intrinsic height — which is precisely the mechanism
sprint:14 wrote down.

Found by `examples/legibility.yaml`, the readability A/B deck sprint:29 built: four bullets of
about fifty characters each, at lead scale, with `subtitles: true`. The fourth bullet is drawn
under the narration, and the narration is drawn over it.

It is **identical in both typography profiles**, which is how it was identified as pre-existing
rather than as something sprint:29 caused: the default render of that frame is byte-identical to
the same frame rendered before the profile existed.

## Question

Does `lead` fit to the box it was given, the way `index` and `cascade` were made to, or is there a
reason the asymmetric composition should be treated differently?

## Constraints

- Whatever is done must not move an *unsubtitled* `lead`. `examples/witnessglass.yaml` and
  `examples/cuecraft.yaml` both use the archetype and neither asks for subtitles, so the band is
  zero and the arithmetic has to leave them exactly where they are.
- `fitIndex`'s shape is the precedent and probably the answer: step the type down, spend air before
  size, stop at a floor where it stops being presentation type.
- The left column is a heading and the right is a list; only the right can give. A fitter that
  shrank both would make the heading a function of how many bullets there are.

## Candidate direction

`fitIndex`'s, applied to the right-hand column. What this dragon is really recording is *why it
was not done in the round that found it*: sprint:29 is a typography round whose whole claim is that
no default render moves. Fixing this
changes every subtitled `lead` frame in the repository — correctly, but visibly — and folding a
composition fix into the commit that introduced a font would make both of them harder to review
and neither of them attributable. It also has a non-goal against it in that sprint: no layout-engine
work.

## Resolution criteria

Resolved when a subtitled `lead` with four long bullets renders with the last one clear of the
band, every unsubtitled `lead` in `examples/` is unchanged to the pixel, and the rule is the same
rule `fitIndex` applies rather than a second one.
