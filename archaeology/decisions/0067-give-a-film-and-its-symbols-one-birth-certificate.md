---
id: dec_01KZMN9G84WRPWZKMW82TZJWS1
sequence: 67
kind: decision
status: accepted
created: 2026-08-09
---

# Give a film and its symbols one birth certificate

## Context

decision:66 exists so that a downstream tool does not have to guess where things are in a film.
dragon:40 records that the guessing was not eliminated so much as moved one step: `cuecraft snapshot`
reads whatever `.symbols.json` sits beside a video, resolves a key to a frame, and extracts it —
and a sidecar left over from an earlier render is still valid JSON, still parses, and still resolves
every key to a number. The extraction succeeds, writes a PNG, prints a semantic key beside a
timecode, and exits zero. `symbols.ts` had said so in prose since the day it was written and nothing
acted on it.

That is a worse failure than the one decision:66 fixed, not a milder one. A tool that sampled
blindly at least knows it was guessing.

### Provenance, not integrity

The instinct is a tiered check ending in a digest of the MP4's bytes, and the last tier is the one
to refuse. There is no adversary here and no corruption; the two files are siblings from one
compilation. What has to be established is not *are these the bytes I wrote* but **do these frame
numbers describe this film**, and the two come apart in both directions:

- A re-encode changes every byte and moves no frame. `scripts/compress-for-upload.sh` does exactly
  that on purpose, and its output is still correctly described by the original symbols.
- Re-rendering the same deck over the same path leaves a byte digest that matches the film which is
  *there* rather than the film the sidecar was born beside — so the one case that matters is
  precisely the case a byte digest cannot see.

It is also the wrong shape for the cost profile. A shell loop over `cuecraft snapshot --symbol …`
pays the check once per marker; at twenty megabytes each that is not free, and the obvious repair —
a cache keyed on path, size and mtime — answers one projection's staleness question by adding a
second projection that can go stale.

### What the two artifacts actually share

A parent. Both are derived from the final `Timeline`, which is where decision:63 established that
relative seconds become absolute frames and where decision:9 puts the freeze.

An **input** digest — deck source, version, configuration — would be the wrong parent. dragon:33
records that a deck with an exhibit is reproducible only up to whatever R is installed, and
re-synthesized narration moves every measured duration, so input hashing would claim a match across
pairs whose frames differ. The timeline sits downstream of all of it and absorbs it.

## Decision

**A film and its symbol table are stamped with one digest of the timeline they were both derived
from, and frame extraction refuses a pair that disagrees.**

    renderId = sha256(canonical JSON of the final Timeline)

Computed once, in `renderPresentation`, and handed to both artifacts — the film through Remotion's
`metadata`, the sidecar through `symbolTable`'s `media.renderId`. One function, one input, so the
two cannot disagree by construction rather than by discipline.

Deterministic rather than a random identifier, which buys two things: tests stay stable, and two
renders of an identical timeline *agree* — correctly, because a film rendered from the same timeline
genuinely is described by the same symbols. It costs microseconds over a structure measured in
kilobytes; the largest deck in this repository serializes to about 27 kB.

### Canonical means sorted

`JSON.stringify` emits keys in property-insertion order. That is deterministic for one build and is
not a property worth depending on: it would make the digest a function of the order fields happen to
be assigned in `timeline.ts`, so reordering two lines of an object literal would invalidate every
symbol table in existence without moving a frame. Keys are sorted recursively; array order is left
alone, because in a timeline an array's order *is* meaning. Numbers are left to `JSON.stringify`,
whose double formatting has been the shortest round-tripping representation since ES2018 and is
stable across engines. Nothing is rounded — a digest that ignored the last bit of a measured
duration would be claiming two films that differ by a frame are the same film.

The digest is over the **whole** timeline rather than a chosen subset, because a subset would be a
second statement of what affects the picture and would drift from the first one. It is machine
independent, which was checked rather than assumed: no real timeline contains an absolute path, and
a test pins that so a future field carrying `repositoryRoot()` into the timeline fails in the suite
rather than in somebody's second checkout.

### It rides in the MP4's `comment` tag, and that is forced

ffmpeg's mov muxer writes only the tags it recognises unless given `-movflags use_metadata_tags`,
and Remotion spends its single `-movflags` argument on `faststart`. A bespoke key like
`cuecraft_render_id` is accepted by `renderMedia`, passed to the encoder, and **silently dropped
from the file** — measured, not assumed. Remotion also always writes a comment of its own and
prepends it to anything it is given, so a cuecraft film reads:

    Made with Remotion 4.0.506; cuecraft renderId=sha256:6b74ded867ad…

which is why the reader searches the tag rather than matching it whole. The stamp is
algorithm-qualified so a film written by a future cuecraft using a different digest reads as
*unknown* rather than as a mismatch, and it stays greppable: `strings film.mp4 | grep cuecraft`.

Reading it back is a header read — `ffprobe -show_entries format_tags` returns in about 15 ms
whether the film is 300 kB or 20 MB, measured on both. That is the property the design depends on,
because the check is paid once per invocation and invocations come in bulk.

### The verdict is tri-state, and `unknown` is not an error

    matched      the pair agrees; extract, silently
    mismatched   positive evidence they disagree; refuse, name the fix, write nothing
    unknown      no evidence either way; say so once on stderr, and proceed

The burden is deliberately this way round. Every film and sidecar written before this existed lacks
a stamp, as does any film remuxed by a tool that dropped its `udta`, and a check that read "cannot
tell" as "wrong" would break working artifacts to guard against a case it had no evidence for. The
three reasons for `unknown` are kept apart rather than collapsed, because which artifact predates
the stamp is what tells somebody whether re-rendering would fix it.

A mismatch refuses outright, with no override flag. Adding one later is free; removing one is not,
and an escape hatch on a check whose entire purpose is to stop a silent wrong answer is the first
thing a script would reach for.

### Where it lives

- `compile/provenance.ts` — the digest, the stamp's encoding and parsing, and the comparison. Pure,
  no I/O, and separate from `compile/symbols.ts` because `render.ts` needs it and decision:66
  establishes that nothing in `src/render/` may import the symbol module.
- `compute/tags.ts` — one metadata tag off a film, via ffprobe. Beside `compute/mp4.ts` and
  deliberately not inside it: `mp4.ts` runs during materialization on every deck with a film in it
  and states its own reason for hand-parsing a header rather than spawning a process. That bargain
  is right for it and wrong here, where ffmpeg is already required.
- Verification runs in the CLI at `snapshot` and `snapshots` only. **`cuecraft inspect` takes a
  sidecar and no film, so there is no pair to check** — it stays ffmpeg-free, and nothing about this
  is inside `parseSymbolTable`.

`media.renderId` is optional and additive, which decision:66's compatibility rule already makes
free. **No version bump**: a reader that has never heard of the field ignores it, and bumping would
break every consumer for something they can skip.

### The basename check keeps its job, and it is a different one

`media.file` no longer gates anything — the digest settles whether a pair agrees. It is now the only
thing that can distinguish *you pointed this at the wrong file* from *this film has been re-rendered
since*, which produce the same mismatched digest and have completely different fixes.

## Consequences

- dragon:40 is closed. `symbols.ts`'s standing admission that it could not tell a stale sidecar from
  a fresh one is now false, and the docstring says what does tell.
- `RenderReport` gains `renderId`, so a programmatic caller of `renderPresentationFile` can join a
  film to its symbols without reading either file back.
- ffprobe joins ffmpeg as a requirement of `snapshot` and `snapshots` — the same binary distribution
  in practice, and still not a requirement of `render`, `explain` or `inspect`.
- **Whether `render` should verify what it just wrote was considered and refused.** The stamp landing
  is a property of the pinned Remotion version and its bundled muxer, not of a particular run, so it
  varies per toolchain rather than per render. A per-render self-check would spawn a process every
  time to re-assert something that cannot have changed since the last render, and on a toolchain
  where the tag *was* dropped it would fire on every single render until people stopped reading it.
  It is asserted once, in `pipeline.render-test.ts`, against a real encode.
- A future cuecraft that changes digest algorithm can do so without breaking readers: old films read
  as `unknown` rather than as mismatches, which is the correct answer.
- What this deliberately is not: a manifest, a signature, a chain of custody, or a record of who
  rendered what when. One digest, one tag, one comparison.
