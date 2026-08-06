---
id: drg_01KZA6T628C8WHAQR6MV4MM5GJ
sequence: 3
kind: dragon
status: open
created: 2026-08-05
---

# Kokoro offers no delivery control beyond voice and speed

## Context

decision:6 decided that delivery — emphasis, pacing, pauses, intonation — would be expressed as
plain-language instruction strings passed through to whatever provider is in use, rather than as
a cuecraft-specific markup dialect. That was sound reasoning built on an assumption: that the
provider would accept delivery instructions at all.

Kokoro does not. Reading the model's actual ONNX inputs rather than anyone's description of them,
the entire control surface is three tensors:

- `input_ids` — the phonemized text
- `style` — a 256-float tensor, selected by voice name **and by token count**
- `speed` — one float scaling predicted phoneme durations

That is the whole surface. There is no instruction string, no SSML, no emphasis marker, no pause
primitive, no pitch or energy control. Punctuation influences prosody only indirectly, by way of
the phonemes eSpeak NG produces for it.

**Correction, sprint 3.** The `style` description above was originally written as "a 256-float
voice tensor, selected by name", and so was decision:8's pipeline diagram. That is wrong.
`af_heart.bin` is 522,240 bytes — 510 x 256 x 4 — and kokoro-js slices it by utterance length:

    const offset = 256 * Math.min(Math.max(tokenCount - 2, 0), 509);

Each voice is a *table* of 510 style vectors, one per token count. How long an utterance is
changes which prosody embedding produces it. Measured, the rate difference between a 68-token and
a 132-token utterance is small (the same sentence occupies 3.64s alone and 3.68s inside a longer
call), so this is not a large lever — but it is a real one, and it means splitting an utterance is
not merely a way of inserting silence.

Two further limits surfaced while building the seam:

- **Silent truncation.** The tokenizer truncates at 512 tokens without raising or warning. English
  prose runs about 1.09 tokens per character and text with numbers expands further once
  normalized. For a narration compiler, silently dropping the end of a sentence is a serious
  failure mode. `synthesize()` currently refuses text over 420 characters rather than risk it.
- **No cross-utterance continuity.** Each `generate()` call is independent. Splitting narration
  into chunks and concatenating them is the obvious way past both the token ceiling and the
  absence of pauses, but nothing carries prosodic state across the boundary, so joins may be
  audible.

Since sprint 2 the source format makes this visible rather than merely true. `defaults.instructions`
is still accepted — decision:6 put it in the format and a remote provider may yet honour it — but
`cuecraft render` now prints a warning saying it has no effect and pointing here. Valid source that
does nothing is worse than invalid source, and a warning is the smallest honest answer short of
resolving this dragon. `defaults.voice` and `defaults.speed` are authorable, which is the whole of
Kokoro's control surface exposed exactly once, deck-wide.

The 420-character guard has not yet constrained anything: the canonical example's longest `say` is
126 characters and synthesizes in about a second. The ceiling is waiting for a real deck, not for a
decision.

**Advanced, not resolved, by decision:11.** `say` now takes an ordered list of speech cues and
explicit pauses, each cue synthesized separately and placed on the Remotion timeline. That
delivers the chunking and the pauses this dragon's candidate direction proposed, and the reworked
canonical deck sounds materially more deliberate for it.

What that leaves:

- **Pauses are additive, not absolute.** Every Kokoro clip carries roughly 300ms of leading and
  470ms of trailing silence, so two cues already sit ~780ms apart before any authored pause. The
  authored number is silence *added between clips*. Trimming the edges would mean processing audio
  here, which decision:5 forbids; measuring them and reporting the true gap is possible and has not
  been done.
- **Joins have not been evaluated as joins.** decision:11's cues are separated by deliberate
  silence, which is the easy case. Concatenating two fragments of a single sentence with no gap —
  the case this dragon actually poses — is still untested, and nothing carries prosodic state
  across the boundary.
- **The 420-character guard is untouched.** Cue text is checked individually, which makes the
  ceiling easier to live with and no less arbitrary. Narration that must be one continuous
  utterance longer than a window still has no answer.
- **Emphasis and intonation still have none.** No candidate exists under Kokoro. decision:11
  deliberately shipped nothing for them rather than shipping controls the model ignores.

**Two more limits, found in sprint 4.**

- **Heteronyms are decided before Kokoro sees anything.** eSpeak resolves `records` to the verb
  after a pronoun or a relativizer and to the noun after any noun phrase, so "WitnessGlass records
  the work" is spoken as the plural noun. This is not a prosody problem and no Kokoro input
  touches it — the wrong phonemes arrive already wrong. decision:12 repairs an occurrence by
  respelling, which is the only mechanism the installed stack leaves reachable: eSpeak's `[[...]]`
  phoneme escape is spelled out character by character, the `phonemizer` package exposes no
  options at all, and `generate_from_ids` — which *is* public and does accept phonemes — has no
  supported way to obtain the rest of the utterance's phoneme string.
- **The edge silences now have numbers.** Measured across nine clips, leading silence ranges
  292-339ms and trailing 428-470ms. The "~780ms between cues before you author anything" figure
  above is confirmed, and decision:13 measures it per clip rather than assuming it.

## Question

How does cuecraft express narration that is longer than one Kokoro window, or that needs a pause,
an emphasis, or a shift in delivery — without inventing the markup dialect decision:6 rejected?

## Constraints

- decision:6's core argument still holds: a bespoke prosody dialect committed early tends to
  outlive its usefulness and become the format's most permanent feature. Kokoro's poverty is not
  by itself sufficient reason to build one.
- Whatever emerges must not assume Kokoro. A remote provider behind decision:4's interface may
  offer rich instruction strings, and the source format should not encode one model's limits.
- decision:6 already reserved room for `say` to accept an ordered sequence of narration fragments
  and explicit pauses instead of a single string, and was explicit that this should be additive
  rather than a breaking change. That reservation now looks less like foresight about authoring
  ergonomics and more like the mechanism this problem needs.
- Timing depends on measured audio duration (dragon:1). Any chunking scheme must produce a total
  duration that is measured, not summed from estimates.
- Silence between chunks is an audio concatenation problem, and decision:5 says those belong to
  ffmpeg, not to code written here.

## Candidate direction

Treat the fragment sequence decision:6 reserved as the answer to all three problems at once: a
`say` block that is a list of prose fragments and explicit pauses gives chunking (each fragment
fits a window), pauses (a duration between fragments, rendered as silence by ffmpeg), and a
natural unit for per-fragment voice or speed — without any inline markup inside the prose itself.

Emphasis and intonation have no candidate under Kokoro and would have to wait for a provider that
supports them, or be deliberately abandoned for local synthesis.

`kokoro-js` ships a sentence splitter and a streaming API that already chunks internally. It is
worth establishing whether its boundaries are good enough to adopt before writing another.

## Resolution criteria

Resolved when a presentation with narration exceeding one Kokoro window renders with correct
total timing and no audible defect at the joins, and when the mechanism that achieves it is
recorded as a decision that either extends or supersedes decision:6.

Explicitly not resolved by raising the 420-character guard.
