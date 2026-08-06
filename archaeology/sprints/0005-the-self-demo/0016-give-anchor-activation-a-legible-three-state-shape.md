---
id: tsk_01KZC8RZ7XHDSVT692YDX5XFFJ
sequence: 16
kind: task
status: closed
sprint: spr_01KZC8JTE9C5CST3JCV1DNSQ3J
created: 2026-08-06
closed: 2026-08-06
---

# Give anchor activation a legible three-state shape

## Objective

decision:14 shipped one activation treatment: colour and opacity rise over ten frames when
narration reaches an anchored element. It is correct and it is easy to miss. Watching the
WitnessGlass render while actually listening, the four ordinals come up so gently that the
causal link — *that sentence lit that row* — does not land.

Give activation a three-state shape:

    future  ->  hot  ->  established

**future** is recessive but fully legible, so the slide still reads as a still from its first
frame. **hot** is a brief, decaying accent at the moment of arrival, and is the part that is
missing today. **established** is present and unemphatic, and stays.

The state model lives in one pure module so it can be unit-tested against frame numbers without
a browser, and the archetypes consume it. Nothing about it is reachable from the source: no
state name, no duration, no easing, no colour. This is renderer behaviour (decision:10).

Extend the treatment to `matrix`, which the self-demo needs and which decision:14 left as an
acknowledged gap.

## Acceptance criteria

- One pure, unit-tested function maps `(absoluteFrame, anchorFrame)` to a state, with `hot`
  peaking at activation and decaying to zero.
- An element the narration never reaches is fully established from its first frame; decks with
  no anchors render identically to before.
- Activation is noticeable to someone listening naturally rather than watching for it.
- The treatment is restrained enough to fire eight times in one deck without becoming a tic.
- No new source key, and no animation vocabulary anywhere in the YAML.
- `matrix` implements the treatment; `index` keeps its own, sharing the state model.
- Nothing is added that could be called an animation system: one envelope, consumed by the
  existing style computations.
