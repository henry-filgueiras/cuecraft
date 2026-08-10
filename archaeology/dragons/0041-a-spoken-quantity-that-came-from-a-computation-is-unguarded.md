---
id: drg_01KZMS58AF1NRY622F8D5Z46RQ
sequence: 41
kind: dragon
status: open
created: 2026-08-09
---

# A spoken quantity that came from a computation is unguarded

## Context

A deck can now say a number out loud that came from a computation it does not perform. Nothing
checks that the number is still true.

`examples/phantom/phantom.yaml` says "one gap has closed by fifteen centimetres", "twelve seconds
later", and "about twelve kilometres an hour". All three are measured off the run `model.R`
records, and all three were correct on the day they were written. None of them is checked by
anything. Change `TAU` from 0.5 to 0.55 and the film is still beautiful, the compile still
succeeds, every test still passes, and the narration is describing a run that no longer happens.

This is the failure decision:18 exists to refuse for quoted source, and the failure
`src/examples.test.ts` already catches for `examples/sha256/` — where the deck's own TeX is read
out, a reference SHA-256 is built from it, and the digest checked against `node:crypto`. The
phantom deck has the same exposure and only part of the guard: the states it stops the film at
are checked against the program, and the names it addresses are checked against the drawing, but
the **quantities in the prose** are not checked against anything.

## Question

Can a deck that quotes a computation be prevented from going stale about it, without
requiring R to run `npm run check` and without inventing templating inside narration?

## Constraints

The easy answer — assert the numbers in a test — is the one decision:55 already refused a version
of, and for a reason that applies here. A test that hard-codes "fifteen centimetres" is a second
copy of the claim, not a check of it: both copies drift together the moment somebody updates one
and remembers the other. What would actually help is running the model and reading the sentence,
and that means `npm run check` needs R, which no other test does and which the exhibit tests
deliberately avoid (they read the *programs* as text so a machine with no R can still verify).

The other answer — stop saying numbers — costs the thing that makes the deck evidence rather
than assertion. "One gap has closed by fifteen centimetres" is the whole of why the slide lands.

## Candidate direction

There may be a third answer: a program could **emit** the sentence fragments it is entitled to, the way
`wave.R` already writes its own axis labels rather than letting the deck name car numbers. The
deck's slide 5 says "the car directly in front of the one that stopped first" and never says
which car, precisely so it cannot go stale — and that was a deliberate choice made twice while
writing it. Whether that generalises to a quantity in the middle of a spoken sentence, without
inventing templating in the narration, is the open part.

## Resolution criteria

A change to `model.R`'s parameters that makes one of the three quantities false, and a run of
`npm run check` that fails because of it — with no R installed on the machine running the check.
If that cannot be arranged, the honest resolution is the opposite one: write down that spoken
quantities are unguarded, and that a deck which quotes a computation carries a maintenance debt
the compiler cannot pay.

Related: `idea:22` (there is no cache, because correct invalidation is hard), `decision:18`,
`decision:55`.
