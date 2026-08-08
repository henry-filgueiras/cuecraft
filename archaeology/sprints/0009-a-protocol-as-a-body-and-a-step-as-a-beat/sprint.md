---
id: spr_01KZFC13DGXRSF95PKWG894JMA
sequence: 9
kind: sprint
status: closed
created: 2026-08-07
closed: 2026-08-07
---

# A protocol as a body, and a step as a beat

## Goal

Add one content role — **a protocol**: who the parties are, and what they say to each other, in
order — and find out whether cuecraft can turn a message-passing description into an audiovisual
explanation without the author writing an identity, a target, a coordinate, or a duration.

```yaml
protocol:
  actors: [Client, Gateway, Auth, Worker]
  steps:
    - from: client
      to: gateway
      message: POST /orders
      say: The client begins by sending its request to the gateway.
    - from: gateway
      to: auth
      message: validate token
```

The invariant the round is built around, and the reason it is a sprint rather than an archetype:

> **A step owns its transition and its narration.** The coupling between "this happens next" and
> "this is said while it happens" is structural. Nothing reconstructs it from an id typed twice.

Every other body in cuecraft declares elements and lets a *separate* `say:` reach into them by
name (decision:14). A protocol cannot work that way without becoming two parallel lists joined by
index, which is exactly the authoring failure `activates:` exists to prevent, inverted.

## Rationale

**A sequence diagram is unusually strong semantic input**, and cuecraft has never been given input
this strong. Four facts arrive for free with the notation:

    actors            imply lanes, and lanes imply stable spatial identity
    ordered steps     imply progression through time — the one thing a video has and a diagram does not
    from / to         imply the geometry of the transition, entirely
    say on a step     implies synchronisation, without anybody wiring it

The thesis under test — *cuecraft is a semantic formatter for visual explanation* — is easiest to
believe on `world`, where the author writes adjacency and the layout engine does the rest. A
protocol is a harder case in a useful way: the layout is nearly free (lanes are an ordering, rows
are an ordering) and everything difficult is *choreography*. Which means this round tests the
thesis on the half of it that has never been isolated. If the answer is "the pictures are fine and
the pacing is wrong", that is a finding about cuecraft, not about sequence diagrams.

**Missing narration is the real experiment.** `say:` is optional per step, and that single
allowance is what forces a pacing policy to exist. A narrated step is paced by measured audio, as
everything in cuecraft is. A silent step is paced by *nothing that has ever existed here* — every
duration in the system is either measured from a sound file or is a threshold constant nobody may
author. A silent step is a third thing: a visual event with no voice, that still has to take
long enough to be perceived and short enough not to stall. The rule for how long has to be derived
from the content, deterministically, and it has to be right, because a run of six silent steps is
six seconds of a film with nobody talking.

**Why this reopens decision:30 again.** sprint:8 narrowed the pause rather than lifting it, on the
grounds that the seam opened was the one the artifact broke on. This round does lift it, for one
role, and the justification is different and should be stated honestly: this is not a defect
repair. It is the first deliberate test of whether the vocabulary generalises to a *second family*
of explanation — a family where time is the subject rather than structure. decision:2's boundary
(slides plus narration) is untouched; nothing here is a new scene type, a browser, a chart, or a
theme. What is being spent is an entry in the closed body union, which is the resource
decision:15 said the format has and should spend rarely.

**Why not `world` with an edge per message.** It was auditioned first and it is wrong twice over. A
world has adjacency and no order, and the whole content of a protocol is the order; four messages
between two services collapse to one edge, and the second `Gateway -> Auth` is either a duplicate
edge or a lie. And dagre would place the lanes, which means the same actor could move between two
renderings of the same protocol — destroying the one thing a sequence diagram gives a viewer for
free, which is that a party stays where it was put.

## Success criteria

**Declarative semantics**

- A protocol is actors plus an ordered list of `from → to` steps carrying optional visible message
  text and optional `say:`.
- Ordinary sequencing costs the author nothing: no id, no `activates:`, no anchor, no coordinate,
  no duration, no camera instruction, no cue.
- Silent steps happen visibly and progress automatically. Runs of them do not stall the film.
- A narrated step's transition is locked to its own measured audio by the same rule decision:13
  fixed for anchors — first audible sample, not clip boundary.
- Whatever timing a step has is a **compiled record on the timeline**, inspectable beside anchors,
  spans and calls. No component reads prose, matches a name, or guesses.
- Every existing deck renders identically.

**Rendering and choreography**

- Lanes are spatially stable: an actor is in one place for the whole film, and its place is the
  order it was written in.
- The active source, destination and transition are immediately distinguishable from history.
- History remains as causal context and stops competing: an old message is legible and quiet.
- A long message label is handled by a stated policy, not by overflowing or colliding.
- Repeated traffic between the same pair does not move the camera. Attention migrating across the
  actor set does move it, and reads as travel rather than as a cut.
- The film stays coherent at twenty-plus accumulated messages.
- A viewer always knows which lane is which, including after the actor row has scrolled away.

**Aesthetic gate — this is the criterion, not a checkbox**

Both examples watched end to end, as films. The showcase has to look *designed*. The adversarial
one has to stay useful and coherent under pressure and is allowed to be less pretty. A defect in
either is an implementation defect until proven otherwise; the answer to a bad default is a better
default, not a key that lets an author fix it themselves.

**Engineering**

- Parser, model, layout and choreography tests. No showcase coordinates, no example-specific
  branches, no new graph-layout dependency.
- Sequence-specific policy isolated well enough that a state machine or a pipeline grammar could
  later be compared against it rather than tangled with it.
- `npm run check`, `npm run test:render`, `scarp doctor` clean.

## Non-goals

**Parallelism.** No `parallel:` block, no fan-out, no concurrent phases, no lifeline forking. The
future spelling is known and it is not being anticipated in the model, the layout, or the camera.
Whatever the sequential implementation learns about it gets recorded, not built.

Also refused: conditionals, loops, alt/opt frames, guards, notes, dividers, participant creation
and destruction, timing constraints, actor icons or stereotypes, colour or style keys, an author-set
lane order distinct from the written order, an author-set duration for anything, a camera
instruction, captions, and a second theme.

And one that will be tempting inside the round: **no per-step escape hatch**. The moment a step can
carry `dwell:`, `wide:`, `hold:` or `id:` to fix a frame that looks wrong, the experiment has been
answered in the negative and the artifact stops being evidence.

## Outcome

Every success criterion was met. Both films render from `npm run render` with no flags, both were
watched, and the aesthetic gate was the thing that actually drove the round — four of the five
changes that mattered came from looking at a frame rather than from a failing test.

    examples/tap.yaml       5 actors, 13 messages, 130 lines   ->  1:12.6
    examples/deploy.yaml    8 actors, 22 messages, 171 lines   ->  1:53.3

### What the round cost, in code

    src/presentation/protocol.ts     363   the vocabulary and every refusal
    src/presentation/beat.ts         125   the derived clock, and the lowering into cues
    src/render/protocol.ts           620   lanes, rows, replies, and the camera plan
    src/render/camera.ts             493   moved out of world.ts, unchanged
    layouts.tsx, transcript block    636   the composition
    tests                            825
    everything else                   ~90  a cue kind, a body case, a beat record, a switch arm

`world.ts` lost 491 lines and gained nothing. Ninety lines of change to the existing compiler is
the whole cost of a twelfth role, and that number is the round's main answer.

## The experiential report

### 1. What mapped cleanly onto what already existed

Almost all of the compiler, and more than expected.

- **The cue list took the whole thing.** A narrated step is a speech cue with an `activates`; a
  silent one is a new never-authored cue kind that behaves exactly as a pause does. Synthesis, the
  frame clock, the freeze and the anchor resolution needed no branch for protocols and do not know
  the word.
- **The anchor model resolved step timing with no change at all.** A step's frame comes from
  decision:14's machinery at decision:13's onset, through `bodyAddresses`, which is the same walk
  that resolves a bullet three modules down.
- **The scope seam did a job it was not designed for.** Giving each step's address a scope of its
  own makes `activates: step-3` in an author's `say:` an unknown identity rather than a way to
  reach into the lowering — that is decision:31's module rule applied to something that is not a
  module, and it needed one line.
- **`chooseLayout` needed one line.** So did `bodyElements`, `bodyAddresses` and the composition
  switch.

### 2. What needed sequence-specific machinery

Three things, and all three are honest.

- **A beat**, because a step is not an arrival. An anchor is a frame and a span is a range; a step
  is *the current step* and stays current until the next one starts, however long the sentence over
  it runs. Nothing existing carried that.
- **A dwell**, because `say:` is optional and nothing in cuecraft had ever had to invent a
  duration.
- **`say:` becoming optional on an entry**, which is the one place the round changed a rule rather
  than adding to one — and it is conditional on the body being able to supply a clock, so the
  invariant that survived is the one that matters.

### 3. Did narration-to-visual synchronisation fight the model?

**No, and this was the round's biggest surprise.** The prediction going in was that a step carrying
its own narration would need a second orchestration layer. It needed a `map`. The lowering is
eleven lines, it produces the same serial cue list a module produces, and everything downstream
sees what it has always seen.

The reason it worked is that `activates:` was never really about *names*. It is about a resolved
relationship between a moment on the narration track and an element in a body, and the names are
just how an author spells one. When the compiler writes both ends itself, the same record is
produced and nothing notices. That is a stronger claim about decision:14 than the atlas ever tested.

### 4. Which automatic layout policies were sufficient

Five, and they are small:

1. **Uniform lane pitch set by the widest name.** Removes every question about spacing.
2. **A label's measure is derived from the arrow it belongs to.** Distance between lanes is a fact
   about the protocol, so a message between neighbours gets a narrow column and one across the cast
   gets a wide one, and the row grows to hold whatever that came to.
3. **Presence decays with age, and labels decay faster than arrows.** The causal chain survives at
   twenty-two messages; the words stop competing.
4. **What has not happened is not drawn.** A message not yet sent is a spoiler, not context — which
   is `targetBounds`' existing rule about relations, transferred without argument.
5. **The shot is the step, the step before it, and as much history as the width already bought.**

No graph engine, no solver, no constraint system, and no scoring function.

### 5. Which visual defects needed special cases

**None became a special case; five became rules.** Each was found by looking at a frame:

- The establishing shot was over in ten frames, because nothing forced a hold. → a floor, and a
  prologue in the deck.
- The camera never left the establishing shot, because the hold policy is satisfied by a wide shot
  containing everything. → the first step composes rather than holds.
- A quarter of every frame was padding, because `CAMERA.pad` was measured against a plate in an
  open field and a protocol's subject is a band that already carries its own margins. → `shotFor`
  takes a pad.
- Early frames were two-thirds empty, because a shot's height comes from its width and there is not
  yet enough traffic. → the spare room goes *below*, where the exchange is heading, not above.
- One frame had a single arrow in it, because a new phase started on the opposite side of the
  diagram. → the shot carries the previous message's lanes, which is the smallest statement of
  causality a frame can make.

The nearest thing to a special case is `whiteSpace: nowrap` on a message label, and that is a bug
fix: without it the browser re-wrapped a sixty-character digest that the layout had already decided
was one line, and the row height was computed for the wrong thing.

### 6. Did the camera expose a reusable abstraction?

**Yes, and this is the round's most reusable finding.** decision:24 — *a semantic event is a reason
to move, not an obligation to move* — was measured against a graph and turns out to be about
frames. Repeated traffic between two lanes holds the shot, and **no rule was written to make that
happen**. `shotFor` declines because the second message is already well inside the frame the first
one produced.

What did *not* transfer is as informative: `targetBounds` reads like a general rule ("frame the
thing plus as much established context as fits") and is entirely about neighbours in a graph. The
transcript's version of that question has a different answer, and merging them would have produced
a parameter nobody could name.

### 7. Did optional narration expose a general concept?

Yes: **a beat** — an interval of the film that one semantic thing owns, ending when the next one
begins. It is more general than a protocol. A state machine's current state owns the stage until
the next transition; a pipeline's current stage does the same. `Beat` is defined in terms of an
address and a frame range and mentions nothing about messages.

It is deliberately **not** promoted to a general "phase" concept yet. One artifact pair is not
evidence, and the shape it would need for a state machine is not yet known.

### 8. What looks reusable for state machines and branching pipelines

- `render/camera.ts`, entirely.
- `Beat` and the dwell cue, probably entirely.
- The presence-decay policy, and "what has not happened is not drawn".
- The pattern of a body that carries its own narration and lowers into cues — this is the
  transferable *shape*, and it is now demonstrated rather than hypothesised.

### 9. What must explicitly not be generalised yet

- **The layout.** Lanes-across-time-down is a fact about sequence diagrams. A state machine has no
  lanes and a pipeline has no time axis.
- **`readReplies`.** It is call-stack semantics, and it does not survive contact with a
  notification-driven protocol (decision:37).
- **A "phase" vocabulary.** The beat is a compiled record, not an authoring concept, and it should
  stay one until a second grammar asks for it in its own words.
- **Anything about parallelism** (idea:17).

### 10. Where declarative simplicity cost disproportionate complexity

Once, clearly: **`say:` being optional**. Everything else in the format is timed by measurement, and
that one allowance required a new cue kind, a new compiled record on the narration track, a new
temporal record on the timeline, a merge in `buildTimeline`, and a policy module with six tuned
constants — for a feature that reads, in the source, as *not writing a line*.

It was worth it, and the reason is visible in the film: the run where the answer comes back the way
the question went needs no commentary, and a format that forced a sentence onto every step would
have made the author write five of them.

The second, smaller instance: an author writes `message:` and nothing else, and the renderer has to
decide a measure, a wrap, a row height and a label position from that one string. That is four
derivations from one token, and three of the five visual fixes above were in that chain.

### 11. Where a knob was tempting

Four times, and the sprint's non-goals had already refused all four:

- **`dwell:` on a step**, every time a silent run felt fast or slow. Avoided by making the policy a
  function of the label and the run, and by tuning it against a rendered minute instead.
- **`wide: true` on a step**, when the settlement phase produced a near-empty frame. Avoided by
  making the shot carry the previous message's lanes — which is a better default *and* a statement
  about causality, where the knob would have been a camera instruction wearing a boolean's clothes.
- **`reply: false`**, when the deploy film drew a request dashed. Avoided by withholding the
  notation instead (decision:37), which is strictly better: the knob would have made the author
  responsible for a derivation cuecraft got wrong.
- **A lane order distinct from the written order**, for one shot where two chatty actors sat four
  lanes apart. Not avoided so much as refused: the whole value of the notation is that a party
  stays where it was put.

**In every case improving the default was possible, and in three of the four the improved default
was better than the knob would have been.** That is the strongest evidence the round produced for
the thesis.

### 12. Does the thesis look stronger, weaker, or different?

**Stronger, and narrower.**

Stronger because this is the first grammar cuecraft has been given that it had never seen, and the
compiler needed about ninety lines to accept it. The camera policy transferred without being
touched. The anchor model resolved a relationship it was never designed for. A viewer of
`examples/tap.yaml` is watching something a person would otherwise have spent an afternoon building
by hand, and the source is 130 lines of which about 40 are comments.

Narrower because of decision:37, which is the round's most useful failure. The tempting version of
the thesis is *semantic input contains enough to derive the presentation*. What the deploy film
showed is that it contains enough to derive **the presentation** and not enough to derive **the
meaning**: `A → B` then `B → A` is one shape and two meanings, and no amount of looking at the
structure separates them. The honest form of the thesis after this round is:

> A semantic formatter may derive anything the notation determines, and must visibly withhold
> anything it merely usually implies.

That is a smaller claim and a much more defensible one, and it came from building an example
designed to break things and then actually watching it.

### Left undone, and known weaknesses

- **A shot is often 30–40% empty**, particularly early in a protocol and on rows with one-word
  labels. Rows are deliberately airy — the dense version was tried at `rowMin: 132` and read as a
  wall — but the ratio has not been solved, only balanced.
- **A long sentence over a short transition leaves the frame static for ten seconds or more.** True
  of the atlas too, and no motion was invented to cover it, because inventing motion is the thing
  the project refuses.
- **Nine or more actors cannot be established** (dragon:18). Eight is at the legibility floor.
- **`examples/deploy.yaml` is not attached to the README** and is linked as source only; it is a
  stress artifact, not a showpiece.
