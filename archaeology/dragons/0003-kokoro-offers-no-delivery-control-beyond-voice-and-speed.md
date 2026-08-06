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
- `style` — a 256-float voice tensor, selected by name from 28 English voices
- `speed` — one float scaling predicted phoneme durations

That is the whole surface. There is no instruction string, no SSML, no emphasis marker, no pause
primitive, no pitch or energy control. Punctuation influences prosody only indirectly, by way of
the phonemes eSpeak NG produces for it.

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
