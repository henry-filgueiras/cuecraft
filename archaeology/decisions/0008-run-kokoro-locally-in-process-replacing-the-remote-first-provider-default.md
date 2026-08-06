---
id: dec_01KZA6S1X0MZ0TH6TYX7BPB44K
sequence: 8
kind: decision
status: accepted
created: 2026-08-05
---

# Run Kokoro locally in-process, replacing the remote-first provider default

## Context

decision:4 put speech synthesis behind a narrow provider interface and named OpenAI as the first
implementation. Nothing has been built against it yet, which makes this the cheapest moment to
ask whether the first provider should be remote at all.

It should not. Narration is on the critical path for timing (dragon:1), so the inner loop of
this project is synthesize, listen, adjust. A metered remote API taxes exactly that loop: every
iteration costs money, requires a credential in the environment, and fails when someone else's
service does. For a probe whose whole purpose is rapid iteration on delivery, that is the wrong
default.

Kokoro is an 82M-parameter TTS model with Apache-2.0 weights — small enough to run comfortably on
a laptop CPU and permissively enough licensed to embed in a build pipeline. The real question was
not whether to use it but what should execute it.

Four routes were examined on this machine, an Apple Silicon Mac:

- **`kokoro` (hexgrad, PyTorch + misaki G2P)** — the reference implementation. Requires Python
  `>=3.10,<3.13` plus torch. The system Python here is 3.14.6, so this needs a second interpreter
  before anything else happens, and torch alone is an order of magnitude larger than the model.
- **`kokoro-onnx` (thewh1teagle)** — lighter, ONNX Runtime instead of torch. Still requires Python
  `>=3.10,<3.14`, so still a second interpreter, plus a virtualenv, plus separately downloaded
  model and voice files.
- **MLX / CoreML ports** — genuinely faster on Apple hardware, and genuinely narrower: they bind
  the project to one vendor's accelerator and to less-travelled code.
- **`kokoro-js` (Transformers.js)** — runs the same ONNX graph through ONNX Runtime's native
  Node binding. No Python, no system packages.

Measured, not assumed: `kokoro-js` installs in about twelve seconds from a cold npm cache with
zero prerequisites beyond the Node this repository already requires. It phonemizes in-process
using eSpeak NG compiled to WebAssembly, so there is no `brew install espeak-ng` step and no
system library to drift. On CPU it synthesizes at a real-time factor of roughly 0.11 warm — about
nine seconds of speech per second of compute — which removes any performance argument for a
GPU-accelerated port at this scale.

## Decision

Local synthesis runs **in cuecraft's own Node process** via `kokoro-js`, pinned to an exact
version. There is no Python, no virtualenv, no subprocess, and no inference server.

The pipeline, concretely:

```
narration text
    |  kokoro-js normalizes it (numbers, currency, times, abbreviations)
    v
IPA phonemes            <- eSpeak NG compiled to WebAssembly, in-process
    |
    v
token ids               <- tokenizer.json from the pinned model repository
    |
    +  256-float voice tensor   <- node_modules/kokoro-js/voices/<voice>.bin
    +  speed scalar
    v
StyleTTS2 ONNX graph    <- .cuecraft/models/.../onnx/model.onnx, 325 MB fp32
    |  executed by ONNX Runtime's native macOS binding, via Transformers.js
    v
Float32 waveform, 24 kHz mono
    |
    v
WAV on disk
```

Every component in that diagram is either pinned by `package-lock.json` or by
`kokoro-model.lock.json`. Nothing in it is written here: cuecraft implements no inference, no
phonemization, and no audio encoding.

**Artifact ownership** splits along how each piece is best pinned:

- **Weights** — `.cuecraft/models/<model-id>/`, downloaded by
  `./scripts/bootstrap-local-tts.sh` from an immutable Hugging Face commit and verified by
  SHA-256. Gitignored. About 321 MB. Deleting the directory fully resets the installation.
- **Voices** — inside the npm package, because that is where `kokoro-js` puts them in Node. All
  54 tensors, about 27 MB, pinned by `package-lock.json`'s integrity hash. Fighting this to move
  them under `.cuecraft/` would buy tidiness and cost a patched dependency.

Transformers.js is configured with `allowRemoteModels: false`, which makes locality a property
of the code rather than a habit: a missing artifact fails loudly instead of being silently
fetched. Synthesis has been verified to complete with `globalThis.fetch` replaced by a function
that throws.

`fp32` is the pinned precision. Quantized variants down to 86 MB exist upstream, but at RTF 0.11
there is nothing to buy with the quality.

## Consequences

- decision:4 is amended, not overturned. Its provider interface is still the right shape and
  still the place a remote provider will land; what changes is that the first implementation is
  local, and credentials are not required to render anything. The `synthesize()` function added
  here is deliberately *not* that interface — it is the thinnest thing that proves the boundary
  works, and the compiler will wrap it rather than inherit its shape.
- Local synthesis is free and offline, so narration can be regenerated as freely as any other
  build artifact. This weakens the original motivation for content-addressed caching
  (decision:3), which was framed around synthesis being paid and slow. The cache is still
  justified by determinism and by remote providers later; the urgency is lower.
- `npm install` now pulls about 440 MB, dominated by ONNX Runtime's platform binaries. That is a
  real cost, accepted because the alternative — a second language runtime plus its own package
  manager plus its own lockfile — is worse on every axis this project cares about.
- The stack is pinned but not maintained: `kokoro-js` 1.2.1 was published in May 2025 and depends
  on Transformers.js 3.x while 4.x has shipped. For a frozen inference path this is closer to a
  feature than a risk, but a security fix upstream would require action rather than a version
  bump.
- Delivery control is whatever Kokoro's two inputs provide — voice and speed. decision:6 assumed
  provider-supplied speech instructions would exist; Kokoro has none. See dragon:3.
- Apple Silicon is what this was verified on. Nothing in the choice is macOS-specific — ONNX
  Runtime ships Linux and Windows bindings too — but only darwin/arm64 has been exercised.
