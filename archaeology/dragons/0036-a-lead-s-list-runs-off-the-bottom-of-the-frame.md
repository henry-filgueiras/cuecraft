---
id: drg_01KZM82VQNMWVW2QQXDC5XSSMA
sequence: 36
kind: dragon
status: open
created: 2026-08-09
---

# A lead's list runs off the bottom of the frame

## Context

sprint:14 found that `index` and `cascade` sized themselves from constants rather than from the
box they were handed, so a subtitle band took a strip out of the bottom of the frame and the
composition ran straight through it. Both were fixed: `fitIndex` and `fitCascade` now ask how much
room there is and take that much, and `theme.ts` records the measurement that found it.

dragon:26 records the same shape for `matrix` — a cell that wraps overruns the room the band
reserved.

**`lead` is worse than either of them, and nobody had looked.** `Lead` in `render/layouts.tsx`
never calls `useSubtitleBand`, never calls `bodyBox`, and never fits anything: it sets every item
at `TYPE.item` inside a `flex: 1` column and lets the column be whatever height that comes to.

So this is *not* the subtitle-band defect that `index`, `cascade` and `matrix` have, and the first
cut of this dragon said it was. **A `lead` with enough text overflows the frame with subtitles
turned off.** The band is an aggravating factor and not the cause: it takes a strip off the bottom,
so a list that was already too tall starts colliding with the narration a hundred and fifty pixels
earlier. Turning subtitles off moves the collision; it does not remove it.

The distinction matters for the fix. Giving `lead` the band would close the *symptom* that looks
like dragon:26 and leave a composition that still cannot be trusted with three long bullets.

Found by `examples/legibility.yaml`, the readability A/B deck sprint:29 built, and found **by the
author of this repository watching the film rather than by the round that wrote it** — sprint:29
sampled three frames of that deck and none of them was the slide that fails. The first cut of the
deck had four bullets of about fifty characters at lead scale with `subtitles: true`, and the
fourth was drawn under the narration; shortening that slide to three moved the failure to the
*next* lead slide, whose three bullets are eighty to a hundred characters each and whose third
runs clean off the bottom edge. Both with subtitles on and with them off.

It is **identical in both typography profiles**, which is how it was identified as pre-existing
rather than as something sprint:29 caused: the default render of that frame is byte-identical to
the same frame rendered before the profile existed.

## Question

Does `lead` fit to the box it was given, the way `index` and `cascade` were made to, or is there a
reason the asymmetric composition should be treated differently?

And, underneath that: how much authored text is a `lead` allowed to be handed before the honest
answer is a parse-time refusal rather than a smaller type size? `fitIndex` has a floor at 38px and
stops there; a composition that keeps shrinking to fit anything eventually renders text nobody in
the room can read, which is another way of losing it.

## Constraints

- Whatever is done must not move an *unsubtitled* `lead` that already fits. `examples/witnessglass.yaml`
  and `examples/cuecraft.yaml` both use the archetype, neither asks for subtitles, and both are well
  inside the frame — so the arithmetic has to leave them exactly where they are and only act on a
  list that would otherwise overflow.
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

Resolved when a `lead` with three hundred-character bullets renders whole — with subtitles and
without — every `lead` in `examples/` that already fits is unchanged to the pixel, and the rule is
the same rule `fitIndex` applies rather than a second one. A deck whose content will not fit even
at the floor should be refused with a message naming the slide, not rendered off the edge.
