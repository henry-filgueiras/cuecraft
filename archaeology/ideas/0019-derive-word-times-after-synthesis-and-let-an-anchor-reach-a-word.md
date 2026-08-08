---
id: ide_01KZHKCCA9H9M0EPJGW9YEP2HR
sequence: 19
kind: idea
status: parked
created: 2026-08-08
---

# Derive word times after synthesis, and let an anchor reach a word

## Problem

decision:40 shows a whole utterance for the whole of its clip, because that is the honest limit of
what cuecraft measured. It knows when a clip starts and how long it lasts; it does not know when a
*word* starts, and `clip duration / word count` is a guess wearing the costume of a measurement —
speech is not uniform across words, punctuation, pauses or phonemes.

The thing that would make word timing real is a forced aligner: a known transcript plus the
synthesized WAV, in, and word spans out.

## Sketch

The seam already exists, and it is not the synthesis seam — it is the *measurement* that happens
after it. `tts/kokoro.ts` already reads the samples back and reports `leadingSilence`, which is
decision:13's onset: a physical fact about a file, derived after the fact, never estimated. A word
table is the same kind of fact from the same input.

```
synthesize -> WAV + text  ->  leadingSilence          today
                          ->  word spans              an aligner, one day
```

That would put an optional `words?: readonly { text, from, to }[]` on `SpeechClip`, placed onto
frames by `buildTimeline` exactly as `Anchor` and `Span` already are, and frozen at the same
boundary. Two things could then read it, and the second is the interesting one:

- **Word-level subtitles.** `subtitleAt` would gain a within-cue index and the rest of
  `render/subtitles.tsx` would not change. This is the small prize.
- **An anchor that reaches a word.** `activates:` resolves to a clip's onset today, so a sentence
  that names three things lights all three at its first syllable. With word times it could light
  each as it is said, which is the same feature idea:15 wants inside a line of a specimen, arriving
  from the other side.

## Boundaries

- **An aligner is a dependency and a model.** decision:8 put one 325MB model in this repository
  deliberately and decision:5 says delegate rather than build. Whether a second inference artifact
  is worth word timing is the whole question, and it is not answered by wanting the feature.
- **Nothing may change what is spoken or when.** A word table is a projection of an existing clip;
  if aligning ever became a step that could alter a duration, the acyclicity argument in
  `compile/facts.ts` would have to be re-made rather than inherited.
- **Not uniform division, under any circumstances.** If an aligner is unavailable the answer is the
  whole-cue subtitle cuecraft already has, not a plausible-looking approximation of one it does not.

## Evidence

What would unpark it: a film where whole-cue display is measurably the thing making it harder to
follow — long cues, dense visuals, a viewer losing track of which clause goes with which element —
rather than the observation that word timing would be nice. `examples/onscreen.yaml` and
`examples/aside.yaml` do not make that case; their cues are one or two sentences and the whole cue
is on screen for the whole time it takes to say.
