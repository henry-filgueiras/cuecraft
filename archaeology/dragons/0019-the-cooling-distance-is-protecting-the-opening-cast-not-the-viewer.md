---
id: drg_01KZFJSY6T3G1YZ2YTGM4474Y4
sequence: 19
kind: dragon
status: open
created: 2026-08-07
---

# The cooling distance is protecting the opening cast, not the viewer

## Context

decision:38 reclaims a column only after it has been cold for strictly more than
`TRANSCRIPT.maxHistoryRows` rows, on the argument that the outgoing tenant's traffic and the
incoming tenant's traffic must never be able to share a frame. That argument was reasoned out before
anything was rendered, and rendering it makes it look wrong in a specific and interesting way.

**The argument has a hole.** A shot is a *contiguous* vertical range. The terminator and the arrival
plate sit between the two tenants' traffic. So any frame that contains both tenants' traffic
necessarily contains the handover between them — the ambiguity the cooling rule was invented to
prevent cannot arise while the marker is on screen, and delaying reclamation mostly ensures the
viewer *never sees the handover at all*.

So the boundary was made a parameter and swept. `examples/tap.yaml` is invariant under all of it —
nothing there is ever reclaimable. The other two:

    cooling rows      deploy columns      coldstart columns
     0 (floor)              4                    5
     1                      5                    5
     2                      5                    5
     4                      5                    6
     6                      6                    7
     9 (shipped)            6                    7
    12                      7                    8

    floor (peak live)       4                    5

`examples/coldstart.yaml` was then rendered end to end at zero cooling and watched. Two things came
out of it, and they point in opposite directions.

**The handovers are better, not worse.** With three columns changing hands within six rows, the film
shows the setup cast closing out and the runtime cast walking on *as an event you watch happen* —
two terminators, then two plates, then the first request. It reads as staging. Nothing about it
suggests continuation; if anything the compressed version is clearer than the shipped one, because
the shipped one puts the handover forty seconds away from anything that would make you look at it.

**And the opening cast goes to pieces.** The cast row is "the first tenant of every column"
(decision:38), which is a coherent rule only while first tenants are roughly the actors the story
opens with. At zero cooling, `coldstart`'s opening row becomes
`Boot script, Resolver, Orders service, Cache, Database` — it omits the caller and the gateway,
which are the two parties the whole second half is about, and includes the cache and the database,
which do not appear until two thirds of the way in. The prologue is spoken over an arbitrary
subset. That is worse than anything the conservative rule costs.

## Question

Is the reclamation boundary the right dial at all, or is the cast row the thing that is actually
wrong?

The evidence says the cooling distance is buying two things that were never distinguished: identity
safety, which it turns out not to be needed for, and *a sane opening cast*, which it protects only
by accident and only because slow reclamation keeps "first tenant" and "early actor" nearly
synonymous.

## Constraints

- **`examples/tap.yaml` may not change.** Any rule that staggers its plates down the diagonal, or
  opens on two of its five parties, has failed before it is watched. This is what killed the
  obvious uniform alternative — "a plate marks arrival, always" — outright.
- **The opening cannot show everybody** when everybody is nine or twelve parties; that is dragon:18
  and it is not solved by choosing a different subset.
- **No author-facing key.** Not a `cast:` list, not a `feature:` flag on an actor. Whatever chooses
  the opening row has to be derived.
- **Nothing may move.** Whatever is decided, an actor still gets one column for its whole life.

## Candidate direction

1. **Keep the conservative boundary.** Shipped. Costs two columns on each adversarial example, and
   is defensible, but for a reason that is now known to be partly accidental.
2. **Reclaim promptly, and choose the opening cast separately** — for instance, the columns whose
   *first* tenant is live in the opening stretch, with later first-tenants established on arrival
   like reclaiming ones. This is the direction the evidence points at and it is a bigger change than
   it sounds: it makes "the cast row" a derived subset rather than a structural consequence.
3. **Reclaim promptly, and let the establishing shot be a sequence** rather than a single frame.
   Expensive, and it spends the opening.

## Resolution criteria

A rendered `examples/coldstart.yaml` and `examples/deploy.yaml` at a boundary tighter than the
shipped one, whose openings are as good as the current ones and whose handovers are watched rather
than merely correct. Until then the conservative boundary stays, because it is the one whose whole
film has been watched.
