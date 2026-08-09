---
id: drg_01KZJ288S9J06AWKD2KR9J8AFR
sequence: 25
kind: dragon
status: open
created: 2026-08-08
---

# A recall can quote one utterance, but not an authored passage

## Context

`recall: <id>` resolves to exactly one earlier root-scoped `activates`, and what it replays is that
one speech cue's **measured clip**: `Clip.from` to `Clip.from + durationInFrames`, whole, including
the leading silence decision:13 measures and whatever trailing silence Kokoro left. Nothing else is
in the window. An authored `pause:` next to it is not; the speech on either side of that pause is
not.

Those are the landed semantics and they are deliberate. "First activation wins" is *not* a rule —
two earlier slides declaring the same id is an error that names both, so a recall can never quietly
mean one of two things. The window is the clip because the clip is the only thing that was measured.

The problem is that an author's unit of evidence is not always cuecraft's unit of measurement:

```yaml
- speech: "The first charge settled."
  activates: settlement
- pause: 600ms
- speech: "The gateway never acknowledged it."
```

`recall: settlement` quotes the first sentence and stops. Read as prose, all three cues are one piece
of evidence — the claim, the beat, and the thing that makes the claim matter — and an author who
anchored the first sentence because it is where the idea *starts* will reasonably expect the recall
to bring the passage. What they get is a fragment that ends before the point.

## Question

Should an author be able to quote an authored *passage* rather than a single measured utterance, and
if so, what names it?

## Constraints

The obvious widening is unsafe, and it is worth writing down why, because it is the answer somebody
will reach for first:

> from the activation until the next activation, or the end of the narration

- **`activates` is a point, not an interval boundary.** decision:14's whole claim is that a moment in
  the narration and an element are the same idea. Nothing about that says where the idea *ends*, and
  reading a second meaning into a key that already has one is how a format acquires two
  interpretations of the same word.
- **The following cue may be about something else entirely.** Nothing stops the next sentence being a
  change of subject; the rule would quote it anyway.
- **The distance is unbounded.** With no further activation the window runs to the end of the slide's
  narration, so a deck that anchors once and then talks for forty seconds gets a forty-second
  quotation from a one-line cue.
- **It is not stable under editing.** Inserting an unrelated `activates:` between the anchor and the
  end would silently *shorten* every existing recall of it. A reference whose meaning changes because
  somebody added an unrelated line elsewhere is exactly the silent synchronization loss a compiler
  exists to prevent.

There is also a smaller constraint that any answer has to respect: whatever a passage is, its
duration has to come from measurement rather than from arithmetic on authored numbers, and it has to
walk the one serialized track like everything else (decision:43).

## Candidate direction

The likely creature is an **explicitly named, half-open narration segment** — a thing the author
opens and closes on purpose, which may contain speech *and* pauses, and which a recall may name in
exactly the way it names an anchor today. Explicit because every objection above is an objection to
*inferring* an extent; named because a recall needs something to point at; half-open because that is
how every other range in this repository is written.

It is also the natural unit for a later cross-deck recall to export: a deck that wants to be quoted
from outside should say what its quotable pieces are, and "the passage between these two points" is a
better export surface than "clip four of slide two".

No syntax is chosen here and none should be. The thing to notice first is that this is a **second**
kind of reference into narration, and cuecraft currently has one; adding a second is a decision about
the language, not a feature.

## Resolution criteria

Settled when either a decision records a named-segment construct with its own artifact and specimen,
or a decision records that one utterance is the right unit and an author who wants a passage should
write it as one cue. Reaching for "the next activation" without answering the four objections above
does not settle it.
