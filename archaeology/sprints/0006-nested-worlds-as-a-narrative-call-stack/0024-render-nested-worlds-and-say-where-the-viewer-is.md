---
id: tsk_01KZEFMY35MJSVSEX4H4TB3QRB
sequence: 24
kind: task
status: closed
sprint: spr_01KZEFJJVPNCDAJ6MJHYZCN95M
created: 2026-08-07
closed: 2026-08-07
---

# Render nested worlds, and say where the viewer is

## Objective

Let the renderer descend, and let the viewer know where they are.

`Interior` already synthesizes a scene and hands it to the same archetype switch a slide gets, so
a world inside an entity is drawn by an `Atlas` that has no idea it is inside anything. What it
lacks is a *span*: an interior world's camera has to open when the portal opens and pull back when
it closes, and today it would inherit the enclosing scene's clock and do both at the wrong time.

Three worlds nested inside each other also look like three worlds. At depth, the one thing the
frame cannot say is which one you are in — so the scope earns exactly one piece of chrome: the
trail of labels it descended through, derived from the structural address and the entity labels
already on screen. Not a debug overlay, not a hand-authored caption, and not present at all in a
deck that never descends.

## Acceptance criteria

- An entity whose interior is a world renders as a world, with its own layout, its own camera and
  its own portals, at any of the supported depths.
- An interior world's camera opens on its whole world as the chamber expands, and has returned to
  its whole world by the time the chamber contracts.
- Nested transforms compose; nothing is re-laid-out per frame; a grandchild sits where the child
  put it.
- A breadcrumb appears only inside a scope, is derived from the address and the labels, and is
  absent from every existing deck.
- `examples/cathedral-v2.yaml` renders identically.
