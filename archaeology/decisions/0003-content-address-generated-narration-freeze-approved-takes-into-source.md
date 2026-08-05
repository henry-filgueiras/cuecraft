---
id: dec_01KZA2RZHWHEF1F5STYDR3FHHZ
sequence: 3
kind: decision
status: accepted
created: 2026-08-05
---

# Content-address generated narration; freeze approved takes into source

## Context

Narration is produced by a paid, hosted, non-deterministic service. Two properties follow:

1. Re-rendering an unchanged presentation must not re-bill or re-synthesize.
2. A specific approved take has value. Providers retire models and revise voices; a deck that
   sounded right in March may sound different in September. "Regenerate from source" is not
   always the semantics you want for an already-published talk.

Treating TTS output as disposable build-directory sludge loses both properties.

## Decision

Generated narration lives in two tiers with different lifecycles.

**1. Cache.** Content-addressed by the full set of inputs that determine the audio: provider,
model, voice, speech/delivery instructions, narration text, and output format. Any change to
any input yields a new address; unchanged narration reuses its cached audio. The cache lives
in a git-ignored directory and is always safe to delete.

**2. Frozen assets.** Narration deliberately promoted into repository-managed source. A future
`cuecraft freeze presentation.yaml` promotes selected generated narration into durable assets
committed alongside the YAML. A frozen presentation renders identically regardless of provider
drift.

Frozen assets are source. Cache is a projection. The compiler must never silently blur the two.

## Consequences

- Cache key derivation must be explicit and stable. Ad-hoc key construction is a correctness
  bug, not a performance detail.
- Narration resolution follows a defined order: frozen asset, else cache, else synthesize.
- `freeze` is not in v0 (decision:2), but the cache key must be designed now so that freezing
  later is a promotion rather than a rewrite.
- Putting audio under version control raises open questions about size, provenance, and review
  (dragon:2).
