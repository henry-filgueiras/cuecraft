---
id: drg_01KZAF22NC29YTA6ES5YRJAHWY
sequence: 4
kind: dragon
status: open
created: 2026-08-05
---

# Rendered typography depends on whatever fonts the host machine has

## Context

Slides are typography, and typography is the built-in look's entire argument (decision:5). The
first render's frames confirm it: at 1920x1080 the deck reads as intentional almost entirely
because of one well-set headline face.

That face is not pinned. `src/render/theme.ts` declares a system stack —
`"Helvetica Neue", Helvetica, Arial, sans-serif` — and Remotion renders in a Chrome Headless
Shell that resolves fonts against whatever the host machine has installed. On this macOS
laptop that resolves to Helvetica Neue, which is what the acceptance render actually shows.
On a Linux CI runner it will resolve to whatever fontconfig substitutes, which is commonly
Liberation Sans or DejaVu Sans, with different metrics. Line breaks move. A title that fits
on one line here may wrap there.

So the same YAML, the same model, the same pinned dependencies, and the same commit can
produce visibly different video on two machines. Everything else in this repository is pinned
to an immutable revision and verified by checksum (decision:8); the most visible property of
the output is not pinned at all.

The alternatives were considered and none is free:

- **`@remotion/google-fonts`** fetches at render time. That is exactly the fragile network
  dependency decision:8 spent a sprint removing.
- **A committed font file** is reproducible and offline, and puts a binary blob in a
  plaintext-forward repository — the same argument dragon:2 is still having about audio, with
  the added question of redistribution licensing.
- **A stack that only names metric-compatible faces** narrows the variance without removing
  it, and constrains the design to whatever three platforms happen to share.
- **Accepting the variance** is what this round did, deliberately, because a font decision made
  before anyone has watched a deck would be made blind.

## Question

How does cuecraft pin the typography of its output without either fetching fonts at render time
or committing binaries it has not decided how to manage?

## Constraints

- Rendering must stay offline and credential-free. Nothing may be fetched at render time.
- The source must not express fonts. The YAML expresses intent; the component decides how that
  looks (decision:5), and a `font:` key would be the first stone of the theming system
  decision:2 rules out.
- Whatever is chosen must survive a headless Chromium on Linux, since the CLI must work in CI
  (decision:2) and only darwin/arm64 has been exercised so far.
- Fallback must degrade rather than fail. A missing font should render a different frame, never
  a blank one.

## Candidate direction

Bundle one variable weight of a permissively licensed grotesque next to the composition and
load it with `@remotion/fonts` from a local file, so the same bytes render on every machine.
That likely resolves into dragon:2's question rather than beside it: both are "a binary asset
that is genuinely source, in a repository that would rather not have one". If dragon:2 settles
on a storage and provenance model for frozen narration, a font is the same shape of problem
with a smaller file.

Not urgent. It becomes urgent the first time a render happens anywhere but this laptop.

## Resolution criteria

Resolved when the same presentation rendered on macOS and on a Linux CI runner produces frames
with identical text layout, nothing is fetched during a render, and the mechanism is recorded as
a decision.

## What sprint:7 changed

decision:32 bundles KaTeX, which ships its own faces. A `formula` body therefore sets identically
on every machine — the first typography in cuecraft that does not depend on what the host happens
to have installed.

That does not close this. Every other face in the deck is still a system stack, and the deck's
*own* voice — Helvetica Neue at display sizes — is the one that would actually change what a
viewer sees if it resolved differently. What it does is settle the two things that were open about
the fix:

- **It is affordable.** One dependency, about four megabytes of which most is the fonts, bundled by
  the composition's own webpack config with no new toolchain.
- **It needs a gate.** A renderer capturing frames as fast as it can will photograph the fallback,
  so a bundled face has to hold the frame until it has loaded (`delayRender`, asking for each
  family by name — `document.fonts.ready` resolves immediately when nothing has started loading).
  That is the part that would have been discovered the hard way, and it has now been discovered
  the cheap way.

So the remaining question is narrower than it was: not *can this be fixed* but *is the deck's
sans worth bundling*, which is a question about how much a reader would notice Arial instead of
Helvetica Neue, and is answerable by rendering one deck on a machine that has neither.
