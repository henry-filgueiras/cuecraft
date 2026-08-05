---
id: dec_01KZA2RZJ45JJGMZNDWQJ7077C
sequence: 5
kind: decision
status: accepted
created: 2026-08-05
---

# Render with Remotion and delegate media primitives to mature libraries

## Context

Slides are layout and typography. The web platform already solves both well, and authoring slide
visuals as components is far cheaper than any bespoke drawing layer. Encoding, muxing, and audio
inspection are well-trodden problems with correct, fast implementations we have no chance of
beating and no reason to duplicate.

## Decision

- Implementation stack: TypeScript on Node.
- Video composition and rendering: Remotion. Slides are React components, durations are frames,
  and rendering is programmatic and headless — which keeps the CLI-first constraint (decision:2)
  intact.
- Encoding, muxing, and audio measurement: ffmpeg (directly or via an established wrapper) and
  existing media libraries.

We do not implement encoders, timeline engines, audio mixers, or font/layout machinery ourselves.

## Consequences

- Rendering inherits a Chromium-based toolchain: heavier install and slower cold renders than a
  pure-ffmpeg pipeline. Accepted in exchange for layout expressiveness and iteration speed.
- ffmpeg becomes a runtime dependency. Its absence should produce a clear, actionable error
  rather than a stack trace.
- Slide appearance lives in components; the YAML must not leak CSS. The source expresses intent
  (title, bullets), the component decides how that looks.
- If Remotion turns out to be the wrong choice, the seam worth preserving is the fully-timed
  scene list — the surface parked as an IR in idea:3 — not the components themselves.
