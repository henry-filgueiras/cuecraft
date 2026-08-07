---
id: tsk_01KZEFMY2DRNTQJCJSJZ7Q9YDM
sequence: 20
kind: task
status: closed
sprint: spr_01KZEFJJVPNCDAJ6MJHYZCN95M
created: 2026-08-07
closed: 2026-08-07
---

# Address every element, and let an entity name a child module

## Objective

Give every reachable element a structural address, and give an entity a file-backed interior.

    root
    root/payment
    root/payment/check
    root/payment/check/verdict

`bodyElements` already publishes one flat, recursive element order and `interiorRange` already
owns the offsets. What it does not publish is *which* element each index is, and an index is a
useless thing to put in a diagnostic. So a parallel derivation names them, from the same walk,
in the same module, for the same reason `interiorRange` lives next to `bodyElements`: two places
that agree about an ordering are one edit away from disagreeing about it.

An address also carries the one distinction this round turns on. An inline `detail` is addressed
under its entity but is **reachable from the enclosing narration** — that is decision:25 and it
does not change. A `child:` module is addressed under its entity and is **reachable only from its
own narration**, because it brought some. So an address knows two things: where the element sits,
and which scope may speak to it.

Then the loader: `child: ./payment.yaml` resolves relative to the file that declared it, is read
through the same injected repository reader every other quoted file uses, and yields one body plus
one `say`. A module is not a presentation. `title`, `slides` and `defaults` are refused by name.

## Acceptance criteria

- `bodyAddresses(body, scope)` returns one entry per `bodyElements` entry, in the same order,
  carrying the element's address and the narration scope entitled to reach it.
- An element with no declared identity has no address, and never matches one.
- A module path is relative, resolves against the declaring file's directory, is canonicalized,
  and may not escape the repository.
- Loading is depth-first and carries its inclusion chain. A direct cycle, an indirect cycle, and
  a module that includes itself transitively all fail with the whole chain in the message.
- Depth beyond the supported grandchild fails with a diagnostic that says what the limit is and
  which chain hit it.
- A missing file, a file that is not YAML, a module with no body, a module with two bodies, and a
  module carrying `title`/`slides`/`defaults` each fail with a sentence an author can act on.
- Resolution is unit-tested against an injected reader, with no disk and no network.
