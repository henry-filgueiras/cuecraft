---
id: spr_01KZHY6QMS7W4P3442GSSA9X8D
sequence: 15
kind: sprint
status: active
created: 2026-08-08
---

# Let the narration quote itself

## Goal

Let a narration cue replay one earlier, semantically anchored speech cue — its picture, its audio,
its subtitle and its measured duration — and then cut back to the slide it left.

    - speech: "We saw this fail once already."
    - recall: settlement
    - pause: 700ms
    - speech: "That was the first charge."

`recall: settlement` names the one earlier speech cue that wrote `activates: settlement`. The film
cuts to that slide, replays the original WAV whole, renders the earlier slide frame-for-frame over
the source interval, and hard-cuts back to the current slide for the next authored cue.

Nothing is synthesized twice, nothing is trimmed, nothing overlaps, and no new clock is introduced.

## Rationale

cuecraft already has one thing a narration can do besides speak and be silent: `enter:` hands the
stream to a callee and gets it back when the callee runs out (decision:31, sprint:6). That is a call
stack, and it is the semantic precedent this round wants — the callee monopolizes the stream,
completion returns.

What it is not is the *mechanism*. An `enter:` descends into a world, moves a camera through a
threshold that costs `ENTER_MS`, and speaks new audio in a new scope. A recall does none of those
things: there is no world, no scope, no camera descent, and above all no synthesis. Forcing it into
`NarrationCall` would make the compiled timeline claim three things that are false.

So the round is a test of whether the existing model has room for a *second* kind of non-speaking
occupant on the narration track — one whose duration is neither authored nor derived but **borrowed
from a measurement already taken**. If it does, the timeline stays one serialized audible stream and
gains a genuinely new sentence. If it does not, that is worth finding out before anything larger
(cross-deck recall, external recordings) is contemplated.

The anchor is the interesting half. `activates:` already asserts that a moment in the narration and
an element on a slide are the same idea (decision:14). This round reads that assertion *backwards*:
if the author has already named the moment, they should not have to name it a second time to point
at it. There is no timecode in the source format and this does not add one.

## Success criteria

- `recall: <id>` parses strictly: one key, an `ANCHOR_ID`, no narrator, no `activates`, no `fills`,
  no timing, nothing else. A recall-only `say` is valid; a pause-only `say` is still not.
- Resolution is backwards-only and unique. Missing, ambiguous, same-slide, forward, non-root and
  non-`activates` targets are compile errors, and the ambiguous one names the candidate slides.
- The compiled timeline represents recall explicitly: a record with a frame, a measured duration,
  the source clip's `src`, and the source frame the replay starts from. The renderer may not extend
  or infer any of it.
- **Zero additional synthesis calls.** Asserted by counting calls into the seam, not by inspection.
- Source start is the original `Clip.from`, not `Anchor.frame`: the measured leading silence replays
  with the sentence.
- `sourceFrame = sourceClip.from + (frame - recall.from)`, exactly, for every frame of the replay.
- `totalFrames` includes every recall occurrence, through the one seconds-to-frames rule.
- With subtitles on: the preceding live cue ends where the recall begins; the recalled cue shows the
  original authored text and the original narrator for exactly the recall's frames; a pause after the
  recall is silent; the next live cue begins with its own clip.
- A deck with no `recall` compiles to a field-identical timeline. No new uniqueness restriction on
  `activates` ids anywhere.
- A two-narrator specimen is built, rendered at full size, and watched.
- `npm run check` and `scarp doctor` pass.

## Non-goals

- **Cross-deck recall, `path#anchor`, presentation imports.** Intra-deck first; the dependency and
  cache questions that a second file raises are a different round.
- **Local video, audio or image assets, `play:`, `focus:`.** A recall replays something cuecraft
  *derived*. An external recording is evidence cuecraft could not derive, and that is a distinct
  feature with a distinct argument.
- **Named segments, `from`, `until`, trimming, playback rate.** Whole clip, once, at rate 1. Any of
  these is a timecode in the source format by another name.
- **Recall transitions, freeze frames, flashback chrome.** Hard cut in, hard cut out. The recalled
  slide's ordinary progress rule retreats and returns, and that is the whole of the signal.
- **Same-slide recall, nested-module recall, recalls of recalls.** The resolution rules make cycles
  unreachable without building cycle detection for a graph that cannot yet have one.
- **Handover timing, interruption, overlap, one clock per narrator.** One serialized audible stream
  is preserved unchanged. If the deck raises the question, record it as a dragon and leave it.
- **Content-addressed narration caching.** decision:3's cache is still parked (idea:8). Reusing a
  clip within one compilation is not the cache and must not be mistaken for it.
- **Static media, branding, watermark, outro.**
