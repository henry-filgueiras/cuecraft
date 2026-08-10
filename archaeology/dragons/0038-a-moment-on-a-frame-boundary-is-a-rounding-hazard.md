---
id: drg_01KZMGJET24QXEW3TJJJSN1VRN
sequence: 38
kind: dragon
status: open
created: 2026-08-09
---

# A moment on a frame boundary is a rounding hazard

## Context

decision:65's protocol carries a moment as **decimal seconds**, and `framesFor` cuts the film at the
first frame that *begins at or after* it. Those two are individually right and jointly sharp: a
frame boundary is almost never exactly representable in decimal, so a value printed to four places
can land a frame past the frame it was meant to name.

The k-means program found it on the first try. Frame 122 at 30fps is 4.0666…s. Printed as `4.0667`
it is 122.001 frames, `framesFor` rounds up to 123, and the freeze lands one frame into the *next*
pass — where the panel on screen reads "pass 4 of 6" while the narrator says "on the third pass".
The film renders perfectly and says something false, which is the failure decision:18, decision:57
and decision:56 are each a version of.

The mitigation shipped is in the program: it emits `floor(frame / fps * 1e6) / 1e6` and a comment
saying why. That is correct and it is a trap, because the next program to declare a moment has to
know a rounding rule that is nowhere in the protocol it is writing against.

## Question

**Should a moment be expressed in something that cannot be off by one?**

Three shapes, and they are not equally good:

- **Keep seconds, and round the cut down.** A moment is an instant, and the frame on screen at an
  instant is the one that started at or before it — which is `floor`, not `ceil`. That reading is
  defensible on its own terms and it is a *second* rule beside `framesFor`, which decision:9 has
  exactly one of. It is also silently different from `Anchor.frame`, which uses `framesFor` on the
  measured onset for the same "when does this happen" question.
- **Carry frames instead of seconds.** `#cuecraft moment pass-3 122` is exact and unroundable, and
  it puts the film's frame rate into the protocol — which the program already knows, because
  cuecraft handed it `CUECRAFT_FPS`. The cost is that a program which encodes at some other rate
  than the one it was given now has two frame numbers to keep straight.
- **Leave it, and say so.** Document the rounding in `../compute/r.ts` beside `MOMENT_SHAPE`, so a
  program author meets the rule where they meet the grammar.

## Constraints

- No absolute presentation timecode, ever (decision:65). Whatever this becomes stays local.
- `framesFor` stays the one seconds-to-frames conversion (decision:9). A second rule needs a
  decision, not a patch.
- The protocol must stay writable with one `cat()` in base R (decision:56).

## Candidate direction

Frames, probably, and the argument is that a film is discrete and a moment is a *frame of it*. The
program is drawing frame 122 when it decides that pass 3 has settled; seconds are a lossy encoding
of an integer it already has. The seconds form only looks more general.

What would need answering first: whether a future non-R producer — a screen capture, a simulation —
always knows its own frame index at the moment it wants to annotate, or whether some of them
genuinely only have a timestamp.

## Resolution criteria

A program declaring a moment on a frame boundary lands on that frame without knowing any rounding
rule, and `examples/kmeans/kmeans.R` no longer contains a `floor` whose comment explains a compiler
detail.
