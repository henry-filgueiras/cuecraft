# cuecraft

**Cuecraft compiles semantic structure and narration into narrated video.**

You describe what exists, what relates to what, and what to say about it. Cuecraft derives the
timing, the layout, the visual state, and — increasingly — the cinematography. There is no
timeline, no keyframe, no coordinate, and no way to write one.

Narration is synthesized locally, measured, and becomes the only clock in the system. Everything
downstream is a consequence of that measurement.

**Experimental.** One opinionated visual language, shaped by the artifacts in `examples/`. See
[Status](#status) before you plan anything around it.

---

## Showpieces

Five videos, in the order that makes the argument. Each was compiled from the YAML file linked
beside it, by `cuecraft render`, with nothing hand-placed and nothing edited afterwards.

### 1. Anatomy of an online order — three scales, one unbroken explanation

<!-- VIDEO: order -->
https://github.com/user-attachments/assets/2c4d7874-b76c-4ed8-965d-95982b9d0a75

**Source: [`examples/order/`](examples/order/)** — 198 lines across three files, for 1:38 of video.

The shortest complete statement of what cuecraft is claiming, which is why it goes first. One
slide, and the camera never cuts. It opens on four boxes — you press Buy, paying, packing, it turns
up — descends into `paying`, descends again into the check inside _that_, and unwinds back through
both to finish the sentence it started at the top.

The whole mechanism is two words:

```yaml
entities:
  paying:
    label: Paying
    child: ./paying.yaml # an interior that arrived in its own file, with its own `say`

say:
  - enter: paying # go in; the module narrates itself from here
```

There is no `exit:`. The child's cue list running out _is_ the return, which is the same rule every
function obeys and the reason this works on worlds that loop or fork. Nothing in any of the three
files names a zoom, a scale, a transition, a duration or a camera move, and the breadcrumb above the
title — `ANATOMY OF AN ONLINE ORDER › PAYING` — is derived from where in the stack the viewer
currently is, not written anywhere.

[`examples/order-flat.yaml`](examples/order-flat.yaml) says the same thing as three ordinary slides,
in 137 lines. It exists so that the comparison can be made rather than asserted.

### 2. SHA-256 — one round, then sixty-four of them

<!-- VIDEO: sha256 -->

https://github.com/user-attachments/assets/3db97bc4-c98b-434e-a31e-6f50d3b6f673

**Source: [`examples/sha256/`](examples/sha256/)** — 306 lines across four files, for 2:49 of video.

The same descent as above, on a subject that was not chosen to suit it. One slide, no cuts: the
camera descends into the compression function, descends again into the message schedule and then
into a single round, and unwinds through both to finish the sentence it started. SHA-256 is a call
stack because that is how FIPS 180-4 is written, not because it flatters the format.

The showpiece moment is the one the format could not previously make true. After the viewer has
watched one round in full — `T1`, `T2`, and the two values it injects — the camera comes back out,
and the plate immediately to the right of `One round` opens into a field of sixty-four. The field
fills while a sentence is spoken, and the sentence's _measured length_ is how long that takes.
Reword it and the field fills at a different rate; there is no key in the source that could set it.

```yaml
many:
  label: Sixty-four times
  detail:
    series:
      - id: rounds
        count: 64
        text: one round each, with its own word and its own constant
```

One line means sixty-four. Nobody wrote a cell, a row, a column, a colour, a duration or a frame:
the arrangement comes from the count, the pace from the audio, and the camera from the narration.
Every formula on screen is verified against `node:crypto` by a test that reads the rotation amounts
out of the deck's own TeX — so a film that misstated the algorithm would fail the suite.

### 3. Observatory — a presentation that reads its own compiler

<!-- VIDEO: observatory -->

https://github.com/user-attachments/assets/4f8e0c9b-57ce-401f-a55f-428eaa08acfc

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

### 4. Cathedral v2 — a world you walk through, and go inside

<!-- VIDEO: cathedral-v2 -->

https://github.com/user-attachments/assets/15e55c51-b323-46d1-9bb1-ff533292bc73

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

### 5. Self-demo — the practical core

<!-- VIDEO: cuecraft-self-demo -->

https://github.com/user-attachments/assets/fa61b810-6b5c-45ba-bfcd-ea5e2a3c83a3

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
                              where a scope returns to, and what it restores
                              how a population is arranged, and how fast it fills
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
   |  content -> composition     deterministic, eleven archetypes
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
| `formula` — lines of mathematics       | **formula** — set by KaTeX, centred, sized to fit        |
| `series` — a bounded population        | **series** — a derived field, filling in reading order   |
| `change` — one source becoming another | **revision** — the changed lines swapping in place       |
| `steps` — stages of a transformation   | **cascade** — descending and stepping right              |
| no body                                | **statement** — the title is the slide, at display scale |
| `bullets`, ≤6 items, ≤24 chars         | **matrix** — a field of terms under hairlines            |
| `bullets`, ≤6 items, ≤38 chars         | **index** — numbered rows                                |
| `bullets`, anything longer             | **lead** — heading in its own column, points beside it   |

An entity inside a `world` can carry a `detail:`, which is a body like any of the above — so the
inside of a concept is not a tenth archetype, it is one of these nine drawn at concept scale.

**Child modules — experimental.** An entity's inside can instead arrive in its own file, and then
it brings its own narration. Going in becomes a _call_: the parent stops speaking, the module
speaks, and the parent resumes.

```yaml
# order.yaml
entities:
  paying:
    label: Paying
    child: ./paying.yaml

say:
  - speech: "Almost everything happens in the middle."
    activates: paying
  - enter: paying # paying.yaml narrates itself from here
  - speech: "All of that took about a second." # ...and the parent resumes
```

```yaml
# paying.yaml — one body, its own narration, and nothing else
world:
  entities: { ... }
  relations: [...]
say:
  - ...
```

- **There is no `exit:`.** The module's cue list running out is the return. Completion unwinds the
  stack rather than graph terminality, because a world may cycle, fork, or have four sinks — "come
  back when the traversal reaches the end" only works on worlds that happen to be trees.
- **A module is one body and one `say`.** Not a presentation: `title`, `slides` and `defaults` are
  refused by name. Its title is the entity's label; theme, voice and timing are the root
  presentation's, inherited whole.
- **Paths resolve relative to the file that declares them,** and must stay inside the checkout.
- **Identities are local.** Internally every element gets a structural address —
  `root/paying/check/allowed` — so two modules may both contain something called `check`.
- **Merely mentioning an entity does not enter it.** Only `enter:` does.
- **Missing files, inclusion cycles and excessive depth are compile errors**, reported before a
  second of audio is synthesized, with the whole inclusion chain in the message.
- **Depth is currently limited to a child and a grandchild.** The implementation recurses; the
  limit is a claim about what has been watched, not about what the compiler can do.

Two specimens use this. `examples/order/order.yaml` is the smallest honest one — three scales, one
continuous explanation — with `examples/order-flat.yaml` saying the same thing as three ordinary
slides for comparison. `examples/sha256/` is the harder one: SHA-256 is a call stack because that
is how its specification is written, so it exercises the feature on a subject that was not chosen
to suit it. See [`decision:31`](archaeology/decisions/) for the reasoning and
[`dragon:11`](archaeology/dragons/)–[`dragon:13`](archaeology/dragons/) for what is still open.

**Mathematics.** A body can be a definition, spelled in TeX and set by KaTeX:

```yaml
formula:
  - tex: '\mathrm{Ch}(e,f,g) \;=\; (e \wedge f) \;\oplus\; (\lnot e \wedge g)'
  - id: maj
    tex: '\mathrm{Maj}(a,b,c) \;=\; (a \wedge b) \;\oplus\; (a \wedge c) \;\oplus\; (b \wedge c)'
```

A list of lines, exactly as `bullets` is — so `activates:` reaches a line the same way it reaches a
bullet, and the same three-state envelope applies. TeX that will not typeset is a compile error
naming the line, with KaTeX's own caret. Nothing in the source names a size, an alignment or a
colour, and there are no environments, no numbering and no macros: this is a role for a definition,
not a typesetting system ([`decision:32`](archaeology/decisions/)). It is also the one part of the
deck whose faces are bundled rather than borrowed from the host machine.

**Bounded repetition — experimental.** A body can be a _population_: many of the same thing, in
named groups, in order.

```yaml
series:
  - count: 16
    text: arrive with the block
  - id: derived
    count: 48
    text: built from four earlier words each

say:
  - speech: "And forty-eight more are built out of them, one at a time."
    fills: derived
```

`fills:` is the second kind of relationship narration can have with content, and it is deliberately
not `activates:` wearing a hat. An anchor is a **point** — this moment and this element are the
same idea. A fill is an **interval** — this population comes into being while this sentence is
spoken, and the sentence's measured length is how long that takes. A cue carries one or the other,
never both.

- **The author writes a count and what the members are.** There is no cell, row, column,
  coordinate, colour, duration, easing or frame to write, and no key that could become one.
- **The arrangement is derived from the count**: 64 is 8×8, 48 is 8×6, 90 is 10×9, 7 is 4×2.
- **Sixty-four members cost one line and zero extra narration clips.**
- **It is a quantifier, not a data structure.** Members have no identity, no value, and no way to
  acquire either — the groups are the elements. There is no condition, no unknown bound, no
  nesting, and no way to say "until". A series states a finite cardinality; it does not _run_.
- Counts that are zero, fractional, negative or past a stated maximum fail at parse time.

`examples/tally.yaml` exercises it with nothing cryptographic in sight. See
[`decision:33`](archaeology/decisions/) for the three spellings that were rejected first.

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
- **The specimens in `examples/` shaped the implementation.** Every archetype and every camera rule
  exists because a real rendered minute looked wrong without it. That makes them well-tuned for the
  worlds they were tuned against, and untested against yours.
- **Child modules and `series` are experiments, not supported features.** A handful of artifacts and
  one pair of eyes. The compiler recurses; the demonstrated contract is a child and a grandchild,
  and no claim is made about anything deeper ([`decision:31`](archaeology/decisions/)). `series` is
  a quantifier and will not be grown into control flow ([`decision:33`](archaeology/decisions/)).
- **Not a PowerPoint replacement.** No import, no export, no editing surface.
- **Not a general motion-graphics DSL.** You cannot express an arbitrary animation, and adding a
  way to would defeat the point.
- **What it is for:** finding out how far semantic authoring goes before mechanical authoring
  becomes necessary. Feature expansion is deliberately paused while these three artifacts are
  looked at ([`decision:30`](archaeology/decisions/)).

Known open questions live in [`archaeology/dragons/`](archaeology/dragons/) — including typography
that depends on host fonts, no narration cache yet, a module boundary inherited from the wrong
place, and whether a semantic world deserves to be permanent vocabulary at all.

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

A rendered minute of atlas is 16–17 MB, which is more than some upload forms accept. To fit one
under a ceiling without touching the render:

```bash
npm run compress:upload -- out/observatory.mp4          # -> out/upload/, 10 MB default
npm run compress:upload -- out/observatory.mp4 --limit 8
```

Constant quality first, stepping down only if the result is still over the limit. The rendered
file is never modified — both it and the compressed copy are projections.

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
