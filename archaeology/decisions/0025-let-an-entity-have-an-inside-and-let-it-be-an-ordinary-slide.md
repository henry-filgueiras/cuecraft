---
id: dec_01KZCSMP3HQPPKBPY37NZE491M
sequence: 25
kind: decision
status: accepted
created: 2026-08-06
---

# Let an entity have an inside, and let it be an ordinary slide

## Context

decision:22's world is a field of two-word labels. That is the right representation of a *world*
and the wrong representation of any concept in it that is actually interesting: `Semantic anchors`
is the idea the entire system turns on, and at world scale it is a rectangle with two words in it,
set identically to `Remotion`.

A naive fix is a bigger rectangle, and it does not work, because geometric zoom on a label gives
you the same two words larger. What the concept needs is not magnification but **a different
representation at a different scale** — the thing map-makers have always done, where a dot becomes
a street plan when you get close enough. Identity stays; the representation changes.

cuecraft already had seven representations sitting right there.

## Decision

**An entity may have an inside, and its inside is an ordinary slide body.**

```yaml
anchors:
  label: Semantic anchors
  detail:
    code:
      file: examples/witnessglass.yaml
      slide: "Coding agents are black boxes"
      marks:
        - id: named
          line: "id: tools"
        - id: naming
          line: "activates:"
```

One key. `detail` is a `SlideBody` — bullets, steps, code, or a change — validated by the same
checks, normalized into the same closed union, laid out by `chooseLayout`, and drawn by the same
compositions. It may not be a world; one level, deliberately, because the question under test is
whether a concept can have an inside at all and unbounded nesting answers a different question
badly.

**Narration asks to go in by talking about something in there.** That is the whole of the trigger:

```
a cue reaches an element inside an entity   -> the portal opens
the next cue that reaches something else    -> it closes
```

Nothing in the source names a transition, a duration, a scale, or a shot. The author writes a
sentence about a thing, exactly as they already do, and the fact that the thing lives inside a
concept is a fact the compiler already knows.

**The interior's elements are the same flat list.** `bodyElements` on a world returns every
entity, then every interior in entity order, and `interiorRange` owns that rule. So an
`activates:` still resolves to one index into one list; timing, anchoring and validation are
untouched. **This is the strongest evidence in the round**: reaching *inside a concept* required
no new addressing scheme, only more of the existing one.

**The transition is derived from the entity's own geometry.** The plate's rectangle is interpolated
towards a **chamber** — sixteen by nine, centred on the plate's own centre — while the camera
closes on the chamber at the same rate. Because both are centred on the same point, the plate's
middle does not move on screen for the whole expansion: the thing stays where it is and opens.
The interior renders as a 1920x1080 composition scaled into the chamber, so at the portal shot it
lands at roughly one composition pixel per screen pixel. The entity's label travels to where the
composition's heading will be and hands over to it — the same string, in the same place, so it
reads as reflow rather than as substitution.

Coming out runs the same interpolation backwards, and then **holds for two thirds of a second on
the closed node before the camera goes anywhere else**. Without that beat the retreat runs
straight into the next traversal and the viewer never sees where they came back to.

## Consequences

- The composition layer gained `Composition` — the archetype switch, separated from the frame that
  usually surrounds it — and gained nothing else. An interior is drawn by code with no idea
  interiors exist, which is the test of whether `detail` was reuse or costume.
- `Frame` gained a `bleed` case in decision:22 and needed nothing new here.
- The one genuinely portal-specific piece of machinery is `Portal` in `layouts.tsx`: about a
  hundred lines that interpolate one rectangle towards another and cross-fade a label into a
  heading. That is the honest cost, and it is not specimen-specific — it mentions no entity by
  name and would work on any world.
- Entities are now two forms rather than one, exactly as items are `text` or `{ id, text }`. The
  long form with no `detail` is rejected rather than accepted, so there is one spelling of "an
  entity that is only a name".
- An entity the camera has been inside keeps a second hairline just within its own for the rest
  of the piece. No badge, no tick — the plate is simply built a little more deeply, so the final
  wide shot distinguishes what was opened from what was only named.
- The interior currently holds for about fifteen seconds with two activations in it. That is long
  enough to read a fourteen-line specimen and slightly longer than it is interesting, which is a
  pacing problem rather than an architectural one.
- **This does not license global deck-space.** dragon:9 records what the experiment actually said
  about that hypothesis, which is more than nothing and less than a mandate.
