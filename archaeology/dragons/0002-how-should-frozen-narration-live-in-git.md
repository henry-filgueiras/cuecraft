---
id: drg_01KZA2RZJSZX225TTJ2RKE67BG
sequence: 2
kind: dragon
status: open
created: 2026-08-05
---

# How should frozen narration live in Git?

## Context

Freezing promotes generated audio into repository-managed source assets (decision:3) so that an
approved performance survives provider drift. That deliberately puts binary audio into a
plaintext-forward repository.

## Question

What are the storage, provenance, and review models for frozen narration assets?

## Constraints

- Audio is binary and not diffable. Git review cannot show what changed within a take, so review
  has to happen against something else — the source text and the synthesis inputs.
- A deck's narration is on the order of megabytes: small enough that Git LFS may be unnecessary
  ceremony, large enough that careless re-freezing bloats history permanently.
- A frozen asset must be traceable to the source text and synthesis inputs that produced it, or
  its provenance is lost and its authority becomes unclear.
- Editing `say` text after freezing creates a mismatch: the source says one thing, the approved
  audio says another. The compiler must detect this rather than silently rendering stale audio.

## Candidate direction

Store frozen audio under a source-controlled assets directory alongside a sidecar manifest
recording the cache-key inputs per asset — provider, model, voice, instructions, text hash,
format. Renders compare current inputs against the manifest and fail loudly on mismatch, with an
explicit re-freeze as the remedy. Defer LFS until a real repository demonstrates it is needed.

## Resolution criteria

Resolved when `freeze` exists, a frozen deck renders with zero provider calls, an edited `say`
produces a clear staleness error rather than stale audio, and the manifest format is documented.
