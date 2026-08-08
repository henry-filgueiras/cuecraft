---
id: drg_01KZFF019S5YD8DP1NDCKTV0MM
sequence: 17
kind: dragon
status: open
created: 2026-08-07
---

# A derived notation is all-or-nothing across a whole protocol

## Context

decision:37 applies the derived reply notation — dashed returns, and a bar on the lifeline of
whoever is holding an unanswered call — only when the whole protocol provably balances, and
withholds it entirely otherwise. That is the right trade against the alternative, which was
applying it sometimes and being visibly wrong about three identical messages in a row.

But it is a **cliff**, and the cliff is in a place an author cannot see. `examples/tap.yaml`
balances exactly: thirteen messages, every call answered, nothing outstanding. Adding one
notification anywhere in it — `terminal -> printer: receipt`, say — removes the dashes and the bars
from the *entire film*, at no other cost and with no message explaining why.

## Question

Is "the whole exchange balances" the right granularity for a derived notation, or should the unit
be smaller — a contiguous run, a sub-exchange, a phase?

## Constraints

- **The failure being avoided is real and was measured.** Applying the rule per message drew three
  identical `bind orders-… to node-…` arrows in two different styles in `examples/deploy.yaml`,
  which a viewer can neither explain nor ignore.
- **No structural test separates a notification from a call.** `A → B` then `B → A` is the same
  shape either way. This was tried several ways and none survived both examples: adjacency destroys
  four-deep nesting, and requiring a balanced sub-exchange is what the stack already does.
- **Nothing may be authored.** A `reply: true` key, or a `style:` key, is the mechanical authoring
  the whole project exists to avoid, and the sprint that produced this refused it in advance.
- **Silence is safe.** A protocol with no dashes is poorer and never wrong. Whatever replaces this
  has to keep that property.

## Candidate direction

Per-region balance: partition the steps into maximal contiguous runs that balance on their own, and
apply the notation inside a run and not across one. `examples/tap.yaml` would split into two runs —
authorisation and settlement — and both balance, so nothing changes there. `examples/deploy.yaml`
would find several small balanced runs (`kubelet ↔ registry`) inside a stream that does not, which
is *more* information than it has now and might be correct.

The risk is that it reintroduces the failure at a smaller scale: a run that balances by accident
still gets the notation, and the `clone at 9f2c1ab` case is exactly a two-message run that balances
by accident. That is the thing to check before building it.

## Resolution criteria

A rule that draws `examples/deploy.yaml`'s webhook-and-clone pair *without* a dashed return, draws
`examples/tap.yaml` exactly as it is drawn now, and does not change when an unrelated message is
added at the end of either. Until something satisfies all three, the cliff stays.
