# cuecraft

**Cuecraft compiles semantic structure and narration into narrated video.**

You describe what exists, what relates to what, and what to say about it. Cuecraft derives the
timing, the layout, the visual state, and — increasingly — the cinematography. There is no
timeline, no keyframe, no coordinate, and no way to write one.

Narration is synthesized locally, measured, and becomes the only clock in the system. Everything
downstream is a consequence of that measurement.

**Experimental.** One opinionated visual language, shaped by three specimens. See
[Status](#status) before you plan anything around it.

---

## Showpieces

Three videos, in the order that makes the argument. Each was compiled from the YAML file linked
beside it, by `cuecraft render`, with nothing hand-placed and nothing edited afterwards.

### 1. Observatory — a presentation that reads its own compiler

<!-- VIDEO: observatory -->
<!-- Paste GitHub-uploaded video markdown here -->

**Source: [`examples/observatory.yaml`](examples/observatory.yaml)** — 106 lines, for 1:17 of video.

The camera goes inside two of the concepts in this world, and what is in there is not a diagram of
the pipeline. It is the pipeline's own output for the file being rendered: the measured length of
every sentence in the narration you are hearing, with a marker showing where in it you currently
are; and every relationship the narration resolved, with the frame each one became true on —
including the one that opened the room you are standing in.

The numbers on screen are the numbers that put them there. The author writes `figure: timing`. That
is the whole of the vocabulary — a kind, from a closed set of two. There is no field path, no
expression, and no way for a presentation to read a derived value, which is what makes it
impossible to write narration that changes the measurements it is describing.

### 2. Cathedral v2 — a world you walk through, and go inside

<!-- VIDEO: cathedral-v2 -->
<!-- Paste GitHub-uploaded video markdown here -->

**Source: [`examples/cathedral-v2.yaml`](examples/cathedral-v2.yaml)** — 132 lines, for 1:09 of video.

The author writes ten entities and thirteen relations. Cuecraft lays the graph out once, several
times wider than the frame, and then _looks at part of it_: a camera travels from concept to
concept as the narration reaches them, framing each one with as much of the context it connects to
as will fit.

One entity carries a `detail` — content, like any slide's. When the narration starts talking about
something inside that concept, the concept's own rectangle expands until its outline is the edge of
the picture, and the interior is an ordinary cuecraft composition drawn at that scale. When the
narration talks about something else again, it closes.

Nothing in the source asks for a zoom, a transition, a duration, or a camera move. The one thing
the author says is that this concept has an inside.

### 3. Self-demo — the practical core

<!-- VIDEO: cuecraft-self-demo -->
<!-- Paste GitHub-uploaded video markdown here -->

**Source: [`examples/cuecraft.yaml`](examples/cuecraft.yaml)** — 212 lines, for 1:45 of video.

A conventional semantic presentation, and the one to read if you want to know what authoring
actually feels like. Content roles rather than layouts; specimens that _quote_ real files in this
repository rather than copying them; a diff derived from two truthful source states; and elements
that establish as the narration reaches them, at times nobody typed.

---

## Authored, and derived

The gap between these two columns is the whole project.

```
authored                      derived
────────────────────────      ──────────────────────────────
entities                      speech, and its measured duration
relationships                 when every event happens
narration cues                graph layout, and every edge route
which cue is about what       which composition each slide gets
                              type size, position, colour
                              camera framing, pacing, and when not to move
                              portal transitions
                              the video
```

Nothing in the right column is reachable from the source. There is no `layout:` key, no font size,
no coordinate, no theme, and no frame number — by decision rather than by omission
([`decision:10`](archaeology/decisions/), [`decision:15`](archaeology/decisions/)). To change how
something looks, change what it says.

## What the source looks like

Lifted from [`examples/observatory.yaml`](examples/observatory.yaml) — one entity and a few cues
removed, nothing added. This is what produced the world, the layout, the camera, an interior, and
the final reveal:

```yaml
slides:
  - slide:
      title: "A presentation that reads its own compiler"

      world:
        entities:
          intent: What you meant
          narration: Spoken here

          timing:
            label: Derived timing
            detail:
              figure: timing # the compiler's own measurements, drawn

          composition: Chosen composition
          state: Presentation state
          renderer: Every frame drawn
          video: This video

        relations:
          - intent -> narration
          - intent -> composition
          - narration -> timing
          - composition -> state
          - state -> renderer
          - renderer -> video

    say:
      - speech: "It starts with intent. What a slide means, and what to say about it."
        activates: intent

      # Reaching a concept that has an inside is how you get taken into it. Nothing here asks.
      - speech: "Which is the moment the presentation stops guessing."
        activates: timing
      - "This is the narration you are listening to right now, measured."

      # Neither of these reaches anything, and both come after every cue that does — so this is
      # where cuecraft stops looking at concepts and shows the machine they were part of.
      - "No coordinates. No keyframes. No timeline."
      - "You describe the world. Everything else is a consequence."
```

## How it works

```
presentation.yaml
   |  parse + validate           yaml, zod — errors name the slide and the field
   v
authored presentation
   |  synthesize each cue        local Kokoro, in process, offline
   |  measure                    real samples, never an estimate
   v
compiled presentation
   |  seconds -> frames          one rule, one function, rounding up
   |  content -> composition     deterministic, nine archetypes
   |  narration -> events        which element becomes true, on which frame
   v
frame timeline                   + the compilation's own facts, frozen
   |  layout / projection        graph layout, type fitting, camera plan
   |  compose + encode           Remotion, ffmpeg
   v
presentation.mp4                 1920x1080, H.264/AAC
```

A slide lasts `max(minimum, pre_say + narration + post_say)`. Because that depends on audio that
does not exist yet, **narration is synthesized before any frame can be rendered**, and nothing
downstream of the measurement is allowed to change it
([`dragon:1`](archaeology/dragons/), [`decision:9`](archaeology/decisions/)).

Text-to-speech is [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), an 82M-parameter Apache-2.0
model, running locally in-process. After the one-time bootstrap there are no credentials, no
metered API, and no audio leaving the machine.

## Quick start

Node >= 22.18. Source files run directly via Node's TypeScript type stripping.

```bash
npm install
npm run bootstrap:tts    # once: ~321 MB of Kokoro weights, SHA-256 verified

npm run render -- examples/observatory.yaml -o out/observatory.mp4
```

```
Rendered out/observatory.mp4
  1 slide
  01:17.6
  1920x1080 @ 30fps, h264/aac
  layouts 1:atlas
  narration 13.6s, render 40.5s
```

The first render additionally downloads a Chrome Headless Shell into Remotion's own cache; every
render after that is offline. Then write your own — same command, your file:

```bash
npm run render -- my-talk.yaml -o out/my-talk.mp4
```

Every capability is reachable from the command line and works headless. The CLI is the product,
not a wrapper around one:

```bash
node src/cli.ts --help
node src/cli.ts voices                                        # the 28 available voices
npm run speak -- "Your laptop is now doing the talking." -o tmp/hello.wav
node src/cli.ts speak "..." --voice bm_george --speed 1.2
```

After `npm run build` and a global install, all of that is just `cuecraft`:
`cuecraft render my-talk.yaml -o out/my-talk.mp4`.

## Writing a presentation

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
        - id: tools
          text: Run tools
        - Decide

    say:
      - "Coding agents do a surprising amount of invisible work."
      - speech: "They read files, and they run tools."
        activates: tools
      - "And decide what to do next."
```

**Narration** is an ordered list of cues — prose to speak, or `{ pause: 400ms }`. Each speech cue
is synthesized separately, so each gets its own intonation contour instead of one long flat arc,
which is most of what makes a slide sound deliberate. Punctuation is the real phrasing control;
every clip already carries about 780ms of its own silence, so authored pauses go a long way.
`pronounce: { records: rekords }` repairs one occurrence of a heteronym without touching the prose.

**Semantic anchors.** An element can carry an identity, and a cue can say it reaches it.
`activates:` is not a timestamp — cuecraft derives the moment from the measured audio, so rewording
narration can never desynchronize a deck, and an identity nothing declares is a compile error.

**What the content is.** A slide carries at most one body, and which one it is says what the
content _means_. The body picks the composition; shape decides only within the list role.

| body                                   | composition                                              |
| -------------------------------------- | -------------------------------------------------------- |
| `world` — entities and relations       | **atlas** — a laid-out graph, larger than the frame      |
| `figure` — `timing` or `anchors`       | **figure** — what this compilation derived               |
| `code` — a specimen                    | **specimen** — the source full width, monospace, sized   |
| `change` — one source becoming another | **revision** — the changed lines swapping in place       |
| `steps` — stages of a transformation   | **cascade** — descending and stepping right              |
| no body                                | **statement** — the title is the slide, at display scale |
| `bullets`, ≤6 items, ≤24 chars         | **matrix** — a field of terms under hairlines            |
| `bullets`, ≤6 items, ≤38 chars         | **index** — numbered rows                                |
| `bullets`, anything longer             | **lead** — heading in its own column, points beside it   |

An entity inside a `world` can carry a `detail:`, which is a body like any of the above — so the
inside of a concept is not a tenth archetype, it is one of these nine drawn at concept scale.

**Quoting instead of copying.** A specimen can name a file, a slide of it, and the construct it
wants, rather than restating source that already exists:

```yaml
code:
  file: examples/witnessglass.yaml
  slide: "Coding agents are black boxes"
  opens: "say:"
```

The text is the file's, verbatim. A missing file, a title matching no slide or two, or a selector
that no longer resolves are all compile errors naming the slide — a deck that would display stale
source refuses to build instead. Source too wide for the frame is wrapped to a derived measure and
marked with `↳`; nothing is ever cut to fit.

The full reference for all of this — and the reasoning behind every rule — is in
[`archaeology/decisions/`](archaeology/decisions/).

## Design principles

- **Author relationships; derive mechanics.** The source says what things are and how they relate.
  Everything mechanical is a consequence.
- **If cuecraft can know it reliably, the author does not maintain a second copy of it.** No
  timestamps, no sizes, no positions, no duplicated source.
- **Timing comes from measured narration.** Not from author timestamps, and not from an estimate.
- **Semantic events create reasons to move, not obligations to move.** The camera declines to
  recompose a shot that already frames what is being talked about
  ([`decision:24`](archaeology/decisions/)).
- **Source truth and presentation projection are distinct.** The YAML is source. Narration audio,
  frames, and the MP4 are projections: always safe to delete, never hand-edited, never committed.
- **The artifact gets the final vote.** Every rule here was changed because a rendered minute
  looked wrong, and the measurements that changed it are in the archaeology.

## Status

Early, opinionated, and honest about it.

- **Experimental.** The version is 0.0.0 and the format is not stable.
- **One visual language.** Constants, not a theming system. There is no GUI, no editor, and no
  theme key — by decision.
- **Three canonical specimens have shaped the implementation.** Every archetype and every camera
  rule exists because a real rendered minute looked wrong without it. That makes them well-tuned
  for the worlds they were tuned against, and untested against yours.
- **Not a PowerPoint replacement.** No import, no export, no editing surface.
- **Not a general motion-graphics DSL.** You cannot express an arbitrary animation, and adding a
  way to would defeat the point.
- **What it is for:** finding out how far semantic authoring goes before mechanical authoring
  becomes necessary. Feature expansion is deliberately paused while these three artifacts are
  looked at ([`decision:30`](archaeology/decisions/)).

Known open questions live in [`archaeology/dragons/`](archaeology/dragons/) — including
typography that depends on host fonts, no narration cache yet, and whether a semantic world
deserves to be permanent vocabulary at all.

## Development

```bash
npm run check     # typecheck + format check + tests — no model, no browser
npm run build     # emit dist/
```

Tests with real prerequisites run separately, and need the bootstrap plus **ffprobe**:

```bash
npm run test:tts       # *.live-test.ts   — real Kokoro synthesis
npm run test:render    # *.render-test.ts — synthesis + headless Chromium + ffprobe
```

`test:render` compiles a fixture all the way to an MP4 and checks the container, codecs,
resolution, frame rate, and that its duration matches the derived timeline. It does not judge how
the video looks; that test is watching it.

### Archaeology

Cuecraft's design decisions, experiments, dragons, and rejected hypotheses are preserved in the
repository, managed with [scarp](https://crates.io/crates/scarp). Several things that look like
gaps are decisions, with the measurement that produced them attached.

```bash
scarp list decisions
scarp list dragons     # open questions, honestly open
scarp list ideas       # considered, and deliberately parked
scarp doctor           # archaeology invariants; run before committing
```

See [CLAUDE.md](CLAUDE.md) for conventions that apply to human and agent contributors alike.

## License

MIT — see [LICENSE](LICENSE).
