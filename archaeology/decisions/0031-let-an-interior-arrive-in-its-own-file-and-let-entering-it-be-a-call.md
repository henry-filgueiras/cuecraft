---
id: dec_01KZEHRB3GN83B1MBBHT32VTZ9
sequence: 31
kind: decision
status: accepted
created: 2026-08-07
---

# Let an interior arrive in its own file, and let entering it be a call

## Context

decision:25 gave an entity an inside and refused to let that inside be a world. The refusal was
right for what it was testing — *can a concept have an interior at all* — and it left the
interesting half untouched. An inline `detail:` is narrated by the slide that contains it, so a
concept's inside cannot say anything on its own. Everything in there is a sentence the parent
happened to aim downwards, and the interior is scenery rather than a place with its own account
of itself.

The nesting question that was left open is not "may a world contain a world". Written inline, a
nested world is three more levels of indentation in a file that was already the longest thing in
the repository, with no boundary, no identity, and nowhere to put a narration. What was actually
wanted is a *module*: something with a name, its own file, and its own `say`.

That changes the shape of the problem completely, because a module makes the descent a **call**.
The parent stops talking, something else talks, and the parent resumes. And once it is a call,
the return has an obvious rule that has nothing to do with graphs.

## Decision

**An entity may name a file-backed child module, and the narration may enter it. The module's
narration running out is the return.**

```yaml
# order.yaml
entities:
  paying:
    label: Paying
    child: ./paying.yaml

say:
  - speech: "Almost everything happens in the middle."
    activates: paying
  - enter: paying                  # ...paying.yaml narrates itself from here...
  - speech: "All of that took about a second."   # ...and the parent resumes
```

```yaml
# paying.yaml — one body, its own narration, and nothing else
world:
  entities: { ... }
  relations: [ ... ]
say:
  - ...
```

Five things, and the fifth is the one the round was about.

**One word in the entity, one word in the narration.** `child:` is a path; `enter:` is a verb.
There is no `exit:` and no way to write one. Nothing names a zoom, a scale, a duration, or a
camera, and no key here could become geometric later — `enter` takes an entity, and an entity is
not a place on the screen.

**A module is one body and one `say`.** Not a presentation. `title`, `slides` and `defaults` are
refused *by name*, because an author who writes one of them has a clear and wrong idea about what
this is and "unknown key" would not correct it. The title comes from the entity that names it, so
the label on the plate and the heading inside it cannot disagree; theme, voice and timing are the
root presentation's, inherited whole. A module that could set its own would be a second deck
wearing an entity's name.

**Everything reachable has a structural address, and one bit of scope with it.**

    root
    root/paying
    root/paying/check
    root/paying/check/allowed

`bodyAddresses` walks the order `bodyElements` already publishes and names what it visits — where
each element sits, and *which narration may reach it*. That second fact carries the whole of the
distinction between the two spellings of an interior. An inline `detail` is addressed under its
entity and reachable from the enclosing narration, which is decision:25 unchanged. A module is
addressed under its entity and reachable only from its own narration, because it brought some.
Anchors resolve by address rather than by first matching name, so two modules may both contain
something called `check`.

**Return is caused by lexical completion, not by graph terminality.** This is the finding, and it
was not obvious before the specimen was written. decision:22 derives the closing reveal from
out-degree zero — the world's product is a fact about the graph, and that works beautifully for
one world traversed once. It does not generalize to a descent. A world may cycle, may have four
sinks, or may have no terminal state at all, so "come back when the traversal reaches the end" is
a rule that only works on the worlds that happen to be trees. "Come back when the callee stops
talking" works on all of them, needs no analysis, and is a rule every author already understands
because it is the rule every function they have written obeys.

**The descent occupies real frames on the same track as speech.** `enter` and `exit` compile to
measured silences beside the clips and walk on the same frame cursor (`framesFor`), which is what
makes "the parent does not continue underneath the child" a property of the timeline rather than a
hope about the renderer. It also means the camera is *told* when to descend rather than inferring
it: `Scene.calls` is a schedule, and the camera's job is to be in the right place when the window
opens, spend the window crossing the threshold, and put the frame back where it found it.

**The camera is a stack.** Entering pushes the viewport the approach landed on; exiting pops it.
Recomputing a framing of the node would agree in the ordinary case and is not the same claim —
only the pushed one is true when the camera was already holding a shot it liked, and only the
pushed one composes, because two levels of unwinding would otherwise accumulate two corrections.

**Why the file is the thing that makes this safe.** This is an exception to decision:25 rather
than a relaxation of it, and the exception is load-bearing. A file has a canonical path, so an
inclusion chain can be compared and a cycle detected — `./risk.yaml` and `../order/risk.yaml` are
recognised as one file. It has a boundary, so identities inside it cannot collide with anything
above it. It has somewhere to put a `say`. Written inline, none of those three would be true, and
the nesting would be indentation rather than structure. **`detail:` still may not be a world**, and
the error now says why and what to write instead.

## Consequences

- The narration format gained one cue kind and the world format gained one key. Nothing else
  downstream changed: `AuthoredSlide.say` is still one ordered list, synthesis is untouched, and
  `buildTimeline` still resolves an `activates` to one index into one flat element list.
  `bodyElements` and `interiorRange` were already recursive and needed no edit at all — the
  strongest evidence in the round that decision:25's seam was real.
- The renderer needed less than expected. `Interior` already synthesized a scene and handed it to
  the same archetype switch a slide gets, so a world inside an entity is drawn by an `Atlas` that
  has no idea it is inside anything. What it lacked was a *clock* — an interior world inherited the
  enclosing scene's span and would have opened and pulled back at the wrong times — and a scope.
  Nested transforms compose for free, because the interior is a 1920x1080 composition scaled into
  a rectangle in the parent's coordinates, so there is nothing for drift to accumulate in.
- **The one piece of chrome the round added is a breadcrumb**, and only inside a scope. Three
  worlds nested inside each other look like a world, and the frame has no other way to say which
  one you are in. It is derived from the structural address, with each segment shown as the label
  already on the plate it came from, so it cannot drift from what the viewer actually saw. It is
  absent from every existing deck.
- A module is a **source dependency**, recorded on the slide. A deck that descends is not
  reproducible from its own file, and anything that later caches, watches or freezes a compilation
  has to be told what was read.
- **Depth is bounded at two** — a child and a grandchild — even though the implementation recurses
  and the bound is one constant. The limit is a claim about what has been *watched*, not about what
  the compiler can do, and it moves when an artifact moves it. Advertising arbitrary depth on the
  strength of an internal recursion is how a probe starts making promises.
- A module inherits the repository boundary quoting already had (`source.ts`): a presentation
  outside the checkout can be compiled but cannot descend. That is consistent and it is also a real
  limitation, recorded as dragon:11.
- `cuecraft render` prints the descent after a render, so a timeline that descends two levels is
  visible without a test runner.
- The entry and exit durations are constants in the presentation layer (1.9s and 1.7s). They are
  the first durations in cuecraft that are neither authored nor measured, and that is the least
  comfortable thing in this decision. They are not exposed, because a key that set them would be a
  camera instruction wearing a duration's clothes — but "not authorable" is not the same as
  "derived", and nothing yet derives them.
