---
id: dec_01KZCMZHY6BVK9SFPTJ36NGC94
sequence: 23
kind: decision
status: accepted
created: 2026-08-06
---

# Spend the contrast on the moment, and let established be normal

## Context

decision:17 gave activation three states — `future`, `hot`, `established` — and the archetypes
read them as three treatments, which in practice meant three colours: dormant grey, an accent
transient, and a settled middle grey. Watching a minute of that deck, the transient works and the
other two do not. A slide accumulates *dullness*. Every element the narration has finished with
sits at a colour that says "handled", and by the last cue most of the frame is in that state.

The atlas made the defect impossible to ignore, because it has eleven elements instead of four
and the last shot of the video is all of them at once. Under the old reading, the reveal — the
frame the whole piece builds to — would have been eleven grey boxes and one bright one.

## Decision

**Spend the contrast on the moment. Let established be normal.**

    future        the only attenuated state: latent, dim, still legible as structure
    hot           unmistakable: the entity's own colour brightened, a bloom, a ring, a step
                  towards the viewer, and everything else in the frame stepped back half a stop
    established   the visual baseline. White label, its own colour, no residue of having been hot

Three things that were tried and kept, in order of how much they turned out to matter:

1. **Surrounding attenuation.** While anything is hot, everything else multiplies down by half.
   This is the single most effective device on the frame, and it costs one number: the eye finds
   the brightest object before it finds anything else, so the job is to make the moment brightest
   rather than to make it *different*.
2. **Saturation, not whiteness.** The first cut pushed a hot border towards paper. A white border
   is merely light; the entity's own colour *brightened* is lit, and lit is what reads as "this
   one". `mix(hue, white, 0.42)` rather than `mix(hue, paper, heat)`.
3. **A longer envelope where the camera travels.** `WORLD_TIMING` stretches decision:17's shape
   without changing it, because ignition happens at the word and the shot arrives a second later.

And one thing that had to be undone: **the bloom was banding.** A 200-unit glow at eight percent
alpha is a gradient with about four values in it, and H.264 renders four values across three
hundred pixels as visible rectangular steps — the same eight-bit near-black problem that flattened
the deck background in decision:10. Halving the radius and roughly doubling the alpha puts the
same light into a ramp steep enough to survive the encoder.

**Colour identity is derived from the graph, not authored.** An entity's hue is its position along
the flow: cool where cuecraft is reading, warm where it is producing, through a bright neutral in
between. The two ends are colours the deck already owned — a specimen's keys and the deck accent —
so this is the existing palette arranged along the machine rather than a new one. A `kind:` key on
entities was the obvious alternative and was deliberately not added: the graph already says which
end of itself a thing is on.

## Consequences

- The recalibration is **scoped to the atlas**. The other seven archetypes still read the three
  states the old way. That is deliberate — this round was not going to destabilise a working
  hundred-second deck to prove a point about contrast — but it does mean cuecraft now holds two
  interpretations of the same three numbers, and the older one is the one it has more of.
- Propagating the new reading to `establishedText` is the obvious follow-up and is idea:16.
- `anchorState` takes its timing as an argument now, defaulting to decision:17's. Nothing else
  changed about the model: still three numbers, still pure, still nothing reachable from the
  source.
- Glow radius and alpha are now coupled constants rather than free ones. Anyone widening one has
  to brighten the other or the encoder will show the seams.
