---
id: dec_01KZC5V2MBYQMA5JWZTA3TVYC0
sequence: 14
kind: decision
status: accepted
created: 2026-08-06
---

# Link narration to slide elements by identity, and derive the time

## Context

A slide builds an idea; the narration builds the same idea; and until now the two only met at the
slide boundary. Bullets arrived on a stagger measured in frames from the slide's start, which has
nothing to do with what is being said over them.

Every presentation tool that solves this solves it with timestamps — emphasize at 4.73s, reveal at
frame 142. That works exactly until the prose changes, at which point every number after the edit
is silently wrong. For a compiler whose entire thesis is that the source is the truth and the video
is a projection (decision:1), authored timestamps are the worst possible mechanism: they are
projection data smuggled into source, and nothing can check them.

cuecraft has something better available and has had it since decision:11. Narration is already an
ordered list of separately measured fragments, so the compiler already knows exactly when each one
begins (decision:13). If the author states the *relationship*, the compiler can derive the time.

## Decision

A bullet may carry a semantic identity, and a narration cue may say it reaches one.

```yaml
bullets:
  - id: tool
    text: Which tool the agent invoked
say:
  - speech: "Which tool the agent invoked,"
    activates: tool
```

That is the whole source language. No time, no frame, no duration, no animation name, no easing,
no ordering directive. `activates` takes one identity, not a list — an author who wants two splits
the cue, which is the same pressure decision:10 applies to layout.

**The compiled form is a relationship, not a command.** Each link resolves to an `Anchor`
carrying both endpoints and the derived frame:

```ts
interface Anchor { id; bulletIndex; clipIndex; frame }
```

The obvious alternative — putting `establishedAtFrame` on the bullet — would have been smaller and
would have destroyed the relation. An `Anchor` answers "when does this bullet establish?" and
"which narration reaches this bullet?" equally well. Nothing reads it in the second direction
today; the point is that a caption, a seek, or a debugger could, without this being rebuilt. It is
not promoted to the IR of idea:3 and does not want to be.

**Activation time** is the activating clip's start plus its measured leading silence
(decision:13), so the visual lands with the first spoken sound.

**Emphasis is cumulative and the treatment is not authorable.** An anchored element is present
from the first frame but recessive, and becomes established when narration reaches it, staying
established. The slide reads as a still from the moment it appears and the narration builds
emphasis over it rather than revealing information. There is one treatment — contrast and the
accent ordinal coming up together, with a four-pixel settle — chosen by the renderer, per
decision:10.

**Anchors are validated statically**, naming the slide and the cue: an `activates` with no
matching bullet, two bullets claiming one identity, two cues reaching one identity, and malformed
identifiers. A dangling reference is a hard error. Rendering a slide whose narration was meant to
build it, without building it, is the silent failure a compiler exists to prevent.

## Consequences

- Rewording narration cannot desynchronize a deck. There is no number to go stale; re-rendering
  re-derives every activation from the new audio.
- Granularity is the cue. "Narration reaches this concept" means "the fragment that says it
  begins", so an anchor inside a sentence requires splitting the sentence — which is audible
  (decision:11). The specimen's four short cues sound deliberate, but that is a property of that
  writing, not a guarantee.
- The relationship is one-to-one and unordered by construction, and both restrictions are
  arbitrary-ish. One cue reaching two elements, or an element reached twice for re-emphasis, are
  plausible and currently errors.
- Only the `index` archetype implements the treatment. `matrix` and `lead` would need their own,
  and `statement` has nothing to anchor. That is honest for a probe and would be a gap in a
  feature.
- The working nickname during design was *triggered wormholes*. It stays here.
