---
id: tsk_01KZC8Q8VA4JR1JRZ7Q5GBKJP1
sequence: 15
kind: task
status: closed
sprint: spr_01KZC8JTE9C5CST3JCV1DNSQ3J
created: 2026-08-06
closed: 2026-08-06
---

# Storyboard the self-demo before touching the schema

## Objective

Decide what the self-demo says before deciding what the format needs.

Six scenes, roughly 75 seconds. The arc is **claim → evidence → mechanism → consequence →
result → close**, and the evidence is cuecraft's own source, on screen, twice.

Two specimen scenes bookend the middle three so the deck rhymes rather than repeats. No two
adjacent scenes share a composition.

### 1 · PROBLEM — `statement` (existing) — ~10s

> Presentations are built out of boxes, pixels, and seconds

- "A presentation is usually built out of boxes, pixels and seconds."
- *(450ms)*
- "None of that is what you meant to say."

**Communicates:** the thing being rejected, in the viewer's own vocabulary.
**Evidence:** none needed. One sentence at display scale, most of the frame empty.
**Expressible today:** yes, unchanged.

### 2 · SOURCE — `specimen` (**new**) — ~19s

> One slide, in full

Displays real cuecraft YAML, with three marks the narration reaches:

```yaml
slide:
  title: "Coding agents are black boxes"
  bullets:
    - id: tools
      text: Run tools

say:
  - "Agents do a lot of invisible work."
  - speech: "They read, search, and run tools."
    activates: tools
```

- "So cuecraft asks for something else."
- "You describe what is on the slide," → *activates the whole* `slide:` *block*
- "and what to say about it." → *activates the whole* `say:` *block*
- *(400ms)*
- "And when one sentence is about one thing in particular, it says so." → *activates the*
  `activates:` *line*
- *(350ms)*
- "There is no timeline here. Nothing has a position, and nothing has a time."

**Communicates:** the source is small, readable, and contains no mechanics. This is the scene
the whole video exists to earn.
**Evidence:** the source itself. Nothing else is as convincing, and a paraphrase would be
weaker than the thing.
**Cannot express today:** code is not representable at all. `bullets` would render it as prose
and destroy the indentation that carries the meaning. Anchors reach bullets only.

### 3 · COMPILATION — `cascade` (**new**) — ~14s

> Then it works out the rest

Steps: **Speech → Timing → Composition → Video**, descending and stepping right, each
establishing as narration reaches it.

- "Everything else is derived."
- "The narration is spoken locally, on your machine." → `speech`
- "Its real duration becomes the slide's duration." → `timing`
- "The shape of the content chooses the composition." → `composition`
- "And the whole thing is rendered." → `video`

**Communicates:** the transformation, and that its stages are ordered and causal.
**Evidence:** a diagram built by the narration rather than shown complete.
**Cannot express today:** `index` can number four phrases, but numbering says "enumerated",
not "transformed". The composition that is missing is the point; the role is what selects it.

### 4 · CONSEQUENCE — `matrix` (existing, **anchors new here**) — ~12s

> Things you never write

Terms: **Coordinates · Durations · Keyframes · Layouts**

- "So there are things you never write."
- "No coordinates." → `coordinates`
- "No durations." → `durations`
- "No keyframes." → `keyframes`
- "And no layout to pick." → `layouts`
- *(350ms)*
- "Change a sentence, and everything downstream follows it."

**Communicates:** what the author is relieved of, and that timing is derived rather than
maintained.
**Evidence:** four terms extinguished one at a time by name.
**Cannot express today:** decision:14 implemented the anchor treatment on `index` only, and
called that gap honest. This scene is the argument for closing it.
**Risk:** two-word narration cues are short enough that Kokoro may clip them. If they sound
bad, merge into two cues and drop two anchors — revise the prose, not the machinery.

### 5 · RESULT — `lead` (existing) — ~12s

> What comes out is an ordinary video

- "What comes out is an ordinary video."
- *(300ms)*
- "One file, narration already mixed in. Nothing to install."
- *(300ms)*
- "And the source stays small enough to read in a minute."

**Communicates:** the output is not a runtime, a player, or a format anyone has to adopt.
**Evidence:** the asymmetric composition itself — this is the one scene that should feel calm
after the cascade.
**Expressible today:** yes, unchanged.

### 6 · CLOSE — `specimen` (**new**) — ~8s

> Author relationships. Derive mechanics.

Displays this slide's own source, which the viewer can check against what they are hearing:

```yaml
slide:
  title: "Author relationships. Derive mechanics."

say:
  - "That is this slide, in full."
  - pause: 600ms
  - "Author relationships."
  - pause: 400ms
  - "Derive mechanics."
```

- "That is this slide, in full."
- *(600ms)*
- "Author relationships."
- *(400ms)*
- "Derive mechanics."

**Communicates:** the thesis, and the recursion that makes it checkable rather than asserted.
**Evidence:** the exact source of the frame being watched. The displayed block deliberately
omits the `code:` wrapper that displays it — that is where the regress is cut, and cutting it
one level down is the tasteful place.
**Rhymes with scene 2** — same composition, same phrase ("in full"), one sixth the content.

### What this story needs

**Essential (blocking the story):**

1. A `code` semantic role, with marks a narration cue can reach. Scene 2 and scene 6 do not
   exist without it, and they carry the entire argument.
2. A `steps` semantic role and a composition that reads as a transformation. Scene 3 could be
   forced into `index`, but "enumerated" is the wrong claim about a compiler.
3. The anchor treatment on `matrix`, and a legible three-state activation everywhere.

**Attractive, and deliberately not built:**

- `quote` / `attribution` — nothing in this story wants a pull-quote.
- `figure` / `metric` — there is no honest number to show. A fabricated one would be worse
  than none.
- `comparison` — scene 1 and scene 2 already are the comparison, across a cut.
- `image` / `evidence` — the source *is* the evidence, and it is text.

Three of idea:5's four sketched roles turn out not to be demanded by a real minute of video.
That is the finding, not a gap.

## Acceptance criteria

- The story is decided and written down before any schema change is made.
- Each scene states what it communicates, what evidence communicates it, and whether cuecraft
  can express that today.
- Missing capabilities are separated into essential and merely attractive, with the essential
  set kept as small as the story allows.
- Narration is written for speech: short cues, no long subordinate clauses, no unspoken
  punctuation carrying meaning.
- No internal archaeology vocabulary appears in the narration. A viewer who has never seen
  this repository can follow it.
- The storyboard is treated as revisable evidence, not a contract — scenes may be reordered,
  reworded or cut once the artifact is actually watched, and what changed is recorded.
