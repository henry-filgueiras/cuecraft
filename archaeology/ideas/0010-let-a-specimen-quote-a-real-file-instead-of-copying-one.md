---
id: ide_01KZCBG9ZH44PZD34M1135J2R3
sequence: 10
kind: idea
status: parked
created: 2026-08-06
---

# Let a specimen quote a real file instead of copying one

## Problem

A `code` specimen is a string in the presentation. Both of the self-demo's specimens are
hand-written copies of something that exists elsewhere in the repository: scene 2 copies the
shape of a WitnessGlass slide, and scene 6 copies its own slide's source.

The video's entire claim is *this is the source*. That claim is currently kept true by an author
being careful, and it will stop being true the first time the real file changes and the copy
does not. A specimen that has drifted is the worst possible defect for this product, because it
looks completely correct and quietly asserts something false.

## Sketch

Let a specimen quote a file instead of carrying a copy of one:

```yaml
code:
  file: examples/witnessglass.yaml
  section: "- slide:"
  marks:
    - id: narration
      line: "say:"
```

`section` reuses the mark grammar already in `specimen.ts` — name the line that opens the block,
take that line plus everything indented beneath it. No line numbers, no ranges, no coordinates.
`language` comes from the extension.

The specimen would be resolved at parse time, so a missing file, an unresolvable `section`, and a
mark that does not appear inside the quoted section are all the same kind of loud failure the
format already produces.

## Boundaries

Not an include system, not templating, not a transclusion graph. One file, one section, read
once. The presentation still says what it *means* — "show this part of that file" — and the
compiler does the fetching, which is the same shape as everything else here.

Nothing is written back. The quoted file is an input, exactly as the presentation itself is.

## Evidence

Adopt when a specimen is a copy of something that already exists — both of the self-demo's are.

The property worth having is that **a specimen that quotes cannot lie**. It also makes the
recursion in the closing scene real rather than staged: `file: examples/cuecraft.yaml` pointing
at its own slide terminates honestly, because a file quoting itself is just a file, with no
regress to cut. Whether that is *legible* at presentation scale is a separate question, and the
reason to try it on one slide before believing it.
