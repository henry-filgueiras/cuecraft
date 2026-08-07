---
id: dec_01KZD04KMGZKNHNHN2SVS2AK6T
sequence: 30
kind: decision
status: accepted
created: 2026-08-06
---

# Ship the three artifacts as the argument, and pause the vocabulary

## Context

Twenty-nine decisions in, cuecraft can do something that is easier to watch than to describe.
The README could not describe it either: it still opened on "a programmatic compiler for narrated
slide presentations", listed seven compositions, and said nothing about semantic worlds, automatic
graph layout, a narration-driven camera, concepts with insides, or a presentation that reads its
own compiler — the four things that make anyone look twice.

Three specimens have accumulated, and between them they make the whole argument:

```
examples/cuecraft.yaml       the practical core: roles, specimens, quoted source, a change
examples/cathedral-v2.yaml   a world, laid out and traversed, with a concept you go inside
examples/observatory.yaml    the compilation, shown, in the video the compilation produced
```

Every one of them was also the thing that shaped the implementation: the self-demo produced
decisions 15 through 21, the cathedral produced 22 through 26, and the observatory produced 27
through 29. The specimens are not demonstrations of a finished tool. They are how it was found.

## Decision

**The three artifacts are the argument, and this round packages them rather than adding to them.**

Two halves.

**The videos are the evidence, and the README is the frame around them.** It opens on the thesis
in one sentence, shows the three videos before it explains anything, and puts the shortest possible
distance between "that is a video" and "that is the source that made it". Observatory first,
because it is the strongest *wait, what?*; Cathedral v2 second, because it is the best-looking
proof of leverage; the self-demo third, because it establishes that the practical core is real
and not a stunt.

The MP4s are **not** in the repository. They are projections (decision:1), generated media is
ignored, and Git LFS is a dependency this project does not want. They are uploaded by hand through
GitHub's own editor, which mints a hosted attachment URL — so the README carries labelled
placeholders and `runme/upload-showpieces.md` carries the mapping from placeholder to local file.

**Feature expansion pauses here.** Not because the ideas ran out — idea:16 lists vocabulary the
cathedral asked for and did not get, and dragons 8, 9 and 10 are all live — but because the
implementation has been shaped by three specimens and one pair of eyes, and the next useful signal
is somebody else's reaction. Adding a fourth kind of thing before the first three have been seen
is how a probe becomes a framework nobody asked for.

## Consequences

- The README stops being a feature list and becomes an argument with evidence attached. Its
  reference material — the roles, the pronunciation repair, the wrapping rules — is compressed
  hard, because the archaeology already holds all of it in more detail than a README should.
- Anything that is not packaging is out of scope until this has been seen, including the parked
  vocabulary. A blocking defect found while packaging is still fair game; a feature is not.
- The three specimens are now load-bearing in a second way: they are the public artifacts, so a
  change that regresses any of them regresses the pitch. All three are re-rendered and watched
  before anything ships.
- dragon:8 ("is a semantic world a cuecraft body, or one very good specimen?") gets the only
  evidence that can settle it — whether anyone who did not build this finds the world composition
  worth the vocabulary it costs.
- **The hosting limit turned out to bind, and the fix is a second projection.** GitHub's Markdown
  editor rejects a dropped video over 10 MB; a minute of atlas renders at 16–17. So
  `scripts/compress-for-upload.sh` re-encodes a rendered MP4 into a smaller one — constant quality
  first, stepping down only if the result is still over the ceiling — and writes it to
  `out/upload/`. All three land at roughly half size with no visible difference (SSIM 0.997 on the
  observatory at the default quality).

  It is a script rather than a `cuecraft render` flag on purpose. Cuecraft compiles a presentation
  into a video; fitting that video to somebody's upload form is a property of the destination, not
  of the presentation, and putting it in the compiler would make the artifact depend on where it
  was going. The rendered file stays canonical, the compressed one is a projection of a projection,
  and both are ignored by Git for the same reason (decision:1). The script refuses to write over
  its own input, and reports honestly rather than mangling when a file will not fit at the quality
  floor.
