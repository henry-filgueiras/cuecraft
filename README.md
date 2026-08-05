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
- [`examples/witnessglass.yaml`](examples/witnessglass.yaml) — the target input format, which
  nothing reads yet

What is aspirational:

- YAML parsing and validation
- TTS synthesis and narration caching
- narration-derived slide timing
- Remotion composition and MP4 rendering
- `cuecraft freeze` for promoting approved narration into source assets

## Intended usage

```
cuecraft render presentation.yaml -o presentation.mp4
```

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
