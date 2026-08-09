---
id: spr_01KZHY6QMS7W4P3442GSSA9X8D
sequence: 15
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
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

## Outcome

Every success criterion met, and the round's strongest evidence turned out to be an assertion nobody
had planned to be able to make.

`examples/retry.yaml` is 1:05 of two people disagreeing about a duplicate charge, settled when one of
them plays the other's Saturday sentence back at her. Rendered at full size and watched. The film
cuts from slide 3 to slide 1 at 00:49.3, replays 7.1s from 00:08.9, and cuts back to a subtitle-free
900ms before Priya answers. Across that boundary: Dev's original words and Dev's label on the
subtitle, the `settlement` bullet lighting up again at the moment it lit up the first time, and the
progress rule retreating to a third and returning.

### The claim as pixels, rather than as a description

The intended acceptance was a human watching for whether the recalled slide "follows the same visual
evolution". It turned out to be checkable exactly:

    still at frame 255  (during the original sentence)
    still at frame 1440 (during the replay of it)      byte-identical PNGs

Two frames of one film, rendered independently through the real browser from different points in the
composition. Anchor states, entrance motion, subtitle and progress rule all included. If the
sequence-local frame, the absolute frame, or the offset undoing the original nesting were wrong by
anything at all, they would differ. That is now `pipeline.render-test.ts`.

Sample-exact audio comparison on the finished MP4 agrees: aligned to the compiled frames, the replay
differs from the original by −41.6 dBFS against a −24.4 dBFS signal, at a 7-sample offset that is
AAC framing. Four WAVs on disk for five utterances heard.

### What the round did not have to build

Nothing about the serial track needed changing. A recall walks the same cursor as speech, pauses,
dwells and calls, and the "one serialized audible stream" property fell out rather than being
defended — which was the round's actual question about whether the existing model had room for a
fourth kind of occupant. It did.

Nor was cycle detection built. Backwards-only, `activates`-only, root-only resolution leaves no edge
that could close a loop, so the restriction *is* the safety argument.

### The regression evidence, since a new field touches every scene

All fourteen shipped decks compiled on `8eba029` and on this branch with a deterministic stand-in
narrator, and the two timelines are identical field for field apart from an empty `recalls: []` on
every scene. Run as a before/after over a git worktree rather than promised.

### Two things that moved that were not on the list

- **`buildTimeline` lays scenes out in an explicit loop now.** A recall needs the absolute frame of a
  clip on an *earlier* scene, so scene order stopped being incidental. Better stated than left as a
  `map` whose callback quietly depended on an array being filled in.
- **`SubtitleCue.ordinal` stopped being one-to-one with `ClipFact`.** It numbers what is heard, and a
  recalled sentence is heard twice. The old doc comment claimed the correspondence; it says otherwise
  now, because the alternative was a count that disagreed with the film.

### Where it stopped

Exactly where it aimed. Cross-deck recall, external recordings, trimming, playback rate and every
form of visual treatment were refused and remain refused. Handover timing was not touched: the round
proved the film can put two people's audio next to each other with a hard boundary, and says nothing
about whether they could overlap. dragon:24 records that, including the observation that the cheap
lever — shortening the gap while keeping the track serial — has never been measured, let alone tried.
