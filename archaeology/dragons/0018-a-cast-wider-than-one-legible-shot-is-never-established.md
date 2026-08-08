---
id: drg_01KZFF01A190S3FGR3FPG173BS
sequence: 18
kind: dragon
status: open
created: 2026-08-07
---

# A cast wider than one legible shot is never established

## Context

The transcript's establishing shot frames the whole cast, and `TRANSCRIPT.widest` is derived from
typography rather than picked: an actor's name is set at 46 world units, a name below about
nineteen screen pixels stops being readable at 1080p, so the widest legible shot is
`1920 * 46 / 19`, which is 4650.

`examples/deploy.yaml` has eight actors and comes to about 4000 world units of cast. It fits, and
its names come out at around 24 pixels — small, and legible for the few seconds the establishing
shot lasts. **Nine actors would not fit.** The shot would clamp, the establishing frame would show
seven of them, and a viewer would begin the film without having been shown two of the parties they
are about to have to track.

Nothing detects this. The film renders, looks fine in every later shot, and is quietly missing its
premise.

**sprint:10 loosened this without resolving it.** Lane reuse (decision:38) means the opening row is
now the *first tenant of every column* rather than every actor, so `examples/coldstart.yaml`
establishes nine parties in seven plates and `examples/deploy.yaml`'s eight in six — both
comfortably legible. What has not changed is the shape of the problem: the ceiling is now on
*simultaneously live* actors rather than on declared ones, and a protocol with nine parties all
alive at once is exactly as unshowable as it was. What has changed is that the opening row is now a
*derived subset*, which raises a question this dragon never had to ask — whether the right subset is
"whoever happened to hold a column first" (dragon:19).

## Question

What should a protocol with a cast too wide to establish do?

## Constraints

- **The rail is not the answer on its own.** It names the lanes currently on screen, which is what
  makes scrolling survivable; it cannot introduce a lane the viewer has never seen.
- **Shrinking the type is not the answer.** The nineteen-pixel floor is the constraint, not a
  parameter — below it the establishing shot stops establishing anything.
- **A uniform lane pitch is load-bearing** (decision:34). Compressing the gaps for large casts
  would make the spacing between two lanes a fact about the cast size rather than about nothing,
  which is worse than the problem.
- **Panning the cast is a camera move over an empty diagram**, and it costs the film its opening.

## Candidate direction

Refuse it. A protocol whose cast cannot be shown whole is arguably a protocol that should be two
protocols, and cuecraft already refuses things it cannot draw honestly — `MAX_SERIES_TOTAL` is
exactly this argument for populations, and its reasoning transfers: the ceiling is where the
promise breaks, not where the arithmetic does. A compile error naming the count and the reason is
cheap and truthful.

What that costs is real protocols with a dozen participants, which exist. The counter-argument is
that a twelve-lane sequence diagram is not comprehensible on a 16:9 frame by any means, and the
honest answer to it is a different visualisation rather than a smaller font.

## Resolution criteria

Either a rendered protocol with nine or more actors whose opening genuinely establishes the cast,
or a refusal with a message that tells an author what to do instead. The current state — silently
showing seven of nine — is the one outcome that is not acceptable.
