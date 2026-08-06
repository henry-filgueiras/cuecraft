---
id: dec_01KZC5V2M06E5Q0GE3RGXFZRY4
sequence: 13
kind: decision
status: accepted
created: 2026-08-06
---

# Take fragment boundaries as the clock, and measure the onset

## Context

Before designing anything that lines a visual up with a spoken word, the question is what timing
information the machinery already in use can actually produce. The answer was read off the model
rather than assumed.

The ONNX graph has one output:

    session model  inputs: [ input_ids, style, speed ]  outputs: [ waveform ]

That is the whole of it. StyleTTS2 predicts a duration per phoneme internally — that is how it
knows how long to make the audio — but the exported graph does not surface it. There is no
`durations` tensor, no alignment matrix, no attention map. kokoro-js reads `waveform` because
`waveform` is all there is.

Nor is anything reconstructible around it. `generate()` returns samples and a sample rate.
`stream()` yields `{text, phonemes, audio}` per sentence — the phonemes are the input string, not
a timed sequence. The tokenizer is a plain text-to-id map with no offsets.

So the timing available from the existing stack is exactly one thing: **the duration of a
synthesis call, measured from the samples it returned.** Nothing finer exists, and getting finer
means adding a forced aligner — a second model, a second set of weights, and a second thing that
can be wrong — to a project whose narration is otherwise one 82M-parameter graph.

One thing *is* recoverable from the samples, and it matters. Kokoro puts silence in front of every
utterance before the first phoneme sounds. Measured across nine clips it ranged from 292ms to
339ms, and trailing silence from 428ms to 470ms. At 30fps that leading silence is nine frames — so
"when the clip starts" and "when the words start" are visibly different events.

## Decision

**Fragment boundaries are cuecraft's clock, and they are exact.**

decision:11 already made narration an ordered list of separately synthesized cues, each measured.
That gives a boundary wherever the author put one, known to the sample. It is coarse — the finest
unit is a phrase, not a word — but it is *true*, which an estimate from character counts or an
average speaking rate would not be.

Nothing in cuecraft may estimate a time from text. If an author wants a finer boundary, they split
a cue; that is a real mechanism with a real cost (a cue boundary is audible, see decision:11) and
it is the only one on offer.

**Onset is measured, not assumed.** `synthesize()` returns `leadingSilenceSeconds`, found by
scanning for the first sample above two percent of the clip's own peak. That is measurement of
samples cuecraft already holds — no sample is altered and nothing is written differently, so it
stays on the right side of decision:5's line about not doing audio processing here.

The threshold is relative because Kokoro's output level varies by about a factor of two between
utterances; an absolute floor reports different onsets for the same words at different levels.

## Consequences

- Synchronization granularity is the phrase. Highlighting a word as it is spoken is not possible
  and will not become possible by trying harder — it needs alignment machinery this project has
  declined to add.
- Activation lands on the sound rather than on the clip. Measured against the rendered MP4, the
  four anchors in the canonical deck fire at 25.35s, 27.65s, 29.55s and 31.15s against derived
  frames of 25.33s, 27.63s, 29.57s and 31.13s — inside one 50ms measurement window in every case.
  Without the onset correction each would have been nine frames early, which is exactly the
  premature activation that makes this kind of effect look mechanical.
- The leading-silence figure is now measured per clip rather than quoted as an average, which also
  gives dragon:3's "pauses are additive" note a real number instead of a rule of thumb.
- If a remote provider is ever added behind decision:4's interface, several return word timings.
  The seam that would use them is the anchor's `frame`, which is computed in one place.
