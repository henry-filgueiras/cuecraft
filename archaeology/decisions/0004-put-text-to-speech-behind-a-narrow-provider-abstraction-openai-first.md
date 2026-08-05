---
id: dec_01KZA2RZJ0VQQPS6D51RDX4GET
sequence: 4
kind: decision
status: accepted
created: 2026-08-05
---

# Put text-to-speech behind a narrow provider abstraction, OpenAI first

## Context

OpenAI TTS is the fastest path to acceptable narration today. It will not obviously be the best
option indefinitely: providers differ in voice quality, latency, price, delivery control, and
licensing terms for synthesized speech.

Wiring one vendor's SDK shape through the pipeline would turn a provider switch into a refactor
of the whole compiler.

## Decision

All speech synthesis goes through one small internal interface: given narration text, a voice,
delivery instructions, and an output format, return audio bytes and their measured duration.

OpenAI is the first and only implementation in v0. The abstraction stays deliberately narrow —
it exists to keep vendor types out of the compiler, not to model the union of every provider's
capabilities.

Provider, model, and voice are named in the presentation source or its defaults, and participate
in the cache key (decision:3).

## Consequences

- Adding a provider means implementing one interface, not touching the render path.
- Capabilities that do not fit the interface are passed through as opaque provider instructions
  rather than normalized into a common vocabulary (decision:6).
- Duration measurement belongs behind the interface. Timing depends on it (decision:1) and
  providers do not reliably report it — measure the returned audio rather than trusting metadata.
- Deliberately not built yet: retry/rate-limit policy, streaming synthesis, multi-provider
  fallback. Add each when a real failure demands it.
- API credentials come from the environment and are never read from or written to the
  presentation source.
