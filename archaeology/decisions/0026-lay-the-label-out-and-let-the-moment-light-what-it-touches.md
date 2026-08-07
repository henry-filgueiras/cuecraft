---
id: dec_01KZCSNRQ02CADP9JCG5RW68B4
sequence: 26
kind: decision
status: accepted
created: 2026-08-06
---

# Lay the label out, and let the moment light what it touches

## Context

decision:23 recalibrated activation for the atlas and left the finding in one composition. Two
things then showed up in v2 that the first pass had not.

The first is about **typography, not state**. v1 wrapped an entity's label greedily at a fixed
twelve characters, and "What narration can reach" came out as `What / narration / can reach` —
three lines, the longest of them nine characters, in a plate stuck at the minimum width. Every
plate in the world was the right size and the wrong shape. Nothing was cramped because the plates
were small; they were cramped because the text was being *survived* rather than laid out.

The second is that **hot was still local**. A plate lit up and the wires into it did not, so the
moment read as a bright box rather than as a connected thing becoming relevant.

## Decision

**A label is laid out, not filled. A moment lights everything it touches.**

**Typography.** `wrapLabel` now *chooses* its break. For one, two and three lines it computes the
balanced break — the smallest maximum line length achievable in that many lines, found by search
because the answer is exact — and keeps whichever produces the plate closest to 2.3:1, with a
small penalty per extra line so a second line has to earn itself. "What narration can reach"
becomes `What narration / can reach`; "Narration cues", "Derived timing" and "One video file"
become single lines they never got before. Padding went up and the minimum width went up with it.

Nothing about any label changed to achieve that. The scoring is over candidate *breaks* of the
author's own words, which is the difference between laying text out and asking for shorter text.

**Edge illumination.** A relation's brightness and weight now take the maximum heat of its two
endpoints, so the wires into and out of the concept being spoken about light with it. One `max`,
and the edge already knew both of its endpoints' states.

**Attenuation went to 0.55**, from 0.5. Surrounding attenuation remains the single most effective
device on the frame, and it survived being pushed.

**The deck title is now derived rather than placed.** It fades in proportion to how much of the
world is on screen: full on the establishing shot and on the reveal, absent on every close shot in
between, gone entirely inside a concept. This fixes the one thing v1 never solved — a caption
fixed to the frame while the world moves underneath it collides with whatever happens to be
behind it, and no position avoids that. Tying it to the camera answers the question better than a
keyframe would, and it says something true: the title names the *world*, so it belongs on the
shots that show one.

**`WORLD_TIMING.heatHold` went from 30 frames to 42.** Coming out of an interior is a retreat, a
beat, and then a traversal, and the concept the narration has moved to ignites at the start of all
three. The plateau has to outlast the longest journey the camera can be on when a word lands.

## Consequences

- Better wrapping makes plates wider, which makes the world wider, which makes the reveal
  smaller. `ranksep` came down to 90 and the reveal's padding to 3.5% to pay for it; labels at the
  wide shot are about 22px, marginally better than v1's 20.7 *and* two lines instead of three.
  That trade — spend width on typography, buy it back on spacing — is the whole tuning.
- `plateAspect`, `linePenalty` and `maxLines` are three more calibrated constants. They are
  scoring weights, which is exactly the "scoring function" decision:10 warned about, and the
  defence is that they score three candidates rather than search a space.
- Established is still the visual baseline and future is still the only attenuated state. Nothing
  in v2 argued against decision:23's central finding; it argued that the finding was incomplete.
- The recalibration is *still* scoped to the atlas. The other seven archetypes read the three
  states the old way, and idea:16 still records propagating it as the follow-up.
