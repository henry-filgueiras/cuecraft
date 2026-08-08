---
id: drg_01KZHG68T848ATRXVPSQTA7ZKF
sequence: 20
kind: dragon
status: open
created: 2026-08-08
---

# A module's narrator comes from whoever entered it

## Context

decision:39 made narrator selection lexical: a cue takes its own narrator, else its slide's, else
the deck's, and never the preceding cue's. Every scope in that chain is a piece of text containing
the cue — except one.

A child module's cues take the narrator of the **slide that entered them**. The module is a
different file and nothing in it mentions a narrator, so what contains its narration depends on who
called it. Entered from two slides with different narrators, the same module speaks in two voices.

It was done that way because a module may declare no `defaults` of its own (decision:31) — theme,
voice and timing are the root presentation's, inherited whole — so a module has no way to say who
speaks it, and the only alternative was to skip the slide and inherit the deck's narrator. That
reads audibly wrong: a slide that says `narrator: aside` and then descends would be interrupted by
the deck's narrator for the length of the descent, when the descent is the same sentence continuing
at a smaller scale.

## Question

Is inheriting the caller's narrator the right rule, or is it the one place where "lexical" quietly
became "dynamic" and nobody noticed because no deck exercises it?

## Constraints

- A module read on its own cannot currently be read: who speaks it is not in it.
- decision:31 refuses to let a module carry `defaults`, and that refusal is what keeps a module from
  becoming a second deck wearing an entity's name. Any answer that gives a module its own narrator
  has to argue with it.
- A module's individual cues may already name a narrator of the deck's, so the escape hatch for "this
  line is somebody else" exists; what is missing is "this whole module is somebody else".

## Candidate direction

Leave it. The alternative has no advocate, and the fix is one line and a decision if a film ever
disagrees.

## Resolution criteria

Two things would settle it and neither has happened:

- **A module entered from two places**, which no deck does today. Whether one voice or two reads as
  correct is a question about a film nobody has watched.
- **A module that wants a particular speaker by nature** — a footnote, an interior that is an aside
  all the way down. That is the case that would force the argument with decision:31.
