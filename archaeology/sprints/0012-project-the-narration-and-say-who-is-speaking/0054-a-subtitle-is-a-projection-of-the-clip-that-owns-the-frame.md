---
id: tsk_01KZHJ5J3TCA7YDT09CDKC14WF
sequence: 54
kind: task
status: closed
sprint: spr_01KZHJ3XFBSNP18B8VHNSZRCTC
created: 2026-08-08
closed: 2026-08-08
---

# A subtitle is a projection of the clip that owns the frame

## Objective

Derive, as a pure function over the already-final timeline, the answer to "which utterance owns this
frame, who said it, and how is that identity distinguished". No new clock, no scheduler, no state.

The input is the compiled presentation and the placed scenes; the output is an ordered track of cues
each carrying text, an optional narrator *name*, and a frame interval. Selection at a frame is a
lookup in that track.

## Acceptance criteria

- A `subtitleTrack(...)` that takes what `buildTimeline` already has and returns cues in playback
  order. Every cue's `from` is exactly the frame the compiler placed its clip at — not recomputed
  from seconds, not offset by a constant, not adjusted for onset.
- A cue's visibility ends at the next clip in the same scene, and otherwise at the end of that
  scene's narration. A subtitle never survives into `post_say`, never crosses a slide boundary, and
  never appears during `pre_say` before anything has been said.
- Bridging an authored `pause:` is deliberate and tested: a pause between two clips holds the
  preceding subtitle rather than blinking.
- `subtitleAt(track, frame)` returns the cue whose interval contains the frame, or nothing. Boundary
  frames are tested on both sides.
- The narrator carried is the **declared name** from the cue. A deck with no cast produces cues with
  no narrator, and nothing in this module can reach a provider voice string — assert it, because
  `SpeechClip.voice` is right there.
- Whether labels are shown is derived deck-wide from whether the track contains more than one
  declared narrator, and is all-or-nothing (decision:37).
- A colour per narrator, assigned deterministically from declaration order out of a palette
  cuecraft already owns, stable across renders of the same deck, and tested as stable.
- Tests are pure: no browser, no Remotion, no model.
