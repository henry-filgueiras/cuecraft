---
id: drg_01KZCGZA4GG3ZZQZ3TRCX4XG27
sequence: 7
kind: dragon
status: open
created: 2026-08-06
---

# Two specimens are height-bound with no lever left

## Context

decision:21 fixed the deck's *width*-bound specimen by trading spare height for columns. Running
the same measurement across every source-backed scene in the canonical deck says the other two
have no such trade available:

```
scene                                     rows  longest  byHeight  byWidth  size   binds
"One slide, in full"                        14       61      30.3     44.2   30px  HEIGHT
"Change it, and nothing else" (projected)    6       63      70.6     44.2   44px  ceiling
"Author relationships. Derive mechanics."   13       52      28.8     51.8   28px  HEIGHT
```

30px and 28px are *below* the 36px that dragon:6 was raised about, and the projection search
correctly declines to touch either — wrapping a height-bound block only makes it smaller. The
deck's best specimen and its worst are now 16px apart.

Both have a reason to be that tall, and neither reason is a mistake:

- "One slide, in full" is the deck's centre. Its claim is *this is one whole slide as an author
  types it*, and decision:20's `opens` would falsify that by showing a part of one.
- The close quotes its own slide out of its own file, which is the deck's recursion. Its length
  is its content.

So the two levers cuecraft has — select less (decision:20), project narrower (decision:21) —
are both unavailable by construction, and the frame is genuinely full of source the scene needs.

## Question

Is a specimen that is legitimately fourteen lines long a scene cuecraft cannot set well, or is
there a third lever that is neither narrowing the selection nor narrowing the measure?

## Constraints

The candidates are all more expensive than what has been built so far, and each has a specific
cost:

- **Elide** (idea:14) removes lines, which is exactly what "shown whole" scenes cannot afford.
- **Fold** collapses a subtree while evidencing that content exists. It is the only operation
  that shortens a block without claiming the removed part was irrelevant — and it needs real
  structural knowledge, not the indentation heuristic `blockEnd` gets away with today.
- **Framing** is the answer dragon:6 was raised about and closed as *weakened*. It has been
  weakened twice now by upstream fixes, and the honest position is that it has never been tried
  against a scene where the upstream fixes are unavailable. This is that scene.
- **Reveal over time** — showing the block in stages as narration walks it — is not a projection
  at all, and would make the type a function of what is currently on screen rather than of the
  whole. It is the only candidate that does not lose content.

Two prior rounds have found that a downstream perceptual fix was compensating for an upstream
representation problem. That should be the null hypothesis here too, and it is weaker than
usual: there is no obvious upstream defect left to find on these two scenes.

## Candidate direction

Judge whether 30px actually fails. The number is arithmetic; the previous rounds were decided by
watching. It is possible that fourteen lines at 30px reads perfectly well because the eye is not
being asked to find a small target in a large frame — which was the *real* complaint in
dragon:6, and which the marks already solve by lighting a region.

If it does read well, the honest record is that specimen size has a floor lower than the deck's
ceiling and that is fine, and this closes without machinery.

## Resolution criteria

Watch the rendered deck and judge the two scenes the way decision:17 and dragon:6 were judged.
Close as: **not a defect** (30px reads from presentation distance and the mark carries the eye),
**needs a third lever** (name which, on evidence), or **framing earned** (the case dragon:6 could
not construct).
