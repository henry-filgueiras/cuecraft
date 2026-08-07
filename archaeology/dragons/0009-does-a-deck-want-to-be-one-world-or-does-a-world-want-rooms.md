---
id: drg_01KZCSMP3WAS3F0CQ47MT6X5BM
sequence: 9
kind: dragon
status: open
created: 2026-08-06
---

# Does a deck want to be one world, or does a world want rooms?

## Context

The frontier decision:22 named was: make the whole deck one persistent world, so that moving
between slides becomes camera movement through a single space rather than a fade to black. The
portal experiment (decision:25) was run as the cheap version of that question, and it answered
part of it.

What it established, on the artifact:

- **A composition can be drawn at an arbitrary scale inside a moving world and stay legible.** The
  interior is a real `specimen` — a fourteen-line quoted source block with two activating regions
  — rendered in a 1920x1080 box scaled into a rectangle in world coordinates, and it reads exactly
  as it does on a slide. Nothing about the archetypes needed to know.
- **Spatial identity survives a scale transition.** Entering and leaving `Semantic anchors` is
  continuous both ways, and the node is recognisably in its own place afterwards. The mental map
  holds.
- **The addressing did not have to change.** An element inside an entity is an index into the same
  flat list as an entity, and timing, validation and anchoring were untouched.

What it did *not* establish, and this is the part that matters:

- **One interior is not a deck.** The excursion works partly because there is exactly one, it is
  the narrative centre, and the world returns to being a world afterwards. A deck of eight slides
  laid out in one space is eight interiors with no world between them, and the thing that makes
  the portal land — *contrast* between the map and the room — is exactly what that arrangement
  spends.
- **Nothing was learned about transitions between two interiors.** The artifact never goes from
  one inside to another, which is the move a global deck-space would be making constantly.
- **The chamber is a fixed size in world units.** A world whose entities all had interiors would
  have chambers overlapping each other, and resolving that is layout, not cinematography.

## Question

Does a deck want to be one persistent spatial world, or does a world want to contain a few rooms?

## Constraints

The cheap evidence is used up. The next increment that would actually test this is a world with
**two** interiors, narrated in sequence, because that is the first arrangement where the camera
has to go from inside one thing to inside another — and it is also the first where the answer
might be "these should have been two slides".

The expensive version — laying every existing archetype into one coordinate system — is a
rewrite of `Frame`, `Presentation`, and every archetype's relationship to the viewport, and it
would be irreversible in practice. It should not be attempted on the strength of one excursion
that went well.

## Candidate direction

Do not build global deck-space. Build a second interior when a real artifact wants one, and watch
specifically for whether the world between the two rooms still feels necessary. If it does, worlds
contain rooms and that is the shape. If the world starts feeling like corridor between
destinations, the deck-as-world hypothesis gets much stronger and the corridor should go.

## What sprint:6 said, and what it did not

`examples/order/order.yaml` (decision:31) is the second and third interior, and it answers a
neighbouring question rather than this one — which is itself informative.

- **The world between the rooms was not corridor.** Coming back out of `paying` and finding it in
  its place, with `packing` and `arrives` still to the right of it, is what makes the four steps
  read as four steps rather than as three videos. Every existing observation about contrast between
  map and room held at two levels as well as at one.
- **But the two interiors were still never adjacent.** They are *nested*, not sequential: the
  camera never goes from inside one thing to inside another at the same scale, which is exactly the
  move a global deck-space would be making constantly. The specific gap this dragon named is
  therefore still open, and this round did not narrow it.
- **The chamber-overlap problem did not arise and is unresolved.** A chamber is still a fixed size
  in world units, and it worked here because each world has exactly one entity with an inside. A
  world with two chambers side by side would still have them overlapping, and that is layout rather
  than cinematography.

So: not strengthened, not weakened. The evidence that arrived is about *depth* rather than about
*adjacency*, and dragon:12 is where the new pressure went.

## Resolution criteria

Close as **strengthened** if a two-interior artifact makes the world feel like connective tissue
worth keeping and the interiors feel like the substance; as **weakened** if the second interior
makes the piece feel like a slideshow with a map in it; as **superseded** if a real presentation
turns out to want interiors and never wants a world at all.
