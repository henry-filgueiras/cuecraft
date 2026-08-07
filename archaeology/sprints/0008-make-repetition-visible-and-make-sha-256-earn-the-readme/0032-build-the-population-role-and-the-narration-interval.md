---
id: tsk_01KZESBWSKYRN8T3PHXCCYXXNS
sequence: 32
kind: task
status: closed
sprint: spr_01KZES9SFB63FP2G1CRH4NTKEN
created: 2026-08-07
closed: 2026-08-07
---

# Build the population role and the narration interval

## Objective

Build the role, and give narration a way to say "over this sentence, that fills up".

Two additions, and the second is the one that needs care. Everything cuecraft has resolved so far
is a **point**: an identity, and the frame the narration reached it on (decision:14). Accumulation
is not a point and must not pretend to be one — an `activates:` that sometimes means "at this
frame" and sometimes means "across this clip" is one field with two incompatible meanings, and the
second one wins silently whenever a component forgets to check.

So the interval is its own relationship, compiled into its own record beside `Anchor` and `Call`,
and the two coexist: a population may be reached at a point (it exists) and filled over an
interval (it accumulates), and those are different sentences.

Its duration comes from the same place every other duration in cuecraft comes from — measured
audio (decision:13, decision:9). Rewording the sentence retimes the visual, and there is no key
that could ever set it.

## Acceptance criteria

- The body parses, validates, and normalizes into the closed union like every other body.
- Counts that are zero, negative, fractional, absent, non-numeric, or past a stated maximum each
  fail at parse time with a sentence naming what is wrong.
- The maximum is reasoned from legibility rather than picked, and the reasoning is in the code.
- A narration cue may fill exactly one member group; filling something that is not one, or that
  the cue's scope cannot reach, fails with the scope named.
- A cue may not both activate and fill — those are two claims about one moment.
- The compiled scene carries the interval explicitly: which element, which scope, which frames.
- The interval begins at the first audible sample and ends with the clip. What is *not* measured
  (trailing silence) is documented rather than guessed at.
- Resolution works inside child modules, and two modules may both name a group `derived`.
- Geometry is a pure function of count and frame shape, in its own module, with no Remotion import.
- The renderer receives a count and a fraction. It cannot discover what the members are for.
