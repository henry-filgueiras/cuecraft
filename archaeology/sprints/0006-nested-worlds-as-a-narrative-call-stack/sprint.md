---
id: spr_01KZEFJJVPNCDAJ6MJHYZCN95M
sequence: 6
kind: sprint
status: closed
created: 2026-08-07
closed: 2026-08-07
---

# Nested worlds as a narrative call stack

## Goal

Let an entity's inside be a **file-backed child module with its own narration**, and compile the
whole thing into one serial presentation whose camera descends through nested worlds and unwinds
through the same scopes.

The demonstrated contract is exactly two descents:

    root  ->  child  ->  grandchild  ->  child  ->  root

The deliverable is a pair of artifacts: `examples/order/order.yaml`, which nests, and
`examples/order-flat.yaml`, which says the same thing as three ordinary slides. The finding is
whether semantic zoom explains better than sequence does, and it is decided by watching the two.

## Rationale

decision:25 gave an entity an inside and refused to let that inside be a world. The refusal was
right for what it was testing — "can a concept have an interior at all" — and it left the
interesting question untouched: an interior is narrated by the *enclosing* slide, so a concept's
inside cannot say anything on its own. Everything in there is a sentence the parent happened to
aim downwards.

A child *module* is a different proposition from a nested `world:` key, and the difference is the
whole reason this round is worth running:

- it has a **file**, so it has a name, a resolution rule, a canonical identity, a cycle check,
  and a place to live that is not three more levels of indentation;
- it has **its own `say`**, so the descent is a call rather than a camera move — the parent stops
  speaking, something else speaks, and the parent resumes where it left off;
- and because narration is what returns, the return is caused by **lexical completion**, not by
  arriving at a graph sink. A world may have cycles, several sinks, or no terminal state at all,
  and none of that should decide when the camera comes back up.

That is a narrative call stack, and cuecraft nearly has one already: `bodyElements` is recursive,
`interiorRange` addresses interiors positionally, `Interior` renders a synthesized scene through
the same archetype switch, and `cameraPlan` already emits `enter` and `exit`. What is missing is
an *address* that cannot collide, a *cue* that says "go in", and a *schedule* that makes entry
and exit consume real time on the same narration clock as everything else.

## Success criteria

- An entity may carry `child: ./thing.yaml`. The module is one body plus its own `say`, resolved
  relative to the file that declared it, and nothing else — no title, no slides, no defaults.
- A narration cue `enter: <entity>` invokes it explicitly. Reaching or lighting an entity does
  not. Return is written nowhere: the child's narration running out is the return.
- Every reachable element has a structural address (`root/payment/check`), and two scopes that
  both call something `check` do not collide.
- The compiled timeline carries an inspectable call/return sequence — narrate / enter / narrate /
  exit / narrate — that testably descends two levels and unwinds through the same scopes.
- Entry and exit occupy real frames on the narration track. Nothing overlaps; the parent does not
  continue underneath the child.
- Exiting restores the enclosing view exactly, one scope at a time, with no drift and no reset to
  root.
- Missing files, malformed modules, direct and indirect inclusion cycles (with the whole chain in
  the message) and excessive depth all fail before a second of audio is synthesized.
- `examples/cathedral-v2.yaml`, `examples/cuecraft.yaml` and `examples/observatory.yaml` still
  parse, still choose the same compositions, and still render the same way.
- Both new artifacts render end to end through the real pipeline, and frames at root, first
  entry, grandchild depth, and both returns have been looked at.
- `npm run check`, `npm run test:render` and `scarp doctor` are clean.

## Non-goals

Concurrent or overlapping child narration, fork/join worlds, traversal inferred from graph
topology, module parameters, reusable components, cross-scope references, per-child themes or
voices, several slides inside a module, a general import system, and any WitnessGlass or
data-source integration.

Depth beyond grandchild is not advertised even though the implementation recurses. The guard is
conservative on purpose: an implementation that happens to recurse is not evidence that a
four-deep presentation is watchable, and this round has no artifact that would show it.

`detail:` is not widened. An inline interior still may not be a world — decision:25's boundary is
narrowed by exception, not deleted, and the exception is exactly "the interior arrived in its own
file with its own narration".

## Outcome

Every success criterion above was met, and the round landed roughly where it aimed. Three things
came out differently enough to be worth writing down.

**The architecture was smaller than expected, and the reason is decision:25's seam.** `bodyElements`
and `interiorRange` were already recursive and needed no edit at all; `Interior` already synthesized
a scene and handed it to the same archetype switch a slide gets, so a world inside an entity was
already drawn by an `Atlas` with no idea it was inside anything. What actually had to be built was
an *address* that cannot collide, a *cue* that says "go in", and a *schedule* that puts the descent
on the same clock as the speech. The rest was wiring. That is the second time decision:25's flat
element list has absorbed a change it was not designed for.

**The unwind rule turned out to be the finding, not the mechanism.** The plan went in expecting the
interesting part to be the camera stack. It was not — pushing and popping a viewport is six lines.
The interesting part is that *lexical completion* is the only return rule that generalizes.
decision:22 derives the closing reveal from out-degree zero, which is exact and beautiful on one
world traversed once, and is simply unavailable inside a descent: a world may cycle, may have four
sinks, or may have none. "Come back when the callee stops talking" needs no analysis of the graph
at all, and an author already knows it, because it is the rule every function they have written
obeys. decision:31 records this as the load-bearing claim.

**The comparison against the flat control went further than "is it prettier".** Both artifacts
render; the nested one runs 1:38 against 1:29, and spends 7.2 seconds of that on thresholds. What
the control could not do is more interesting than how it looked:

- *The flat version cannot tell the story in causal order.* Slide 1 has to run the whole chain —
  buy, paying, packing, it turns up — before descending, because there is no way back. So the
  detour into paying happens after the story has finished rather than at the point in the chain
  where it belongs, and the payment explanation is an appendix. The nested version stops mid-chain,
  explains, returns, and continues. That is a structural difference, not a stylistic one, and it is
  the strongest argument the round produced.
- *Containment is shown rather than asserted.* In the nested version the `Paying` plate itself
  becomes the frame. In the control, slide 2 arrives as a hard cut and nothing on screen relates it
  to the second box on slide 1 except the word.
- *The control needed two bridging sentences* — "But paying is not one thing, here is what is
  inside it", "Now, that check" — to do in prose what the camera does for free.
- *And the return is where the nesting is most obviously worth it.* Coming back out and finding
  `Paying` in its place, with `Packing and posting` still to the right of it, is what makes the four
  steps read as four steps. The control has no equivalent moment and cannot have one.

Against that: the control is easier to skim and to seek, it compiles from one file rather than
three, and 7% of the nested runtime is spent travelling. The honest summary is that semantic zoom
bought **narrative ordering**, which sequence cannot provide at any price, and that the motion is
the mechanism rather than the point.

**Promotion is not recommended yet.** One artifact, one pair of eyes, and three live dragons —
dragon:11 (a module is contained by cuecraft's checkout rather than the deck's own directory,
which means a real user's deck cannot descend), dragon:12 (the descent's duration is the first in
cuecraft that is neither authored nor measured), and dragon:13 (the implementation recurses and the
demonstration stops at two). The first of those is the one that would have to be settled before
this could be called a language feature rather than a probe.
