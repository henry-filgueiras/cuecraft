---
id: dec_01KZHZ9C61G261DSJB6T8K8JPW
sequence: 43
kind: decision
status: accepted
created: 2026-08-08
---

# Let the narration quote itself, and let the picture come back with it

## Context

cuecraft has had one way for narration to hand off since sprint:6: `enter:` gives the stream to a
child module and takes it back when the child's cue list runs out (decision:31). That is a call
stack, and the semantics have held up — the callee monopolizes the stream, completion returns.

What a deck could not do was quote *itself*. A film that establishes something on slide 1 and
contradicts a summary of it on slide 3 has to either re-record the sentence, which makes it a
different take by a voice that has changed its mind, or ask the viewer to remember. Both are worse
than the thing every documentary does: play the tape back.

The material for it was already there and unused. `activates:` asserts that a moment in the
narration and an element on a slide are the same idea (decision:14), and the compiler resolves that
to a frame from measured audio. Read backwards, an anchor is a *name for a moment* — and naming a
moment is exactly what a recall needs. The alternative spellings all require the author to write
down a number: a timecode, a clip index, a slide-and-ordinal pair. Every one of those is a
timestamp in a format whose central claim is that it has none.

## Decision

**A narration cue may replay one earlier, semantically anchored speech cue.**

```yaml
- speech: "We saw this fail once already."
- recall: settlement
- pause: 700ms
- speech: "That was the first charge."
```

**It is its own cue kind, not a `NarrationCall`.** A descent means three things a recall does not:
a scope is entered, a camera crosses a threshold that costs `ENTER_MS`, and new speech is
synthesized. Reusing the call record would make the compiled timeline assert all three falsely. What
recall borrows from `enter:` is the *semantics* — callee owns the stream, completion returns — and
nothing else. The precedent is the argument; it is not the mechanism.

**It carries no duration of its own.** Every other occupant of the narration track has one by the
time it is a cue: authored for a `pause`, fixed for a threshold, derived for a `dwell`. A recall's
is **borrowed** — the source clip's complete measured seconds, read again — so the cue has no field
for it, and the compiled `Recall` gets it from the clip rather than from anything an author or a
renderer could supply. It is the fourth kind of occupant of the one serial track and the first whose
length was measured for something else.

**One serialized audible stream is preserved, unchanged.** A recall occupies the same cursor as
speech, pauses, dwells and calls, and is placed by the same `framesFor`. Live narration cannot
overlap a replay because there is nowhere for it to overlap: the track is serial by construction,
which is what sprint:6 already established and what this round deliberately did not touch.

**It replays from `Clip.from`, never from `Anchor.frame`.** Those differ by the measured leading
silence — about nine frames of Kokoro's onset. An anchor marks where the *sound* starts, which is
the right place to light an element up (decision:13); a clip marks where the *utterance* starts,
which is the right place to begin playing it. Starting at the anchor would clip the front off every
recalled sentence and put the picture ahead of its own audio.

**The picture is the earlier slide, mapped frame for frame.**

    sourceFrame = recall.sourceFrom + (frame - recall.from)

and the sequence-local frame is offset so that every entrance animation reads what it read the first
time. Hard cut in, hard cut out. No crossfade, no vignette, no "earlier" caption: the signal that
this is the past is the picture itself and the progress rule stepping back to a slide already seen.
decision:24's rule that the camera earns its moves, applied to a move nobody asked for.

> **The last two sentences of that paragraph are superseded by decision:44.** Rendered at full size,
> a full-bleed hard cut between two native cuecraft slides reads as ordinary progression: the
> retreating progress rule is five pixels at the bottom edge and cannot carry the claim on its own.
> A recall is now drawn as a quotation card. Everything else on this page stands — what is retracted
> is the belief that a frame identical to its source could say that it *is* a quotation.

**Resolution is backwards-only and unique**, against an earlier slide's *root-scoped* `activates`.
Forward is a spoiler with a cut in it; same-slide would not change the picture and would read as a
stutter; two candidates would make one word mean two things, and "first wins" is the wrong default
for a reference that crosses a slide boundary in a deck that grows at the end. A module's anchor is
not recallable and a module may not recall, because a module is written without knowing where it is
mounted (`scope.ts`). A `fills` is not recallable: a span is an interval and a replay is one whole
utterance.

Together those make a cycle unreachable. A recall points only backwards, only at a speech cue, and a
speech cue is never a recall — there is no edge that could close a loop, so no cycle detection was
built for a graph that cannot have one.

**Recall is time-bearing narration.** A `say` of nothing but a recall is valid: that slide has a
clock, sound, and a subtitle. A `say` of nothing but pauses is still refused, because it has none.

**The subtitle says what was said then, and stops when the replay stops.** The original authored
text and the original narrator's name — relabelling a quoted sentence would contradict the audio
under it. And it is the one cue in the format that does not bridge to its successor: the silence
after a replay is not a breath, it is the cut back, and the slide underneath the text has changed.
The live cue before a recall ends where the recall begins for the same reason.

## Consequences

- **Nothing is synthesized twice.** Three sentences written, three WAVs on disk, four heard. This is
  not decision:3's content-addressed cache and must not be mistaken for it: a cache notices that two
  *different* cues happen to say the same words, and idea:8 is still parked. This is one cue naming
  another, by identity, in the source.
- **The replayed frames are the frames they replay.** Rendered independently through the real
  browser, from different points in the composition, a recalled frame and its source frame come out
  **byte-identical** — anchor states, entrance motion, subtitle and retreated progress rule
  included. That is asserted in `pipeline.render-test.ts` rather than described.
- **Every deck that never recalls is untouched.** All fourteen shipped examples compile to
  field-identical timelines, differing only by an empty `recalls: []` on each scene. No new
  uniqueness restriction lands on `activates:` anywhere: two slides may anchor `check` forever, and
  only a cue that actually names `check` makes that a question.
- **`SubtitleCue.ordinal` is no longer one-to-one with `ClipFact`.** It numbers what is *heard*, and
  a recalled sentence is genuinely heard twice. Numbering it once would make the count disagree with
  the film.
- **`buildTimeline` lays scenes out in an explicit loop.** A recall needs the absolute frame of a
  clip on an earlier scene, so scene order became load-bearing rather than incidental — which is
  safer stated than left as a `map` whose callback quietly depended on an array being filled in.
- **The compiled timeline says what a recall is.** A `Recall` record with a frame, a borrowed
  duration, a source frame and a `src`, reported by `cuecraft render` with both timecodes. The
  renderer may not extend or infer any of it (decision:9).
- **Speaker handover is unchanged and now visibly a question.** A recall proves the film can put two
  people's audio next to each other with a hard boundary; it says nothing about whether they could
  ever overlap. Recorded as dragon:24 rather than answered.
