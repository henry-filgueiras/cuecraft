---
id: dec_01KZFEE6A3YDHW4V0XBPQBK7QQ
sequence: 34
kind: decision
status: accepted
created: 2026-08-07
---

# Let a body be an exchange, and let a step carry what is said over it

## Context

Every body cuecraft had described something that is true all at once. A world exists; a formula
holds; a population has a size; a specimen is a state of a file. Narration then *toured* it, and
decision:14 gave the tour its one relationship: an element declares an identity, a cue says it
reaches it, and the compiler works out the frame. That split is right for a tour, because the
element and the moment genuinely are two different things in two different lists.

A message-passing protocol is not like that. Its whole content is that this happened, and then
this, and then this — and the order of the steps *is* the order of the narration. Writing it in the
existing vocabulary means declaring an identity on every step and typing it again on every cue:

```yaml
world:
  entities: { s1: "POST /orders", s2: "validate token", ... }
say:
  - { speech: "The client begins…", activates: s1 }
  - { speech: "…", activates: s2 }
```

Two parallel lists joined by an identity the author invented purely to rejoin them. That is
precisely the failure mode `activates:` exists to prevent, inverted: instead of narration asserting
something the picture cannot corroborate, the author maintains by hand a coupling the notation
already carries. It also loses the order, because nothing in that spelling says `s2` comes after
`s1`; the `say` list happens to be written that way.

The other spelling considered first, and rejected, was `world` with an edge per message. It is
wrong twice. A world has adjacency and no order, and the order is the entire content here — four
messages between two services collapse to one edge, and the second `gateway -> auth` is either a
duplicate or a lie. And dagre places the nodes, so the same actor could sit somewhere else in two
renderings of the same protocol, destroying the one thing a sequence diagram gives a viewer for
free: that a party stays where it was put.

## Decision

**A body may be a protocol: a cast, and an ordered list of messages between them. A step carries
its own narration.**

```yaml
protocol:
  actors:
    client: Client
    gateway: API gateway
    auth: Auth service
  steps:
    - from: client
      to: gateway
      message: POST /orders
      say: The client begins by sending its request to the gateway.
    - from: gateway
      to: auth
      message: validate token
```

- **`say:` is on the step**, and it is the only place in the format where narration lives inside a
  body. The justification is not convenience: it is that a step and the sentence about it are one
  thing said twice, and the coupling between them is *structural* — position in a list — rather
  than nominal. Nothing here is an identity, a target, a trigger, or an index.
- **`message:` is required and `say:` is not**, which is the opposite of how it looks and is the
  right way round. The message is what the diagram shows, and an arrow with no label is a line. The
  narration is what the film adds, and a protocol is allowed to have stretches nobody talks over.
- **Actors are a mapping**, exactly as a world's entities are, because an actor *is* its identity:
  the steps name it, a prologue may reach it, and a lane is keyed off it.
- **The steps lower into the ordinary cue list.** A narrated step becomes a speech cue that
  activates the step; a silent one becomes a dwell (decision:35). Everything downstream —
  synthesis, the frame clock, anchoring, the freeze — sees the serial list of cues it has always
  seen and knows nothing about protocols.
- **A step's identity is the compiler's.** It is addressed `step-1`, `step-2`, … in written order,
  which is the `CHANGE_ELEMENT_ID` precedent (decision:19) one role on: the compiler already knows
  which part of itself the narration is about, so asking an author to name it would be asking them
  to repeat back something derived. The form is reserved against an actor taking it.
- **An entry-level `say:` becomes a prologue**, spoken over the cast before anything is sent, and
  is optional — the one body that may supply its own clock. It is also the only narration on such a
  slide that reaches anything by name, and what it reaches is an actor.
- **The composition is `transcript`**: lanes across, time down. Twelfth role, twelfth archetype.

## Consequences

- The closed body union grows by one, and decision:30's pause is lifted for this role only. What
  justifies it is different from sprint:8's: that round repaired a defect, and this one is the
  first deliberate test of whether the vocabulary generalises to a family of explanation where
  *time* is the subject rather than structure.
- A step's addresses live in a scope of their own, so `activates: step-3` written by an author is
  an unknown identity rather than a way to reach into the lowering. This reuses the module rule
  (decision:31) on something that is not a module, which is evidence the scope seam is real.
- Nothing about the atlas, the anchor model, the timeline, or the freeze changed to accommodate
  this. The one thing that did was `say:` becoming optional on an entry, and that is conditional on
  the body being able to supply a clock.
- **Parallelism is not anticipated.** No `parallel:`, no fan-out, no lifeline forking, and nothing
  in the model, the layout or the camera was shaped around the possibility. See idea:17.
