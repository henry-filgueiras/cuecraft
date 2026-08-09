---
id: tsk_01KZKHF8D71YYEXZ77D1HXWWG3
sequence: 111
kind: task
status: closed
sprint: spr_01KZKHF8BF2P8G72QXG4BH13G9
created: 2026-08-09
closed: 2026-08-09
---

# Decide that a slide may be about the run

## Objective

Record, as a decision, that an author may declare a machine slide to be about the narrated run
rather than the whole machine — and engage directly with the paragraph in
`../presentation/machine.ts` that argues the opposite.

That paragraph is not incidental. It says the tempting spelling is a list of transitions with no
topology, that it "renders, and it is a different artifact — an animated event log", and that "what
makes this a state machine explainer is precisely the transitions the scenario **does not take**".
A reduction key moves toward that artifact on purpose, for one slide at a time, and the decision has
to say why that is a projection rather than a retreat.

## Acceptance criteria

- A decision artifact recorded before the grammar changes, stating what `scope: narrated` means,
  what it costs a viewer, and why it is opt-in rather than a policy.
- It quotes the `machine.ts` paragraph it is qualifying and says exactly how far the qualification
  reaches — one slide, declared, never inferred.
- It states the criterion (touched by the scenario) and records the three that were measured and
  refused, with their numbers, so they are not re-derived.
- It states the honesty requirement as a condition of the feature existing, not as a nicety: a
  reduced map that does not declare its reduction is a smaller machine asserted as the whole one.
- It says what stays refused: no partial reduction, no second criterion, no layout change, and no
  key that could carry geometry or time.
