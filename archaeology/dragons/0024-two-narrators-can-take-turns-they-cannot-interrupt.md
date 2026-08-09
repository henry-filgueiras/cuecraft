---
id: drg_01KZHZAVZWKCGT1XK1X3DHN2C4
sequence: 24
kind: dragon
status: open
created: 2026-08-08
---

# Two narrators can take turns; they cannot interrupt

## Context

Everything cuecraft has ever put in the air is on one serial track. A clip begins where the last
one ended, a pause is the space between two, a descent is a silence with a cause, and decision:43's
recall is an earlier clip placed again on the same cursor. Nothing overlaps, ever, and that is a
property of the *timeline* rather than a rule the renderer is trusted with.

Two rounds have now built decks that are conversations. `examples/meridian-bickering.yaml` has a
reliability lead cutting across a program director; `examples/retry.yaml` has one speaker refuting
another by playing his own sentence back at her. Both are written as interruptions and neither
*sounds* like one, because an interruption in a film is one voice starting before the other has
finished, and cuecraft cannot produce that. What it produces is an unnaturally clean handover: the
first speaker lands their full stop, roughly 780ms of Kokoro's own tail and lead-in go by, and the
second speaker begins.

The recall round made this louder rather than causing it. A hard cut between two people's audio is
exactly right for a *quotation* — the replay is a different moment, and a clean boundary is what
says so. It is exactly wrong for the line that follows, where somebody is meant to be talking over
somebody else.

## Question

Is the single serialized audible stream a property worth keeping, or is it the last place cuecraft's
timeline model is standing in for a decision it has not made?

Three things are tangled and only the first is clearly separable:

- **Handover timing.** The gap between two speakers is currently whatever the two clips' measured
  silences add up to. It is not authored, not derived from who is speaking, and not tuned. A deck
  cannot ask for a quicker exchange.
- **Overlap.** A real interruption needs two clips sounding at once for a few hundred milliseconds,
  which means the track stops being serial and something has to decide the mix.
- **One clock per narrator.** The largest version, and the one to be most suspicious of: two
  parallel narration tracks that a composition would have to reconcile. That is a timeline engine,
  and decision:5 says cuecraft does not build one of those.

Notably, none of this is a *rendering* problem. Remotion already mixes concurrently placed audio
without being asked; the reason nothing overlaps is that the compiler never places two things at the
same time. So the question is entirely about what the compiled timeline is allowed to say.

## Constraints

The cost of being wrong here is asymmetric.

Serial-by-construction is why "narration is always fully contained by its scene" and "the next slide
can never begin over the tail of the previous one" are facts rather than hopes, and why a subtitle
can be a *lookup* in a finished list instead of a scheduler. Overlap makes both of those negotiable.
It is the kind of change that is easy to make, hard to reverse, and looks like an improvement in the
first deck that uses it.

decision:5 is the other constraint, and it is the sharper one: encoding, muxing and mixing are
delegated, and cuecraft does not implement timeline engines. A rule about *when* two clips are
placed is inside that boundary. A second narration track that something has to reconcile is not
obviously inside it.

sprint:15 deliberately changed none of this.

## Candidate direction

Measure before building anything. The evidence that overlap is needed is currently one adjective.

- Report the actual handover gap on the two conversational decks, since it is derivable from a
  compiled timeline and nobody has looked at the number.
- Try the cheapest lever first: a handover rule that shortens the gap when the narrator changes. It
  keeps the track serial, changes one placement decision, and is reversible.
- Only if that is measurably not enough, cost overlap — and cost it as a change to what the
  *timeline* may say, not as a rendering feature.

## Resolution criteria

Settled when the handover gap has been measured on `examples/meridian-bickering.yaml` and
`examples/retry.yaml`, a shortened-handover variant has been rendered and watched against the
current cut, and the round records either that a serial track with a handover rule is enough — or
what specifically it could not do, in a frame somebody looked at.
