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

## Status: first light

`cuecraft render` works end to end. A YAML deck compiles to a narrated 1080p MP4 with no
credentials, no network at render time, and nothing to click.

```
./scripts/bootstrap-local-tts.sh                                    # once
npm run render -- examples/witnessglass.yaml -o out/witnessglass.mp4
```

```
Rendered out/witnessglass.mp4
  4 slides
  00:42.7
  1920x1080 @ 30fps, h264/aac
  layouts 1:matrix  2:statement  3:index  4:lead
```

After a global install the same thing is `cuecraft render examples/witnessglass.yaml -o
out/witnessglass.mp4`. The first render additionally downloads a Chrome Headless Shell into
Remotion's own cache; every render after that is offline.

What exists now:

- YAML parsing and strict validation, with errors that name the slide and field
- narration as an ordered list of speech and pauses, synthesized locally and measured
- semantic anchors linking narration moments to slide elements, with times derived not authored
- narration-derived timing, converted to frames in exactly one place
- four curated slide compositions, chosen from the shape of the content
- 1920x1080 H.264/AAC output via Remotion
- `cuecraft speak` for trying a line of narration on its own

What is aspirational:

- narration caching, so an unchanged re-render synthesizes nothing ([dragon:1](archaeology/dragons/))
- `cuecraft freeze` for promoting approved narration into source assets
- pinned typography, so a render on Linux matches a render on macOS ([dragon:4](archaeology/dragons/))

## How a render works

```
presentation.yaml
   |  parse + validate            yaml, zod
   v
authored presentation
   |  synthesize each cue         local Kokoro, measured duration
   v
compiled presentation            slide + narration track + derived scene length
   |  seconds -> frames          one rule, one function
   |  content shape -> layout    deterministic, four archetypes
   v
frame timeline
   |  compose + encode           Remotion, ffmpeg
   v
presentation.mp4
```

Each slide lasts `max(minimum, pre_say + narration + post_say)`. Narration starts after
`pre_say`; the next slide never begins before it finishes. Durations become frames only at the
last step, always rounding up, so nothing drifts. Frame counts are not expressible in the
source — see
[`archaeology/decisions/0009-*.md`](archaeology/decisions/).

Everything a render generates — narration WAVs and the webpack bundle — lands in
`.cuecraft/renders/<name>/`, next to the model weights and under the same rules: a projection,
always safe to delete, never committed, never hand-edited. It is kept rather than cleaned up,
because a render that sounds wrong is diagnosed by listening to the WAV that caused it.
Narration is re-synthesized on every render; there is no cache yet.

## Writing a deck

A slide says what it means. It never says how it should look.

```yaml
title: "WitnessGlass: What Did the Agent Actually Do?"

defaults:
  pre_say: 750ms
  post_say: 1200ms

slides:
  - slide:
      title: "Coding agents are black boxes"
      bullets:
        - Read files
        - Search code
        - Run tools
        - Decide

    say:
      - "Coding agents do a surprising amount of invisible work."
      - pause: 350ms
      - "They read files, search code, run tools, and decide what to do next."
```

**Narration** is an ordered list of cues. A cue is either prose to speak or
`{ pause: <duration> }`. Each speech cue is synthesized separately, so each gets a complete
intonation contour instead of one long flat arc — which is most of what makes a slide sound
deliberate. A plain string still works and means one cue:

```yaml
say: |
  One cue, written the old way.
```

Two things worth knowing. Punctuation inside a cue is Kokoro's real phrasing control: commas
and full stops are where it breathes. And every generated clip carries its own leading and
trailing silence — about 780ms sits between two cues before you author anything — so `pause`
is silence _added_ between clips, and small values go a long way.

There is no emphasis, pitch, rate or style control, because the local model has none. See
[`archaeology/dragons/0003-*.md`](archaeology/dragons/).

**Pronunciation.** eSpeak decides pronunciation from spelling and limited context, and it gets
heteronyms wrong after a noun-phrase subject — "WitnessGlass records the work" comes out as the
plural noun. Repair one occurrence without touching the prose:

```yaml
- speech: "WitnessGlass records every tool call as a structured event."
  pronounce:
    records: rekords
```

The substitution is whole-word and applies to that cue only, because `records` legitimately has
two pronunciations and a deck-wide entry would be wrong on the next slide. It is a respelling
handed to eSpeak rather than a phoneme, so verify it by listening
([`archaeology/decisions/0012-*.md`](archaeology/decisions/)).

**Semantic anchors.** A bullet can carry an identity, and a narration cue can say it reaches it:

```yaml
bullets:
  - id: tool
    text: Which tool the agent invoked
  - id: timing
    text: How long the call took

say:
  - speech: "Which tool the agent invoked,"
    activates: tool
  - speech: "how long the call took,"
    activates: timing
```

Anchored elements are on screen from the first frame but recessive, and become established as the
narration reaches them, accumulating. There is no timestamp and no frame number: cuecraft derives
the moment from the measured audio, so rewording narration can never desynchronize a deck. A cue
that activates an identity no bullet declares is a compile error.

Granularity is the cue, because that is the only exact timing Kokoro's graph makes available —
it outputs a waveform and nothing else, so there are no word timings to be had
([`archaeology/decisions/0013-*.md`](archaeology/decisions/),
[`0014-*.md`](archaeology/decisions/)).

**Layout is not authored.** cuecraft looks at what a slide contains — how many bullets, how
long they are — and picks one of four compositions:

| shape                            | composition                                              |
| -------------------------------- | -------------------------------------------------------- |
| no bullets                       | **statement** — the title is the slide, at display scale |
| up to 6 labels, ≤24 characters   | **matrix** — a field of terms under hairlines            |
| up to 6 phrases, ≤38 characters  | **index** — numbered rows                                |
| anything longer or more numerous | **lead** — heading in its own column, points beside it   |

`cuecraft render` reports which slide got which. There is no `layout:` key, no font size, no
coordinate, and no theme: the source expresses intent and the renderer decides how that looks
(see [`archaeology/decisions/0010-*.md`](archaeology/decisions/)). To change how a slide looks,
change what it says.

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
compiled to WebAssembly; the phonemes become token ids; those plus a 256-float style tensor —
picked from the voice's table by token count — and a speed scalar feed a StyleTTS2 ONNX graph
executed by ONNX Runtime's native binding. cuecraft
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
must be synthesized and measured before any frame is rendered. Nothing downstream of that
measurement is allowed to change it: the renderer fades slides within the frames the compiler
assigned them rather than overlapping scenes, and asserts that the composition agrees with the
timeline. Generated audio is meant to be content-addressed by everything that determines it
(provider, model, voice, delivery instructions, text, format) and reused when unchanged; that
cache is not built yet, so every render synthesizes afresh. Narration you approve can later be
_frozen_ into repository-managed source assets, so a published talk keeps its exact performance
even as providers drift. Rendering delegates to Remotion and ffmpeg; we do not build media
machinery ourselves.

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

`npm run check` never loads the model and never launches a browser, so it works on a machine
that has not bootstrapped anything. Tests with real prerequisites are named by suffix and run
separately:

```
./scripts/bootstrap-local-tts.sh
npm run test:tts       # *.live-test.ts  — real Kokoro synthesis
npm run test:render    # *.render-test.ts — synthesis + headless Chromium + ffprobe
```

`test:render` compiles a two-slide fixture all the way to an MP4 and checks the container,
codecs, resolution, frame rate, and that its duration matches the derived timeline. It does not
judge how the video looks; that test is watching it.

Machine prerequisites beyond Node: **ffprobe** (from ffmpeg) for `test:render`, and about
100 MB of disk for the Chrome Headless Shell that Remotion downloads on first render. The
composition is the one part of the source Node never executes — Remotion's bundler compiles it,
which is why it lives in `.tsx` and is typechecked by `tsconfig.render.json`.

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
