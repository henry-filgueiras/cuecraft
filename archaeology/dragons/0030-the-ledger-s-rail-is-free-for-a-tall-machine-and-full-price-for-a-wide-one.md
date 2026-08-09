---
id: drg_01KZJHQVGAW81945064CV5T054
sequence: 30
kind: dragon
status: open
created: 2026-08-08
---

# The ledger's rail is free for a tall machine and full price for a wide one

## Context

decision:49's rail is `MACHINE.rail` — a constant 380 pixels taken off the camera's window before
anything is laid out, which is what makes "no state is ever under the ledger" an invariant rather
than luck. The cost of that constant is completely asymmetric, and the arithmetic is exact rather
than approximate.

A **height-bound** overview scales as `viewportHeight / machineHeight`. The viewport's width does
not appear in it, so the rail is free. `examples/elevator.yaml` is height-bound and its state names
are 37.5px with the rail and 37.5px without it.

A **width-bound** overview scales as `viewportWidth / machineWidth`, so the rail costs twenty
percent of it, in full. `examples/leases.yaml` is width-bound. The audition (decision:52) claws most
of it back — 23.9px against the 23.4px it had at full width before the round — but that is the
search paying for the rail rather than the rail being free.

So the composition now charges its **widest** machines for its chronology, which is an improvement
on dragon:29's band charging its tallest for a caption, and is still a machine-shaped tax that
nobody chose.

The unused room is measurable and large. At the canonical overview the elevator's machine occupies
about 880 of the 1540 pixels it is given, leaving roughly 660 pixels of horizontal slack that the
rail could have had for nothing. The leased runner leaves about 125.

## Question

Should the ledger's rail be a constant, or should it be **what the machine's own proportions leave
over** — and if the latter, how does a rail whose width is derived avoid becoming a second layout
that the first one depends on?

## Constraints

The circularity is the real difficulty. The rail's width changes the viewport, the viewport changes
which layout the audition elects, and the elected layout changes how much slack there is. A fixed
point exists in principle; two passes would be deterministic and cheap, but the second pass's layout
would be fitted into a rail allocated from the first pass's slack, which is honest only if it is
written down as exactly that.

The rail cannot vary *within* a film for the same reason `MACHINE.chrome` could not: a reserved
region that changed would move the camera, and a viewport that grew when a row was added would be a
zoom nobody wrote.

A derived rail also makes the ledger's own type a function of the machine, since a 660-pixel rail
would set its rows very differently from a 300-pixel one. That is not obviously bad — `fitLedger`
already fits to what it is given — but it means two films of the same deck could set their
chronologies at visibly different sizes, which is the kind of inconsistency decision:28 spends real
effort avoiding elsewhere.

And there is a floor below which a rail stops being a rail. `fitLedger` degrades by dropping rows
once the type hits its floor, so a very narrow rail would show three entries where a wide one shows
six — a machine's shape silently deciding how much history its film keeps.

## Candidate direction

## Resolution criteria

Close as **correct** if a third and fourth machine pay the constant without the loss being visible —
that is, if no width-bound film's overview is judged unreadable *because of* the rail rather than
because of its own topology. Close as **fixable** if a derived rail can be shown to buy a wide
machine back its legibility without making the ledger's type a lottery, in which case the two-pass
allocation is the shape. Close as **inherent** if the honest answer is that a 16:9 frame cannot hold
both a chronology and a wide atlas, and the format should say which one a wide machine gives up.
