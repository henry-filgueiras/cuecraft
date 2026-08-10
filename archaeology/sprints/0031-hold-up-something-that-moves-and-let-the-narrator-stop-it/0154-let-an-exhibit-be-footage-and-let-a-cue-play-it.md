---
id: tsk_01KZMDCPT14CW0MZK5KY6Q2AAC
sequence: 154
kind: task
status: closed
sprint: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
created: 2026-08-09
closed: 2026-08-09
---

# Let an exhibit be footage, and let a cue play it

## Objective

Let a materialized exhibit be **footage**, and give the narration one verb that plays it.

    say:
      - "R ran six passes of it while this was compiling."
      - play: kmeans

`play:` is an occupant of the one serial track with a **borrowed** duration, exactly as `recall:`
is — the measurement was taken at materialization, and nothing between there and the timeline may
invent a different number.

## Acceptance criteria

- `ExhibitResource` gains a `footage` arm carrying `src`, `width`, `height` and `durationSeconds`.
- Materialization refuses: a `play:` naming an output the program did not declare, a `play:` on a
  slide whose program handed back something that is not footage, footage a deck never plays, and
  footage carrying an audio track.
- A `play` cue is parsed, bound in `bindNarration` against the slide's own body, and refused on any
  body that is not an exhibit — with the same shape of message every other reference gets.
- `compilePresentation` places it by borrowed duration; `buildTimeline` walks it on the same cursor
  as every other occupant and emits a record carrying an absolute frame, a duration, a local media
  origin and a rate.
- The scene's length grows by exactly the medium's duration, through `deriveSceneMs` unchanged.
- `framesFor` is untouched; no second conversion appears anywhere.
