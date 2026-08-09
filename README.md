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

Seven videos, in the order that makes the argument. Each was compiled from the YAML file linked
beside it, by `cuecraft render`, with nothing hand-placed and nothing edited afterwards.

### 1. What happens when you tap your card — a protocol, explained

<!-- VIDEO: tap -->

<!-- Not yet attached. See runme/upload-tap.md — drop out/upload/tap.mp4 on the blank line above
     this comment using GitHub's web editor, then delete this comment. -->

**Source: [`examples/tap.yaml`](examples/tap.yaml)** — 5 actors and 13 messages, for 1:13 of video.

Five parties, thirteen arrows, and the surprise at the end that the two seconds you waited were a
promise and the money moved two days later. It is the kind of thing people build by hand in Keynote
for an afternoon. This is the whole of what produced it — the file has thirteen of these, and
nothing else:

```yaml
protocol:
  actors:
    you: You
    terminal: The terminal
    acquirer: The shop's bank
    network: The card network
    issuer: Your bank

  steps:
    - from: you
      to: terminal
      message: tap
      say: "You tap. That is the entire part of this that you are present for."

    - from: network
      to: issuer
      message: authorise £42.60 # no `say:` — it happens anyway, at a pace nobody wrote
```

There is no identity, no anchor, no target, no coordinate, no duration and no camera instruction
anywhere in that file, and no key that could become one. What cuecraft works out for itself: the
lane order and spacing, how a label wraps and how tall that makes its row, **which messages are
replies** — read off the call stack the message order implies — who is holding an unanswered call
at any moment, when each step happens, how long a step nobody narrates should last, and where the
camera stands and when it should decline to move.

`say:` is optional per step, which is the part that made this a research round rather than an
archetype. Five of the thirteen steps are silent, and they are the passage where the answer comes
back the way the question went — a run that needs no commentary and still has to happen at a speed
a person can watch. That pace is derived from the label and from the step's place in the run
([`decision:35`](archaeology/decisions/)); there is no key an author could set.

[`examples/deploy.yaml`](examples/deploy.yaml) is the same grammar pointed at something hostile —
eight actors, twenty-two messages, sixty-character digests, runs of three silent steps and traffic
across the whole cast. It exists to break the automatic policies rather than to flatter them, and
one of them broke ([`decision:37`](archaeology/decisions/)).

[`examples/coldstart.yaml`](examples/coldstart.yaml) points it at a third thing: a protocol whose
cast **turns over**. Four parties start a service and are never heard from again; five more arrive
afterwards and do everything the film is about. Because cuecraft reads the whole exchange before it
draws a frame, it knows every actor's live interval, and two actors that are never alive at the same
time can share one physical column at different times — nine actors in seven columns, with the
handover drawn as a visible event rather than a name quietly changing
([`decision:38`](archaeology/decisions/)). `examples/tap.yaml`, where everybody is present
throughout, is unchanged down to the pixel.

### 2. Anatomy of an online order — three scales, one unbroken explanation

<!-- VIDEO: order -->

https://github.com/user-attachments/assets/2c4d7874-b76c-4ed8-965d-95982b9d0a75

**Source: [`examples/order/`](examples/order/)** — 198 lines across three files, for 1:38 of video.

The shortest complete statement of the _other_ thing cuecraft is claiming: that a presentation can
have a call stack. One slide, and the camera never cuts. It opens on four boxes — you press Buy, paying, packing, it turns
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

### 3. SHA-256 — one round, then sixty-four of them

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

### 4. Observatory — a presentation that reads its own compiler

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

### 5. Cathedral v2 — a world you walk through, and go inside

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

### 6. A chart nobody drew — a computation handed to R

<!-- VIDEO: revenue -->

<!-- Not yet attached. See runme/upload-revenue.md — drop out/upload/revenue.mp4 on the blank line
     above this comment using GitHub's web editor, then delete this comment. -->

**Source: [`examples/revenue/`](examples/revenue/)** — a 468-row CSV, a 60-line R program and a
100-line deck, for 1:25 of video.

The newest and the most experimental. Cuecraft understands every body it has — a list has a length,
a world has a topology — and that understanding is what lets it choose the composition, the size and
the colour with nobody naming any of them. A quarterly revenue chart is content it will never
understand, so it delegates:

```yaml
exhibit:
  run: examples/revenue/quarterly-revenue.R
  with:
    transactions: examples/revenue/transactions.csv
```

That is the whole of what the deck says about the fourth slide. During `cuecraft render`, R reads
the transaction rows, derives the quarter from each date, groups by quarter and region, sums the
revenue, and draws. Cuecraft takes back one PNG and puts it on the frame.

**There is deliberately no `image:` key**, and that refusal is the feature rather than an omission.
A deck that could point at a checked-in PNG could point at a _stale_ one — the failure
[`decision:18`](archaeology/decisions/) already refuses for quoted source. The only way to get
pixels onto a cuecraft frame is to say what computes them, so "this chart was generated from the
source data while the video was being built" is structurally true instead of asserted. Delete the
generated image and nothing changes; edit one number in the CSV and the film is different with
nothing else touched. There is no PNG in `examples/revenue/`, and a test fails if one appears.

The R program does not choose how the chart looks either. It is _handed_ the box it must fill and
the deck's own palette — width, height, base type size, background, foreground, muted, accent —
through its environment, which is [`decision:42`](archaeology/decisions/) reaching across a process
boundary. There is no key that could override one of them.

And the narration can talk into it. The program says _where_ it drew each panel; cuecraft decides
what being talked about looks like, in the vocabulary every other composition already uses — so when
the sentence "Asia Pacific doubles across the year" is spoken, the rest of the chart dims for eight
tenths of a second and that panel keeps a quiet mark afterwards. The deck writes
`activates: asia-pacific`, and no coordinate, no colour and no duration
([`decision:57`](archaeology/decisions/)).

Needs R: `npm run bootstrap:r`. See [Computing an exhibit](#computing-an-exhibit).

### 7. Self-demo — the practical core

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
actors, and who sends what    graph layout, and every edge route
narration cues                which composition each slide gets
which cue is about what       type size, position, colour
whether to show subtitles     which sentence is on screen, and when
a program, and its inputs     the box and palette that program is handed
what a picture can be asked   where a computed picture dims, what it marks, and when
                              camera framing, pacing, and when not to move
                              portal transitions
                              where a scope returns to, and what it restores
                              how a population is arranged, and how fast it fills
                              lane order, row height, and how a message label wraps
                              which messages are replies, and who is waiting on what
                              how long a step nobody narrates should last
                              where a computed picture sits, and how large
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
   |  content -> composition     deterministic, twelve archetypes
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

One deck needs a second bootstrap. `examples/revenue/` hands a computation to R, so it needs an R:

```bash
npm run bootstrap:r      # once: installs R through Homebrew if it is missing, then verifies

npm run render -- examples/revenue/revenue.yaml -o out/revenue.mp4
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

**Who speaks.** A deck may name more than one narrator, and choose between them at three lexical
scopes — the deck, a slide, and a single sentence:

```yaml
narrators:
  reader: { voice: af_heart }
  aside: { voice: bm_george }

defaults:
  narrator: reader

slides:
  - slide: { title: "Two voices, one clock" }
    say:
      - "The reader says this."
      - speech: "And this is the other one."
        narrator: aside
      - "The reader again — nobody had to say so."
```

Resolution is **lexical**, not stateful: a cue takes its own narrator, else its slide's, else the
deck's. A narrator named on one sentence never becomes the narrator of the next, so a cue means the
same thing wherever it is read from. A deck that names nobody uses `defaults.voice` exactly as it
always did. What a narrator changes is which voice one synthesis call gets, and nothing else — two
voices never overlap, nothing is mixed, and clip lengths still set the timing.
[`examples/aside.yaml`](examples/aside.yaml) is fifty seconds of it.

**Subtitles.** `defaults: { subtitles: true }` puts the narration on screen while it is being
spoken. There is nothing else to write — no timestamp, no position, no size, no colour, and no
per-slide or per-cue key — because a subtitle is a projection of narration that has already been
synthesized, measured and placed. A cue appears on exactly the frame its clip was placed at and
holds until the next one starts, so an authored `pause:` is bridged rather than blinked through,
and nothing is ever read over a slide that is leaving. Sentences are shown whole; when one is too
long for the measure, the type steps down rather than the words dropping off. If the deck names a
cast _and actually changes speaker_, each line is labelled with the narrator's name in a colour of
their own — a name, never a provider voice. There is deliberately no word-by-word reveal:
cuecraft measured the clip, not the words in it. [`examples/onscreen.yaml`](examples/onscreen.yaml)
is the whole feature in three slides.

**Semantic anchors.** An element can carry an identity, and a cue can say it reaches it.
`activates:` is not a timestamp — cuecraft derives the moment from the measured audio, so rewording
narration can never desynchronize a deck, and an identity nothing declares is a compile error.

**Saying an earlier sentence again.** `recall:` names an anchor an earlier slide already activated,
and plays that moment back — the same audio, the same picture, the same speaker's name on the
subtitle — before cutting straight back to where it left off.

```yaml
say:
  - speech: "We saw this fail once already."
  - recall: settlement # the earlier cue that wrote `activates: settlement`
  - pause: 700ms
  - speech: "That was the first charge."
```

The anchor is the whole of the reference: there is no timecode, no clip name, and no second copy of
the sentence. What comes back is the earlier slide rendered frame for frame over **that one speech
cue's** measured interval — its elements light up again exactly as they did, and nothing is
synthesized a second time. The window is the clip and only the clip: an authored `pause:` beside the
anchored sentence, and the speech on the far side of it, are outside it (see `dragon:25`). A recall
must name exactly one _earlier_ root-level anchor; missing, ambiguous, forward and same-slide
references are all compile errors that name what they found.

It is drawn as a **quotation card**. The present slide stays on screen and recedes; the recalled
canvas is inset and outlined in the deck's accent, with a footer beneath it naming the slide it came
from and counting the quotation out — so the frame carries two progress positions at once, the
present one along the bottom edge and the historical one inside the card. The recalled sentence is captioned inside the card too, in the words
and the voice it was first said in. Playing it full-bleed was tried first and read as ordinary
progression rather than as evidence ([`decision:44`](archaeology/decisions/), extended by
`decision:45`); there is no filter, no fade and no authored control over any of it. [`examples/retry.yaml`](examples/retry.yaml) is a
minute of two people disagreeing about a duplicate charge, settled by playing one of them back.

**What the content is.** A slide carries at most one body, and which one it is says what the
content _means_. The body picks the composition; shape decides only within the list role.

| body                                    | composition                                              |
| --------------------------------------- | -------------------------------------------------------- |
| `world` — entities and relations        | **atlas** — a laid-out graph, larger than the frame      |
| `protocol` — actors and messages        | **transcript** — lanes across, time down, a camera       |
| `figure` — `timing` or `anchors`        | **figure** — what this compilation derived               |
| `code` — a specimen                     | **specimen** — the source full width, monospace, sized   |
| `formula` — lines of mathematics        | **formula** — set by KaTeX, centred, sized to fit        |
| `series` — a bounded population         | **series** — a derived field, filling in reading order   |
| `exhibit` — an R program and its inputs | **exhibit** — a picture computed during this render      |
| `change` — one source becoming another  | **revision** — the changed lines swapping in place       |
| `steps` — stages of a transformation    | **cascade** — descending and stepping right              |
| no body                                 | **statement** — the title is the slide, at display scale |
| `bullets`, ≤6 items, ≤24 chars          | **matrix** — a field of terms under hairlines            |
| `bullets`, ≤6 items, ≤38 chars          | **index** — numbered rows                                |
| `bullets`, anything longer              | **lead** — heading in its own column, points beside it   |

An entity inside a `world` can carry a `detail:`, which is a body like any of the above — so the
inside of a concept is not a tenth archetype, it is one of these nine drawn at concept scale.

### Computing an exhibit

**Experimental, and needs R.** Every other body is content cuecraft can read. An `exhibit` is
content it delegates: a program to run, and the files that program may read.

```yaml
slide:
  title: "Revenue by quarter and region"
  exhibit:
    run: examples/revenue/quarterly-revenue.R
    with:
      transactions: examples/revenue/transactions.csv
    shows: [north-america, europe, asia-pacific, latin-america]
```

The program runs during `cuecraft render`, in a stage of its own **before** any narration is
synthesized — so a typo in an `aggregate()` call costs a second rather than a minute of Kokoro —
and the picture it produces becomes the slide's whole visual.

**There is no `image:` key.** A deck cannot name a PNG in the checkout and show it, by decision
rather than by omission ([`decision:55`](archaeology/decisions/)): a slide that could display a
checked-in image could display a stale one, and the whole claim an exhibit makes is that the
picture was computed from the source data on this run. `run:`, `with:` and `shows:` are the only
three keys, every path must be inside the checkout, and there is nothing to write about size,
position, colour, format or output filename.

**What the program is told**, through its environment — it parses nothing:

```
CUECRAFT_OUTPUT_DIR       the directory to write into; also the process's working directory
CUECRAFT_INPUT_NAMES      every declared input name, space separated
CUECRAFT_INPUT_<NAME>     one declared input's absolute path (hyphens become underscores)
CUECRAFT_WIDTH / _HEIGHT  the box the picture has to fill, in pixels
CUECRAFT_POINTSIZE        base type size, sized for a slide rather than for a page
CUECRAFT_BACKGROUND / _FOREGROUND / _MUTED / _ACCENT     the deck's own palette
```

The last two lines are the part that matters. The program is **handed** the box and the palette
rather than choosing them, which is [`decision:42`](archaeology/decisions/) — a composition is laid
out inside the box it was given — reaching across a process boundary. That is what keeps "an author
cannot set a size or a colour" true through the escape hatch rather than only up to it.

**What the program says back**, on stdout, one line per output:

```
#cuecraft output png quarterly-revenue quarterly-revenue.png
```

**stdout describes outputs; the filesystem carries them.** Nothing is discovered by scanning: an
output that was not declared does not exist. The file is named relative to the output directory, so
a declaration cannot reach outside it. Every other line of stdout is ordinary R diagnostics —
`print()` and `message()` keep working, and what they said is quoted back if the run fails. A
declared file is checked all the way to its bytes: it must exist, be a file, be non-empty, and
begin with a PNG signature and header, whose width and height cuecraft reads back out.

A slide shows one picture, so a program declares exactly one output. PNG is the only type; SVG is
parked with its reasons attached ([`idea:24`](archaeology/ideas/)).

**Talking into the picture.** A program may also say _where_ it drew something, in fractions of the
image it produced:

```
#cuecraft region asia-pacific 0.5430 0.1377 0.7543 0.8192
```

and the deck reaches it with the vocabulary it already has:

```yaml
say:
  - speech: "Asia Pacific doubles across the year."
    activates: asia-pacific
```

Cuecraft then draws its **existing** activation treatment there — the rest of the picture dims for
the moment the sentence lands, and the region keeps a quiet mark once it has been spoken about,
which is [`decision:23`](archaeology/decisions/) applied to a raster. There is no key for a colour,
a border, a duration or a coordinate, and emphasis is subtractive because an image cannot show part
of itself at a different opacity.

`shows:` is the identities the picture will have, and it exists because of an ordering: `activates:`
resolves at parse time and R runs afterwards. It is not a second copy of something cuecraft could
know — cuecraft cannot know it yet — and **materialization refuses a mismatch in either direction**,
so the deck and the program cannot drift apart:

```
cuecraft: materialize failed: slide 4: quarterly-revenue.R and this slide disagree about what the
picture shows; the slide shows "latin-america", which the program did not draw; the program drew
"latin_america", which the slide does not show
```

Narration reaches whatever the program was willing to name, and nothing finer. It cannot reach the
third bar unless the program declares the third bar
([`decision:57`](archaeology/decisions/)).

**There is no cache.** The program runs on every render. Correct invalidation would have to cover
the source, every input, R's version and whatever packages it has, and getting it wrong shows a
stale picture that looks entirely right ([`idea:22`](archaeology/ideas/)).

Failures name the slide and quote R:

```
cuecraft: materialize failed: slide 4: examples/revenue/quarterly-revenue.R exited 1

  R stderr:
    Error in aggregate.formula(...) : object 'revenu' not found
    Execution halted
```

Compiling a deck with an exhibit **executes code from that deck**. Paths stay contained — the
program and every input must be inside the checkout — but a `.R` file in the checkout is a program,
and rendering somebody else's deck runs it.

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

**Protocols — experimental.** A body can be an ordered _exchange_: who the parties are, and what
they say to each other.

```yaml
protocol:
  actors:
    client: Client
    gateway: API gateway
    auth: Auth service
  steps:
    - from: client
      to: gateway
      message: POST /orders
      say: The client begins by sending its request to the gateway.
    - from: gateway
      to: auth
      message: validate token
```

This is the one body whose narration lives _inside_ it, and that is the whole of what it is
testing. Everywhere else an element declares an identity and a separate `say:` reaches it by name;
here the step and the sentence about it are one thing said twice, and the coupling between them is
**position in a list** rather than an identity typed on both halves
([`decision:34`](archaeology/decisions/)).

- **`message:` is required, `say:` is not.** The message is what the diagram shows — an arrow with
  no label is a line. The narration is what the film adds, and a protocol is allowed to have
  stretches nobody talks over.
- **A silent step still happens, at a derived pace.** How long it gets comes from its label's
  length and its position in a run of silent steps, floored so two arrows never read as one event
  and capped so a silence never reads as a fault ([`decision:35`](archaeology/decisions/)). There is
  no `dwell:`, and adding one would be admitting the pacing cannot be derived.
- **An entry's own `say:` becomes a prologue**, spoken over the cast before anything is sent, and is
  the one place `activates:` appears — an actor is an ordinary element, so a prologue reaches one
  exactly as it reaches a bullet. A protocol that needs no prologue writes no `say` at all, and it
  is the only body that may.
- **Lane order is the written order and nothing reorders it.** A party stays where it was put, which
  is the one thing this notation gives a viewer for free and the reason no layout engine is
  involved.
- **A column may be relet, but never reassigned.** An actor's live interval is known before anything
  is drawn, so a column whose party finished long enough ago can be given to one that has not yet
  arrived — with the old lifeline closed by a terminator and the new party established in its own
  right. Nothing that is still alive ever moves, and a protocol where everybody overlaps everybody
  pays nothing at all ([`decision:38`](archaeology/decisions/)).
- **Replies are derived, or they are withheld.** The message order implies a call stack, and reading
  it gives dashed returns and a bar on the lifeline of whoever is holding an unanswered call — for
  nothing, and correctly, on a request/response protocol. It is _silently wrong_ on a
  notification-driven one, and no structural test separates the two. So the notation is applied only
  where the whole exchange provably balances, and withheld entirely otherwise
  ([`decision:37`](archaeology/decisions/)). `examples/tap.yaml` gets it; `examples/deploy.yaml`
  does not, and every arrow there carries its meaning in its direction alone.
- **Nothing is authored about the picture.** No lane position, no colour, no note, no divider, no
  guard, no duration, no camera instruction — and **no `parallel:`**. Two things happening at once
  is a real gap and it is deliberately unbuilt ([`idea:17`](archaeology/ideas/)).

`examples/tap.yaml` is the friendly one and `examples/deploy.yaml` is the hostile one; the second
exists to break the automatic policies, and the archaeology records where it did.

**A state machine, and one run of it.** A body can be what something _can_ do, plus one ordered
walk through that:

```yaml
machine:
  states:
    closed: Closed
    opening: Opening
    open: Open
  transitions:
    call-accepted: { from: closed, to: opening, on: call accepted }
    opened: { from: opening, to: open, on: open limit reached }
  scenario:
    - take: call-accepted
      say: A call releases the door from its closed state.
    - take: opened
```

The two halves are the point. Every other body is a structure narration tours _or_ a sequence that
carries its own narration; this is both, and keeping them apart is what makes it a state machine
explainer rather than an animated event log
([`decision:46`](archaeology/decisions/)).

- **A transition is timeless; an occurrence happens at a time.** `on:` is required and describes the
  edge forever. `say:` lives on the _occurrence_, so the same transition can happen four times and
  be narrated differently — or not at all — on each of them, which is not something a `say:` on the
  transition could express.
- **Declared-but-untaken topology is the whole argument.** The branch the run does not take is the
  reason the branch it does take means anything, so it is drawn at full legibility from the first
  frame and never fades. There is no trace-only shorthand and there will not be one.
- **Nothing is initial, final or accepting.** The run's start is the first occurrence's `from` and
  its stop is the last one's `to`, both inferred, and the film makes no claim that where the
  explanation stopped is where the machine was going.
- **Continuity is checked.** Every occurrence must leave the state the last one arrived at, and a
  run that teleports is a compile error naming where the machine actually was.
- **Occupancy is persistent, exclusive and released.** Exactly one state is current, it is the only
  warm thing on the frame, and it flows to the next state as the traveller crosses. The three-state
  activation envelope every other archetype uses cannot say that — `heat` is a transient and
  `degree` never comes back down — so this is the first composition with a fourth quantity
  ([`decision:47`](archaeology/decisions/)).
- **The layout never sees the run.** States are placed from the topology alone, once, so permuting
  the scenario moves nothing and the machine stays a place rather than becoming a highway. Cycles,
  backward edges, parallel transitions and required edge labels are dagre's; self-loops are drawn
  by hand into room reserved through it ([`decision:48`](archaeology/decisions/)).
- **Nothing is authored about the picture.** No rank, no side, no route, no colour, no dwell, no
  camera instruction — and no composite states, no regions, no pseudostates, no guards as separate
  concepts, and no second scenario.

`examples/elevator.yaml` is the friendly one and `examples/leases.yaml` is the hostile one: a
nine-state leased job runner with a self-loop on a six-exit hub, two transitions between one pair, a
sixty-five character label, two backward reclamation cycles, and four branches the run never takes.

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
- **`exhibit` is the newest experiment and the least settled.** It runs an R program during
  compilation, which means a deck can execute code and is reproducible only up to whatever R is
  installed — the Kokoro weights are pinned by a lock file and R is not
  ([`dragon:33`](archaeology/dragons/)). The box the program draws for is settled before the room it
  lands in is known ([`dragon:31`](archaeology/dragons/)), and narration reaches only what the
  program was willing to name ([`decision:57`](archaeology/decisions/)).
- **Child modules, `series` and `protocol` are experiments, not supported features.** A handful of
  artifacts and one pair of eyes. The compiler recurses; the demonstrated contract is a child and a
  grandchild, and no claim is made about anything deeper
  ([`decision:31`](archaeology/decisions/)). `series` is a quantifier and will not be grown into
  control flow ([`decision:33`](archaeology/decisions/)). `protocol` is sequential and will not be
  grown into concurrency without a decision saying so.
- **Not a PowerPoint replacement.** No import, no export, no editing surface.
- **Not a general motion-graphics DSL.** You cannot express an arbitrary animation, and adding a
  way to would defeat the point.
- **What it is for:** finding out how far semantic authoring goes before mechanical authoring
  becomes necessary. Feature expansion is deliberately paused while these artifacts are
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
npm run test:tts       # src/tts/**/*.live-test.ts     — real Kokoro synthesis
npm run test:r         # src/compute/**/*.live-test.ts — real R, over stdin, drawing real PNGs
npm run test:render    # *.render-test.ts              — synthesis + headless Chromium + ffprobe
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
