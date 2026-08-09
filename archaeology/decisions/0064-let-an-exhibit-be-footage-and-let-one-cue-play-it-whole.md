---
id: dec_01KZMDMSSN1DP7CWX082RYSZPC
sequence: 64
kind: decision
status: accepted
created: 2026-08-09
---

# Let an exhibit be footage, and let one cue play it whole

## Context

decision:63 ended with the sentence that made this round possible and the one that made it
necessary: cuecraft's timeline is the deterministic execution trace of a straight-line temporal
program, and cuecraft contains **no temporal medium at all**. idea:27 parked the design for one and
gated it behind "a scene-type decision", on the reading that a thing with a time axis on a slide is
what decision:2 and idea:2 are about.

That gate turned out to be pointed at the wrong seam, and finding out is most of this decision.

A temporal medium does not need a scene type. It needs a fourth thing an exhibit's program is
allowed to hand back. decision:55 defines an exhibit as evidence a foreign program computed;
decision:56 defines a one-line protocol for declaring it and says adding a type is "a line in a list
plus a validator"; decision:60 took that from one type to three and re-read the boundary as
**content cuecraft did not compute** rather than content cuecraft cannot understand. A film is
content cuecraft did not compute. Everything about a slide — the heading, the room, the palette
handed across the process boundary, the refusal to let an author name a file — is already right for
it.

So the question is not "may a slide be a video". It is: **what is different about an artifact that
has a length?**

Exactly one thing, and it is the thing decision:63 spent a round preparing for. A picture, a drawing
and a table are drawn into a room and occupy no presentation time whatsoever; the narration decides
how long the slide is and they are simply *there* for it. A film is placed into the **narration**,
and the film's length is what the cursor advances by. It is the first output of a foreign program
that can make cuecraft's own film longer.

## Decision

**A program may hand back a film, and the narration plays it whole.**

    exhibit:
      run: examples/kmeans/kmeans.R
      with:
        points: examples/kmeans/points.csv

    say:
      - "R ran six passes of it while this was being compiled."
      - play: kmeans
      - "Three clusters, and the sixth pass moved nothing."

`video` is the fourth entry in decision:56's list. `footage` is the fourth arm of `ExhibitResource`,
beside `picture`, `drawing` and `table`, and it is placed by the same `exhibit` archetype that
places a picture: in the room it was drawn for, contained, whole, under the heading that says what
it is.

**Every refusal decision:55 makes about pixels is inherited whole and none is weakened.** There is
no `video:` key and there will not be one. A deck cannot name an MP4 in the checkout and show it;
the only way to get moving pixels onto a cuecraft frame is to say what computes them, from what, and
the computation happens on every render. Deleting the generated film changes nothing and editing the
input data changes the film — which is a *stronger* property here than for a still, because a
checked-in animation is the single most tempting thing in this whole design to hand-edit.

**The length is measured by cuecraft, from the container, and never declared.** `../compute/mp4.ts`
walks the box tree for `mvhd`'s timescale and duration, `tkhd`'s display size, and every track's
handler. The asymmetry against decision:56 — where the program declares what it made — is
deliberate and is the sharpest version of `pngSize`'s argument. A program that lied about a
picture's width puts a picture in the wrong box. A program that lied about a film's *length* puts a
hole in the timeline, because that number is what the narration cursor advances by, and a second of
frozen last frame is invisible to everything downstream of the measurement.

**`play:` is the third verb of the narration language**, after `enter:` and `recall:`, and it is the
second of the two whose duration is **borrowed**. Everything decision:63's table says about a recall
is true of it: the measurement was taken at another stage, nothing between there and
`buildTimeline` may invent a different number, and the one rounding rule converts it exactly as it
converts a clip's. It names the output the program declared, for decision:57's reason — reading the
YAML should say what the slide is going to do without running R — and materialization refuses a
`play:` the program did not produce, footage a deck never plays, and a `play:` on a slide whose
program handed back a still.

**A medium may not ask for time.** It has a length; it does not negotiate. Nothing about the
rendering of a film can lengthen a scene, and the scene grows by exactly the medium's duration
through `deriveSceneMs` unchanged.

### The medium is silent, and that is a refusal rather than a mute

**A film that carries an audio track is refused at materialization.**

cuecraft has one producer of sound, and it is the narration. Accepting a sounded medium would put
the second one on the far side of a process boundary, and the questions that immediately follow —
whether it ducks under speech, whether an author may set a level, what happens when a rendezvous
freezes a frame that was mid-word — are an audio mixer, which is a project and not a paragraph.

`<OffthreadVideo muted>` would have made this invisible instead. That is exactly why it was not
used. A program that wrote an audio track believed the sound mattered; silently discarding it is
cuecraft deciding that it did not, and the deck author would find out by listening to eleven slides
of a film that was already synthesized. Refusing costs one line in the R program (`-an`) and one
sentence in a diagnostic, and it keeps "cuecraft has one producer of sound" a fact rather than an
implementation detail of one component.

## Consequences

- **The scene seam was never crossed, and idea:2's question is still unasked.** The first temporal
  medium arrived as an output type, not as a scene type, and nothing in `layout.ts`, `body.ts` or
  the composition set learned a new kind of slide. Whether a *second* scene type is possible is
  exactly as open as it was.
- **A film is the first output that costs the film time**, which makes `MAX_TABLE_ROWS`'s kind of
  ceiling meaningful in a new way: a medium longer than a couple of minutes is a video with a slide
  around it rather than evidence a presentation holds up. The ceiling is stated where the
  measurement lands.
- **The encoder stays on the far side of the boundary.** cuecraft gains no ffmpeg dependency, no
  frame-sequence input, and no muxing — decision:5's bargain, unchanged. What it does gain is a
  *deck* that needs ffmpeg, which widens dragon:33 from "reproducible up to whatever R is
  installed" to include whatever else the program shells out to. The bootstrap now verifies it for
  the same reason it verifies cairo.
- **Any producer of an MP4 is now conceptually equivalent.** Python, a screen capture, a simulation
  — nothing in the design is about R except the one runner decision:55 already named itself for.
  The protocol line, the measurement and the placement are all indifferent to what wrote the file.
- **Still no cache.** A render re-encodes, which for the k-means demo is a few seconds of ffmpeg,
  and decision:56's argument against caching gets stronger rather than weaker: a stale *animation*
  is a stale picture with more of it.
- **This decision is atomic playback only.** A medium that stops at a semantic state so the
  narrator can speak over it is idea:27's other half, and it is deliberately a separate decision
  gated on this one working.
