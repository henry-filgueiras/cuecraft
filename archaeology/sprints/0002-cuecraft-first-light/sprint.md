---
id: spr_01KZA7T98B558R2DC03NZ9AS38
sequence: 2
kind: sprint
status: closed
created: 2026-08-05
closed: 2026-08-05
---

# Cuecraft First Light

## Goal

Compile `examples/witnessglass.yaml` into a watchable narrated 1080p MP4. One command in,
one playable file out — the first time the thesis of decision:1 is testable by watching
something rather than by reading archaeology.

The hero result:

    cuecraft render examples/witnessglass.yaml -o out/witnessglass.mp4

Two slides, so that slide progression and narration alignment are observed rather than
assumed.

## Rationale

Every piece of this pipeline now exists except the pipeline. decision:1 defined the
compiler, decision:2 scoped it, decision:5 chose Remotion, and decision:8 put working local
synthesis in cuecraft's own process. What has never happened is the three of them meeting:
YAML has never been parsed, timing has never been derived from measured audio, and no frame
has ever been rendered.

dragon:1 asks what shape the compile pipeline takes given that Remotion needs durations in
frames before it renders anything. That question cannot be answered by reasoning; it is
answered by building the ordering once and seeing where the rounding rule has to live.

The aesthetic question — is a YAML-authored deck worth watching? — is unanswerable until
there is something to watch. That is the real deliverable.

## Success criteria

- `cuecraft render examples/witnessglass.yaml -o out/witnessglass.mp4` produces a playable
  H.264/AAC MP4, 1920x1080 at 30 fps, from a clean checkout plus documented bootstrap.
- Invalid YAML fails nonzero with a message naming the slide and field at fault.
- Slide timing is derived from measured Kokoro audio; no frame counts appear in the source.
- Narration audibly starts after `pre_say` and finishes before the next slide begins.
- The duration-to-frames rounding rule exists in exactly one place.
- `npm test` stays fast, synthesizes nothing, and launches no browser.
- A separate live path renders the real fixture end to end.
- Generated narration and rendered video stay out of Git.

## Non-goals

`freeze` (dragon:2), content-addressed caching (decision:3), remote providers (decision:4),
narration chunking (dragon:3), a second scene type (idea:2), a theming or transition system,
captions, and a named presentation IR (idea:3). One built-in look, one restrained transition,
one compiled shape that falls out of this slice rather than being designed ahead of it.
