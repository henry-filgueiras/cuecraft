---
id: dec_01KZA2RZJ8NHF9D2QDS5P6MNZC
sequence: 6
kind: decision
status: accepted
created: 2026-08-05
---

# Express delivery through provider speech instructions, not a bespoke prosody language

## Context

We eventually want real control over narration delivery: emphasis, pacing, pauses, intonation,
style. The obvious move is to invent a markup — an SSML-like dialect embedded in `say` text —
and translate it per provider.

That is a large, load-bearing design committed during bootstrap, before we know which controls
matter in practice or which providers honor them. A bespoke dialect that outlives its usefulness
is expensive to remove and tends to become the format's most permanent feature.

## Decision

Delivery is controlled by passing provider-supported speech/delivery instructions through
cleanly: plain-language instruction strings settable in `defaults` and overridable per `say`.
No cuecraft-specific prosody markup during bootstrap or v0.

Narration text stays plain prose. Room is explicitly reserved for a later structured form — an
ordered list of narration fragments and explicit pauses in place of a single text blob — without
committing to it now.

## Consequences

- Delivery control is exactly as good as the provider's, and varies by provider. That is an
  honest tradeoff, not a gap to paper over with a translation layer.
- Instructions are part of the cache key (decision:3): changing delivery invalidates the audio,
  as it should.
- `say` should be parsed so that accepting a structured form later is additive — a scalar string
  today, a sequence of fragments tomorrow — rather than a breaking format change.
- If provider instructions prove insufficient, revisit with a new decision rather than growing a
  dialect by accretion.
