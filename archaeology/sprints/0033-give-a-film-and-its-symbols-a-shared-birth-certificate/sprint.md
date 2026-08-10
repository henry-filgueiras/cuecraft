---
id: spr_01KZMMSQ1XA0QK02A337P2PJNM
sequence: 33
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Give a film and its symbols a shared birth certificate

## Goal

Close dragon:40. Give a film and its symbol table a shared birth certificate, so that
`cuecraft snapshot` and `cuecraft snapshots` can tell whether the coordinates they are about to
trust describe the film in front of them — and refuse, by name, when they do not.

The round is finished when re-rendering a deck over its own output and then extracting a frame with
the previous sidecar fails with a sentence that says what happened, while a matched pair extracts
silently and a pair predating the change still works.

## Rationale

`symbols.ts:156` has named this gap in prose since the day it was written, and nothing acts on it.
The failure it describes is worse than the one decision:66 fixed, not milder: an extraction against
a stale sidecar succeeds, writes a PNG, prints a semantic key beside a timecode, and exits zero. A
tool that sampled blindly at least knows it was guessing.

**The mechanism is settled before the round starts, and dragon:40 carries the argument.** This is a
provenance question, not an integrity question — there is no adversary and no corruption, only two
siblings from one compilation — so the check is a digest of the parent both artifacts derive from:

    renderId = sha256(canonical JSON of the final Timeline)

It is deterministic rather than a UUID, so tests stay stable and a re-render of an identical
timeline correctly reports a match. It costs microseconds over a structure measured in kilobytes.
And it differs exactly when the frame coordinates could have differed, which is the property a hash
of the MP4's bytes does not have in either direction: a re-encode changes every byte while changing
no frame number, and re-rendering the same deck to the same path leaves a byte hash that matches the
film which is *there* rather than the film the sidecar was born beside.

The stamp rides in the MP4's `moov` metadata, which makes reading it a header read at any file size.
That inverts the cost of the common case: a shell loop over `cuecraft snapshot --symbol …` pays the
check once per marker, and once per marker is only acceptable if a matching pair is nearly free.

## Success criteria

- `media.renderId` is present on every symbol table a render writes, and the same value is stamped
  into the rendered MP4.
- The two are produced from one function over one input, so they cannot disagree by construction.
- Verification is **tri-state**: matched, mismatched, or unknown. Unknown is a normal outcome, not
  an error, and covers every artifact written before this round.
- A mismatch refuses the extraction with a message naming what to do about it. A match is silent.
- The check is bounded by the size of the compilation, not the size of the film.
- `cuecraft inspect` still runs on a machine with no ffmpeg, and `parseSymbolTable` still reads a
  sidecar and nothing else.
- The stamp is proved to survive a real Remotion render, by a test, rather than assumed.
- `renderId` is a function of the compilation alone — the same deck compiled in two checkouts on two
  machines produces the same value.

## Non-goals

- **No file hashing of the MP4, at any tier.** dragon:40 has the argument; re-deriving it is the
  failure mode this non-goal exists to prevent.
- **No hash cache** keyed on path, size, mtime or inode. A cache file is itself a sidecar with a
  staleness problem: it would answer one projection's staleness question by adding a second
  projection that can go stale, which is worse than the thing being fixed.
- **No size tier.** It can only ever produce a worse message than the one already available, and a
  tier that never changes an outcome is a tier nobody can reason about.
- **No version bump.** `media.renderId` is additive, which decision:66's compatibility rule already
  makes free. A bump would break every reader for a field they can ignore.
- **No new authored surface.** Nothing in the presentation format learns about this, and no flag
  lets an author set, seed or suppress a `renderId`.
- **No provenance subsystem.** One digest, one tag, one comparison. Not a manifest, not a signature,
  not a chain, and not a record of who rendered what when.

## Outcome

dragon:40 is closed by decision:67. Every success criterion is met, every non-goal held, and the
mechanism was verified against a real encode rather than assumed.

**What shipped.** `renderPresentation` computes `renderIdFor(timeline)` once and hands it to both
artifacts — the film through Remotion's `metadata`, the sidecar through `media.renderId` — so the
two agree by construction rather than by discipline. `snapshot` and `snapshots` compare them before
resolving a key, and refuse a mismatch with a message that names the fix. `inspect` is untouched and
still runs with no ffmpeg on the machine.

**Three things were measured rather than reasoned about, and one of them changed the design.**

A bespoke metadata key does not survive the file. `renderMedia({ metadata })` accepts anything, but
ffmpeg's mov muxer writes only tags it recognises unless given `-movflags use_metadata_tags`, and
Remotion spends its single `-movflags` on `faststart`. `cuecraft_render_id` was accepted, passed to
the encoder, and absent from the output; `comment` survived. That is why the stamp rides in a tag it
does not own the start of — Remotion always prepends `Made with Remotion 4.0.506; ` — and why the
reader searches rather than matches.

The header-read claim holds: `ffprobe -show_entries format_tags` returns in 10–20 ms on a 300 kB
film and on a 20 MB one alike. That is the property the whole cost argument rests on, since a shell
loop over `cuecraft snapshot --symbol …` pays the check once per marker.

Machine independence was checked rather than hoped for. Three real timelines — including one with a
temporal exhibit — were dumped and searched for absolute paths, and there are none. A test now pins
it, so a future field carrying `repositoryRoot()` into the timeline fails in the suite instead of in
a second checkout.

**The calls left open, and what they were settled to.**

Canonicalisation sorts object keys recursively and leaves array order alone. Insertion order would
have made the digest a function of the order fields are assigned in `timeline.ts`, so reordering two
lines of an object literal would have invalidated every sidecar in existence without moving a frame.

The tag is `comment`, forced by the muxer finding above, with the value
`cuecraft renderId=sha256:<hex>` — algorithm-qualified, so a film stamped by a future cuecraft with
a different digest reads as *unknown* rather than as a mismatch.

`render` does **not** verify what it just wrote. Whether the stamp lands is a property of the pinned
Remotion version and its bundled muxer, so it varies per toolchain rather than per render: a
per-render check would spawn a process every time to re-assert something that cannot have changed,
and on a toolchain where the tag *was* dropped it would fire on every render until people stopped
reading it. It is asserted once, against a real encode, in `pipeline.render-test.ts`.

ffprobe won over a hand-rolled atom walk. `mp4.ts` justifies hand-parsing `mvhd` on proportion — two
integers, against a build-time dependency of every render — and that argument inverts here: the two
call sites already spawn ffmpeg, and reaching `moov/udta/meta/ilst/©cmt/data` means four more box
layouts, an Apple naming convention with a non-ASCII marker byte, and a payload with its own type
and locale fields, all for a string ffprobe returns in one line. So the read lives in a new
`compute/tags.ts` beside `mp4.ts` rather than inside it, which also keeps external processes off the
materialization path.

**Evidence.** Eleven unit tests over the digest, the stamp's round trip through a prefixed tag, and
all three verdicts; four CLI tests over the refusal messages; and two render tests — one proving the
stamp survives a real Remotion encode and equals the sidecar's, one staging the regression exactly
as it happens by rendering a second deck over the first's output path and asserting the extraction
is refused with nothing written, that the fresh sidecar still works silently, and that a film with
its metadata stripped still extracts with a note. All four verdict paths were also driven by hand at
the command line. 989 tests pass; `scarp doctor` is clean.

**One thing was refused that was not in the non-goals.** A mismatch has no override flag. Adding one
later is free and removing one is not, and an escape hatch on a check whose entire purpose is to
stop a silent wrong answer is the first thing a script would reach for.
