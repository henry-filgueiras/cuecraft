---
id: ide_01KZC3N0RFX6DK5GNZXZE5VCC4
sequence: 6
kind: idea
status: parked
created: 2026-08-06
---

# Reveal slide content as narration reaches it

## Problem

Narration and slide content are timed against each other only at the slide level. A bullet
appears when its stagger delay elapses, not when the narration reaches the phrase it belongs to,
so on a slide whose narration discusses items in order the two drift apart by design.

## Sketch

decision:11 already splits narration into cues with measured durations and known frame positions.
A cue could name the content it accompanies, and the renderer could reveal that content when the
cue begins:

```yaml
say:
  - "First, it records which tool ran."   # reveals bullet 1
  - "Then how long the call took."        # reveals bullet 2
```

Association could be positional (cue N reveals item N), which needs no syntax at all, or explicit,
which needs some.

## Boundaries

Word-level synchronization — highlighting individual words as they are spoken — is a different and
much larger problem needing forced alignment, and is not this.

Positional association is seductive and brittle: it silently couples the number of cues to the
number of bullets, and breaks the moment an author adds a sentence.

## Evidence

Adopt when watching a deck shows the reveal order fighting the narration rather than supporting
it. On the four-slide canonical deck it does not — the entrance settles within a second and the
narration runs over a static frame, which is restrained and fine.
