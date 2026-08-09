---
id: tsk_01KZJDMQN6QF7QC5509P456KGA
sequence: 97
kind: task
status: closed
sprint: spr_01KZJDK32M4VSS1AC8R169WAWK
created: 2026-08-08
closed: 2026-08-08
---

# Budget the phases, and pay the arrival

## Objective

Make an occurrence's time an explicit budget over named phases, and give a silent arrival a stable
hold it cannot be robbed of. Then measure the closing post-roll and remove whatever is not buying a
settled overview.

## Acceptance criteria

- An occurrence's interval decomposes into camera preparation, traversal, arrival, narration and
  hold, derived in one place and consumed by both the renderer and the diagnostic.
- A silent occurrence's stable post-arrival hold has a floor that a test asserts, and the floor is
  a derived policy rather than a constant an author can reach.
- The camera never moves while the traveller is crossing, and a test says so from the phases rather
  than from the constants.
- The final post-roll is bounded and intentional: the settled overview is held long enough to read
  the route and no longer, and there is exactly one mechanism responsible for it.
- Narrated occurrences still settle naturally when the sentence outlasts the crossing, and nothing
  ambient is invented to fill narration time.
