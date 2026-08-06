# cuecraft

**Experimental.** A programmatic compiler for narrated slide presentations.

Given a human-authored YAML file describing slides and what to say over them, cuecraft is
meant to produce a polished 16:9 MP4 with AI-generated narration — no screen recorder, no
microphone, no video editor.

```
presentation.yaml
       |
       +-- slide content --> visual slide
       |
       +-- say text ------> TTS audio
       |
       v
  compiled presentation
       |
       v
    video render
       |
       v
presentation.mp4
```

The YAML is the source of truth. Slides, narration audio, timing, and the final video are
projections of it. You edit the text and recompile; you do not edit the video.

## Status: bootstrap only

This repository currently contains project archaeology, tooling, and a CLI skeleton. **The
render pipeline is not implemented.** `cuecraft render` exists as a command and exits with a
clear message saying so.

What exists now:

- decisions, parked ideas, and open questions under [`archaeology/`](archaeology/)
- a TypeScript/Node toolchain with typecheck, tests, and formatting
- a CLI entry point that parses arguments
- **local text-to-speech** — `cuecraft speak` synthesizes audio on your own machine, with no
  API key and no network (see below)
- [`examples/witnessglass.yaml`](examples/witnessglass.yaml) — the target input format, which
  nothing reads yet

What is aspirational:

- YAML parsing and validation
- narration caching and narration-derived slide timing
- Remotion composition and MP4 rendering
- `cuecraft freeze` for promoting approved narration into source assets

## Intended usage

```
cuecraft render presentation.yaml -o presentation.mp4
```

## Local text-to-speech

Narration is synthesized locally by [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), an
82M-parameter Apache-2.0 model. No credentials, no metered API, no audio leaving the machine.

Install it once:

```
./scripts/bootstrap-local-tts.sh
```

That checks your Node version, installs the pinned npm dependencies, downloads about 321 MB of
model weights from an immutable Hugging Face commit into `.cuecraft/models/`, verifies every
file by SHA-256, and synthesizes a test phrase. It is safe to rerun: already-present artifacts
are re-verified rather than re-downloaded, and a corrupted one is replaced.

Then:

```
npm run speak -- "Good evening. Your laptop is now doing the talking." -o tmp/hello.wav
cuecraft voices          # list the 28 available voices
cuecraft speak "..." --voice bm_george --speed 1.2
```

Output is 24 kHz mono WAV. On an M-series Mac a line synthesizes at roughly a tenth of its own
duration.

**What actually runs.** Text is normalized and converted to IPA phonemes in-process by eSpeak NG
compiled to WebAssembly; the phonemes become token ids; those plus a 256-float voice tensor and
a speed scalar feed a StyleTTS2 ONNX graph executed by ONNX Runtime's native binding. cuecraft
implements none of that — see
[`archaeology/decisions/0008-*.md`](archaeology/decisions/) for what came from where, and what
was rejected.

**What is pinned.** Model weights by Hugging Face commit plus SHA-256, in
[`kokoro-model.lock.json`](kokoro-model.lock.json); voice data and the inference library by
`package-lock.json`. Nothing resolves against a mutable ref.

**Resetting.** `rm -rf .cuecraft/models` removes the entire local model installation. Nothing
under `.cuecraft/` is ever committed.

## Design in one paragraph

Timing is derived rather than authored — a slide lasts
`max(minimum slide duration, pre_say + narration duration + post_say)` — which means narration
must be synthesized and measured before any frame is rendered. Because synthesis is paid and
non-deterministic, generated audio is content-addressed by everything that determines it
(provider, model, voice, delivery instructions, text, format) and reused when unchanged.
Narration you approve can later be _frozen_ into repository-managed source assets, so a
published talk keeps its exact performance even as providers drift. Rendering delegates to
Remotion and ffmpeg; we do not build media machinery ourselves.

The reasoning behind each of those choices is recorded in
[`archaeology/decisions/`](archaeology/decisions/).

## Scope

v0 is deliberately narrow: one scene type (title + bullets), narration, timing, and one MP4.
Browser demos, terminal replays, charts, captions, and other scene types are parked as ideas,
not roadmap. There is no GUI and no editor, by decision rather than by omission.

## Development

Requires Node >= 22.18 (source files run directly via Node's TypeScript type stripping).

```
npm install
npm run check     # typecheck + format check + tests
npm run build     # emit dist/
```

`npm run check` never loads the model, so it works on a machine that has not bootstrapped local
TTS. Tests that require the real model are named `*.live-test.ts` and run separately:

```
./scripts/bootstrap-local-tts.sh
npm run test:tts
```

Durable project knowledge lives in [`archaeology/`](archaeology/), managed with
[scarp](https://crates.io/crates/scarp):

```
scarp list decisions
scarp list ideas
scarp list dragons
scarp doctor
```

See [CLAUDE.md](CLAUDE.md) for conventions that apply to both human and agent contributors.

## License

MIT — see [LICENSE](LICENSE).
