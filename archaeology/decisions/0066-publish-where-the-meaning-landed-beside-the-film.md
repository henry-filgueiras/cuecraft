---
id: dec_01KZMJG7WJ136VAW6F5KQP94AJ
sequence: 66
kind: decision
status: accepted
created: 2026-08-09
---

# Publish where the meaning landed, beside the film

## Context

An MP4 has forgotten everything. It is the one artifact cuecraft produces that carries no trace of
what it is *of* — a post-hoc tool can recover scene cuts by differencing pixels and speech by
transcribing audio, and it still cannot recover an *address*, because the address was never in the
picture.

idea:26 named that and parked it behind one gate: *adopt when something outside cuecraft actually
wants to read an address.* Something now does, and it announced itself as a failure. An agent asked
to inspect a rendered deck sampled the film at a fixed interval, covered every slide but the last,
and missed that one because it was shorter than the sampling period. Nothing about it was unlucky.
Uniform sampling cannot see a slide shorter than its period, and the film has no way to say so.

`buildTimeline` knew the exact frame that slide started on, and dropped it on the floor at
`renderMedia`.

### What the timeline already knows, and how much of it is addressable

The whole of this round's feasibility is one question asked of each compiled record: **does an
identity the author wrote survive into the frames?** Where it does, a symbol is a projection.
Where it does not, a symbol would have to be keyed by position, and a position is not an address.

| record | authored identity | survives to the timeline | exportable |
| --- | --- | --- | --- |
| `Scene` | the slide's `title` | yes, verbatim | **yes** |
| `Clip` | none — a sentence is not named | its text does, via `facts` | yes, positionally |
| `Anchor` | `activates:` | `id` **and** `address` | **yes** |
| `Span` | `fills:` | `id` and `address` | **yes** |
| `Beat` | `step-N` / `take-N`, compiler-assigned and reserved | `address` | **yes** |
| `Recall` | `recall:` | `id`, plus the source interval | **yes** |
| `Call` | `enter:`'s target entity | `target`, `scope`, `into` | **yes** |
| `Playback` | `during:` / `replay:` — a state the film reaches | **no** | no |
| camera, portals, attention, fades | none — consumers of time (decision:63) | n/a | no |

The last two rows are the interesting ones, and only one of them is a surprise. `Playback`'s is
recorded separately as dragon:39: `footage.ts`'s `queue()` groups cues under the moment they name,
uses the name to look up a time, and then emits a slice carrying seconds and a file path. The
authored name is consumed at lowering and reaches nothing downstream — so the one query a temporal
exhibit makes worth asking, *when does the film freeze at `pass-3`*, is exactly the one that cannot
be answered today.

`title` being the slide's identity is not a new claim invented here. `change.ts` already resolves a
quoted region by `{ file, slide: "<the exact title of a slide in it>" }` and says so in those words:
*"that is how a region is named"*. Slide titles are already load-bearing across files, and a
retitled slide already breaks references.

### The coordinate system is not open for discussion

decision:9 puts one rounding rule in one place and decision:63 establishes that `buildTimeline` is
the only place relative seconds become absolute frames. A sidecar publishing seconds as its truth
would have every consumer re-deriving frames under its own rounding rule, which is the exact drift
`framesFor` exists to prevent.

## Decision

**Cuecraft emits a symbol table beside every rendered MP4: a deliberately small, versioned,
self-identifying projection of where authored semantic objects landed in the realized film.**

    presentation.yaml -> cuecraft -> out/demo.mp4          what the audience sees
                                     out/demo.symbols.json where the meaning landed

### It is a projection, not a serialization

`symbolTable(compiled, timeline)` lives in `compile/symbols.ts` as a sibling of `freezeFacts`, at
the same freeze boundary and for the same reason: everything upstream is settled, and nothing
downstream may write to it. The two differ in exactly one way, and it is the reason they are two
modules. **Facts are what the compilation derived and the film then shows; symbols are what the
compilation derived and the film cannot show.** So facts ride on `Timeline` into the browser, and
symbols never do — nothing in the renderer imports this module, and the sidecar is written after
`renderMedia` returns.

Nothing in the export is `Timeline`'s shape. There is no element index, no clip index, no scope
object, no layout archetype, no workspace path, no React identity, and no field whose meaning is
"an offset into an internal array". Adding a kind or a field is free; changing what an existing
field means costs a `version` bump. That is the whole of the compatibility contract, and it is what
keeps idea:3 parked — an external consumer pins this document, not the compiler.

### The file

`<output>.symbols.json`, derived from the *output* path by replacing its extension, so `-o
out/demo.mp4` produces `out/demo.symbols.json`. A projection in decision:1's sense: always safe to
delete, never hand-edited, never committed.

    {
      "format": "cuecraft-symbols",
      "version": 1,
      "coordinates": { "unit": "frame", "interval": "[fromFrame, toFrame)", "seconds": "derived" },
      "presentation": { "title": "Cuecraft" },
      "media": { "file": "demo.mp4", "fps": 30, "width": 1920, "height": 1080,
                 "durationFrames": 1427, "durationSeconds": 47.566667 },
      "symbols": [ ... ]
    }

`format` and `version` are first so that a tool encountering the file in an output directory can
tell what it is from its first line. `media.file` is a basename rather than a path, because the
sidecar sits beside the film and a document that names an absolute path stops being movable.

### Frames are the coordinate; seconds are a convenience that is never authoritative

Every temporal field is an integer frame. Every `*Seconds` field is `frame / fps` rounded to six
places, present because ffmpeg and human readers want it, and marked derived in the document itself.
No consumer needs to convert anything, and no consumer may convert back.

### Intervals are half-open: `[fromFrame, toFrame)`

`toFrame - fromFrame` is the duration in frames, `toFrame` is the first frame the symbol is no
longer true, and adjacent slides share a number rather than being off by one. Slide symbols tile
`[0, durationFrames)` exactly: contiguous, ordered, non-overlapping, the first starting at 0 and the
last ending at the film's own frame count.

A symbol that is a *moment* rather than a range — an anchor, a beat's start, a recall's start — is
still an interval, because a consumer with two shapes to handle is a consumer that mishandles one.
What each kind's interval means is stated per kind below, and an anchor's is the honest one:
decision:17 makes an activation a transient *and* an accumulation, so the element it names is
established from that frame until its slide ends.

### Keys are authored identity, namespaced by kind

    slide:architecture
    utterance:architecture/3
    anchor:architecture/database
    span:evidence/failures
    beat:handshake/step-2
    recall:conclusion/the-claim
    scope:outside/payment/check

A slide's key slug is its title, lower-cased, with runs of anything outside `[a-z0-9]` collapsed to
a single hyphen and the ends trimmed — which lands in `ANCHOR_ID`'s alphabet, so a key is greppable,
shell-safe and usable as a filename without escaping. A title that slugs to nothing falls back to
`slide-<ordinal>`, which is the only place an ordinal is ever allowed into a key.

Everything else is `kind:<slide-slug>/<address>`, where the address is the structural address
`scope.ts` already assigns with its leading `root/` removed. That is what makes `anchor:outside/
payment/check` unambiguous when two modules both contain something called `check` — the namespace
is the one the compiler already resolves against, not a second one invented here.

Two symbols that would collide take `-2`, `-3` in emission order. Collisions are possible (two
slides titled "Results"; one sentence recalled twice) and a deterministic suffix is better than
either a hash or a refusal to compile.

An utterance is the one kind keyed by position, because a sentence has no authored name. It is
1-based within its slide in frame order, and the document says so.

### A slide's representative frame is the last frame of its last sentence

    snapshotFrame = last clip's `from` + its `durationInFrames` - 1

clamped into `[contentFromFrame, contentToFrame)`, and falling back to `contentFromFrame` on a slide
with no speech.

Three properties make it a safe place to look, and each is a consequence of something already true
rather than a constant chosen here:

- **The slide has fully arrived.** Every entry transition is capped to fit inside `pre_say`
  (`sceneMotion` takes `fadeIn = min(fadeIn, before - appearAt)`), and `contentFromFrame` is where
  `pre_say` ends. Nothing scene-level is still moving.
- **Everything the narration was going to establish is established.** Reveals are driven by
  narration reaching elements (decision:14, idea:6), so after the last sentence nothing further
  appears.
- **The slide has not begun to leave.** `fadeOut` lives entirely inside `post_say`, which begins at
  `contentToFrame`.

**The end of the sentence rather than its start, and the reason is a frame that was looked at.** The
rule first written here was the *onset* — where decision:13 puts an anchor, and where a reader would
expect the interesting moment to be. Extracting the frames it chose is how it was found to be wrong:
on a `series` slide, `fills:` accumulates a population **across** the sentence (decision:33), so the
onset is the instant before any of it exists. The snapshot of a slide about counting sixty-four
things showed sixteen of them and a gauge reading zero — a true frame of the film, and a useless
picture of the slide. At the end of the sentence an anchor lit at the onset is still established, a
span has finished filling, a beat is still current, and the sentence's own subtitle is still on
screen, because a cue runs to its clip's end.

**One frame later was also tried, and refused.** The first frame *after* the last sentence completes
a span exactly — "1 of 1" rather than "0 of 1" on the degenerate deck — but it is the first frame
with an empty subtitle band, so it loses the speaker and the sentence. Both frames were extracted
from a real render and compared. The one that keeps the narration on screen is more representative
of the film, and the residue is known and small: a slide whose population fills across its last
sentence is snapshotted one member short of complete, because that is genuinely what the film shows
on the last frame of a continuous fill.

What it deliberately does not claim: that the frame is well-composed, that the camera is in a wide
shot, or that no element-level entrance is in flight. On a deck that descends, the camera is
wherever the last sentence put it. The honest statement is the narrow one — **this is what the slide
looks like when it has finished saying what it had to say** — and the interval fields are published
alongside so a consumer that wants a different point can choose one without guessing where it is
safe.

`contentFromFrame` and `contentToFrame` are published on every slide for exactly that: they are the
narration's own window, and the range in which a frame shows the slide neither arriving nor leaving.

### The kinds

| kind | one per | interval means |
| --- | --- | --- |
| `slide` | rendered scene | the slide is on screen |
| `utterance` | synthesized clip | the sentence is being spoken, clip boundary to clip boundary |
| `anchor` | `activates:` | the element is established, from the first audible sound to the end of its slide |
| `span` | `fills:` | the population is accumulating (decision:33) |
| `beat` | protocol step, machine take | this occurrence is the current one (decision:35) |
| `recall` | `recall:` | the film is quoting itself; carries the source interval it replays |
| `scope` | `enter:`/`exit:` pair | the film is inside that module, threshold to threshold |

Every symbol also carries `snapshotFrame`. For a slide it is the rule above; for every other kind it
is `fromFrame`, because those symbols *are* moments and the moment is the thing worth looking at.

### What is refused, and why

- **`playback`** — a film's slices and holds. Refused because the address does not exist: dragon:39.
  Emitting positional playback symbols would publish "the film played, then stopped, then played"
  without being able to say *at what*, which is the one thing anybody would ask.
- **`exhibit`** — an exhibit occupies its slide for the slide's whole extent, so the symbol would be
  the slide symbol under a second name. Nothing new is addressable.
- **subtitle cues** — one per clip, derived from the clips, and `utterance` already carries the same
  interval with the same text. The right export for a subtitle is WebVTT, which is idea:26's tier 2
  and is a standard rather than a symbol kind.
- **layouts, camera shots, lane allocations, portal passes, anchor transients, scene fades** —
  decision:63's table classifies every one of these as a *consumer* of time that cannot extend it.
  They are decisions about how the film looks, they are re-derived in the browser on every render,
  and pinning them here would make an internal rendering policy an external contract.

## Consequences

- idea:26 is adopted at tier 3, with tier 2 (WebVTT, MP4 chapter atoms) and MP4 metadata embedding
  still parked. The sidecar being diffable, greppable and readable without `ffprobe` is the reason
  it is first, and that reasoning is unchanged.
- decision:2's v0 boundary is crossed deliberately and narrowly: cuecraft now has a second output
  target. It is not a scene type, it adds nothing to the grammar, and no authored source can name
  it or change it — an author cannot make a symbol, only compile one.
- `timeline.ts`'s note that its anchors could one day be read backwards is now true. `Anchor` is the
  record this reads in the other direction, unmodified, as it was designed to be in sprint:4.
- The compiler gains an external contract it did not have. The compatibility rule above is what
  makes that survivable, and the projection being written by hand rather than derived from
  `Timeline`'s shape is what makes the rule enforceable — a field only appears in the sidecar
  because somebody typed it there.
- dragon:39 is opened by this work rather than closed by it. The symbol table is now the instrument
  that would show a temporal exhibit's freeze points, and it is the reason the missing identity is
  worth fixing.
- A future round that wants local media coordinates (decision:63's rendezvous design, idea:27) has
  somewhere to put them: a `playback` kind with both global frames and media-local ones, once
  dragon:39 gives it a key.
