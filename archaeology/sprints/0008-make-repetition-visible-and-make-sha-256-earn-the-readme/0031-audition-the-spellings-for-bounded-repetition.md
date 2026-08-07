---
id: tsk_01KZESBWSEC796TD0S1A0ERBRW
sequence: 31
kind: task
status: closed
sprint: spr_01KZES9SFB63FP2G1CRH4NTKEN
created: 2026-08-07
closed: 2026-08-07
---

# Audition the spellings for bounded repetition

## Objective

Audition the spellings for bounded repetition on paper, choose one, and write down what the
losers taught.

Four candidates, and the point of writing them out is that three of them are wrong for reasons
that are only visible side by side:

**A relation that repeats.** `- round -> round` with a count on it. Cheapest, and it says "again"
rather than "sixty-four times" — one glyph on an edge cannot be watched accumulating, which is
the whole requirement.

**Multiplicity on an entity.** `repeats: 64` beside `child: ./round.yaml`. Attractive because it
is an adjective on the thing that actually repeats, and it composes with the interiors that
already exist. Its problem is scale: a plate is a few hundred world units and sixty-four legible
members do not fit in one, so the population would have to be drawn somewhere the author did not
put it.

**A content role.** The population is *content*, so it is a body — which means it gets a whole
composition, can be an entity's inside, can be a module's body, and inherits `bodyElements`,
addressing, portals and activation with nothing added.

**Something the compiler suggests.** Held open until the first three have been written down.

Whatever wins must also answer the message schedule, where the population has two kinds of member
— sixteen that arrive with the block and forty-eight that are derived — without inventing generic
grouping machinery to do it.

## Acceptance criteria

- All four spellings written out as real YAML against both the rounds and the schedule.
- One chosen, with the reason stated as *what it says* rather than what it renders.
- The rejected three recorded with what each one could not do.
- The chosen surface states meaning: a count, and what the members are. It cannot state a cell, a
  row, a column, a coordinate, a colour, a duration, or a frame.
- The schedule's sixteen-and-forty-eight is answered by the winner or explicitly handed to the
  surrounding world, and the choice is argued.
