---
id: dec_01KZA2RZHPYT018D94GDPFE1FQ
sequence: 2
kind: decision
status: accepted
created: 2026-08-05
---

# Scope v0 to slides, narration, and a CLI

## Context

The design space adjacent to this idea is enormous: browser demos, terminal replays, charts,
diagrams, captions, transition systems, themes, an editor UI. Each is individually plausible.
Together they are a generalized video-generation product, which is not what we are testing.

The thesis under test (decision:1) is narrow: does a YAML-authored, narration-timed slide deck
compile into something worth watching?

## Decision

v0 is exactly this:

- one YAML input file: a title, defaults, and a list of slides
- one scene type: a slide with a title and bullets
- narration per slide via a `say` block
- timing derived from narration duration plus pre/post padding
- one command producing one 16:9 MP4
- CLI-first and scriptable

Explicitly out of scope for v0: additional scene types, animation/transition systems, theming
beyond one built-in look, multi-voice narration, captions, and any GUI, editor, or web
interface.

Expanding this boundary requires an explicit decision artifact — not an incremental commit.

## Consequences

- Some real presentations will not be expressible in v0. That is what the probe measures.
- Parked expansions live as ideas (idea:1, idea:2, idea:3) and stay parked until a concrete
  presentation is blocked on one.
- Seams matter more than features. The code should not make a second scene type structurally
  difficult, but must not implement one either — preserve the seam, skip the abstraction.
- "No GUI" is a load-bearing constraint, not an unfinished feature. A visual editor would make
  the projection hand-editable and dissolve the thesis.
