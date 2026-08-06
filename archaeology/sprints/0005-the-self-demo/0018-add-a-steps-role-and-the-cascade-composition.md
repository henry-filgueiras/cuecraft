---
id: tsk_01KZC8RZ87YBH2Y31ESY9T318W
sequence: 18
kind: task
status: closed
sprint: spr_01KZC8JTE9C5CST3JCV1DNSQ3J
created: 2026-08-06
closed: 2026-08-06
---

# Add a steps role and the cascade composition

## Objective

Let a slide say that its content is the *stages of one transformation*, and compose it as one.

`bullets` under decision:10 selects `matrix` for short parallel labels and `index` for ordered
compact phrases. A compilation pipeline is neither. It is not a parallel field, and numbering
it claims "these are enumerated", which is the wrong thing to say about a chain of derivations
where each stage consumes the last.

    steps:
      - id: speech
        text: Speech
      - id: timing
        text: Timing

Identical data to a bullet, different claim about what it means — which is the test of whether
these names are semantic. The role is what selects the composition, not the shape.

One composition: **cascade**. The stages descend and step right, traced by a single accent
line, so the frame reads as a transformation rather than a list. Anchored stages establish in
order as the narration walks them, which is the composition and the anchor mechanism doing the
same job.

## Acceptance criteria

- `steps` is accepted as a slide's content, alongside `bullets` and `code`, at most one of the
  three.
- Nothing in the source describes the direction, the offset, the connector or the order of
  arrival. The author states that these are stages; everything else is derived.
- Steps are anchor targets exactly as bullets are.
- The cascade is visibly not a list and visibly not a card grid, and it holds four to six
  stages without either crowding or floating.
- Selection is unit-tested; the composition shares the frame, palette, type scale and motion
  vocabulary of the existing four.
