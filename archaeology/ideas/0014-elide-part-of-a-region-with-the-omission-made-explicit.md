---
id: ide_01KZCH1QDYTS26HNEQ0EVDVNZA
sequence: 14
kind: idea
status: parked
created: 2026-08-06
---

# Elide part of a region, with the omission made explicit

## Problem

decision:21 built the least lossy projection operation — wrapping — because the one specimen
that needed help was width-bound with spare height. Wrapping trades height for width, so it can
only help a block that has height to spare.

dragon:7 records the case it cannot touch: two specimens that are height-bound at 30px and 28px,
where every line on the frame is a line the scene needs. Elision buys the resource wrapping
cannot make.

## Sketch

Remove part of a region and make the removal unmistakable:

```
say:
  - "Coding agents do a surprising amount of invisible work."
  ⋯
  - "And decide what to do next."
```

The honesty rules carry over from decision:21 unchanged: an explicit marker in a colour no token
takes, nothing removed without one, and a test asserting that what reaches the frame is a
subsequence of the file.

## Boundaries

What is genuinely new is not the rendering; it is **choosing what to remove**, and every way of
choosing is either a new authored surface or a new heuristic:

- *the author names what to drop* — a second selector, and a way to lie by omission;
- *the compiler drops what no mark reaches* — plausible, and silently couples what is shown to
  what is narrated, so adding a sentence would change the frame;
- *the compiler drops the largest unmarked run* — arithmetic, and arbitrary.

Wrapping needed none of this because it is total: every line is projected by one rule and the
author says nothing. So this must be argued as a decision about the selection rule, not shipped
as a rendering feature.

Structural **folding** — collapsing a subtree while evidencing that content exists — is the same
question one level up and strictly harder. `blockEnd`'s indentation heuristic is enough to know
where a construct ends; it is not enough to know that it is irrelevant.

## Evidence

Nothing in the deck demands it. The scene that prompted this round reached the type ceiling with
one break, and the two scenes that are still small are *whole-slide* claims — the one kind of
specimen that cannot drop lines without falsifying itself. Elision there would produce a scene
that says "this is one slide, in full" over a slide with a hole in it.

Adopt when a deck needs a specimen that is genuinely too tall *and* whose claim survives having
part of it removed. Resolve dragon:7 first: it may find that a tall specimen at 30px reads
perfectly well, in which case nothing here is needed.
