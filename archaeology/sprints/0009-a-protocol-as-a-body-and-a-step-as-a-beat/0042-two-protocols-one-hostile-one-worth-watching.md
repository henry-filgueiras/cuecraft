---
id: tsk_01KZFC38VAFD7RE286SZYWYCNC
sequence: 42
kind: task
status: closed
sprint: spr_01KZFC13DGXRSF95PKWG894JMA
created: 2026-08-07
closed: 2026-08-07
---

# Two protocols: one hostile, one worth watching

## Objective

Two examples, chosen for opposite reasons.

**The adversarial one** exists to break the policies: at least six actors, sparse traffic across
distant lanes, runs of consecutive silent steps, long payload labels, repeated A-B exchanges,
attention forced across the whole cast, more accumulated history than is comfortable, and narration
both much longer and much shorter than the transition it rides on. It has to be a protocol an
engineer would actually explain, not a torture fixture.

**The showcase one** exists to be watched by someone who has never heard of cuecraft: conceptually
clear, visually attractive, narratively coherent, long enough to demonstrate progressive
explanation and short enough to stay delightful, and obviously the kind of thing a person would
otherwise have spent an afternoon on in Keynote.

## Acceptance criteria

- Both live in `examples/`, are pure declarative source, and contain no id, target, coordinate,
  duration or camera instruction anywhere.
- Both render from `npm run render` with no flags.
- The showcase's source is small enough to print in the README beside the video.
