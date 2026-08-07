---
id: drg_01KZEHVANPZ3BRE4ES865HTAZ8
sequence: 11
kind: dragon
status: open
created: 2026-08-07
---

# A module is contained by cuecraft's checkout, not by the deck's own directory

## Context

decision:31 lets a presentation name a child module, and resolves it through the same reader a
quoted specimen uses — which means it inherits the same boundary: a module must live inside the
cuecraft checkout.

That boundary was correct when it was drawn. `source.ts` refuses traversal because "a format that
can read `/etc/passwd` onto a slide is a format nobody should run on a file they were sent", and a
quoted specimen exists to quote *this repository's* source, so the checkout is exactly the right
scope for it.

For a module it is the wrong scope, and the difference is easy to miss because the mechanism is
identical. A module is not a file the presentation *quotes*; it is part of the presentation. The
natural containment for it is the directory the deck lives in, and the deck does not live in
cuecraft's checkout — it lives wherever its author put it. So today:

    cuecraft render examples/order/order.yaml       works
    cuecraft render ~/talks/order/order.yaml        parses, and cannot descend

The failure is at least legible: `resolveModuleSpec` refuses an absolute base with a sentence
saying the declaring file is not inside this checkout. But "legible" is not the same as "right",
and the render test had to write its fixture into `.cuecraft/` to exercise the nested path at all,
which is the smell.

## Question

What is a presentation's own root, and is it the same root a specimen quotes against?

## Constraints

The obvious answer — contain a module against the *presentation's* directory instead — is probably
right and is not free. It introduces a second boundary, which means two rules for "may cuecraft
read this", and two rules is how one of them ends up not being enforced. It also makes a deck's
meaning depend on where it sits, which is fine for `./paying.yaml` and much less fine when
somebody writes `../../../shared/`.

The deeper version of the question is whether cuecraft has a notion of a *project* at all. Right
now it has a repository (its own) and a file (yours), and nothing in between. Everything that has
wanted a project so far — the render workspace, the model cache, the narration freeze of
decision:3 — has been answered with "put it under the cuecraft checkout", and that answer is
starting to accumulate.

## Candidate direction

Do not fix this by widening the specimen boundary; those are two different questions wearing one
implementation. When a real deck outside the checkout wants modules, give the presentation its own
containment root — its directory — and keep quoting contained by the repository as it is. Write
down at that point whether the two roots are genuinely different things or whether cuecraft has
been missing a project all along.

## Resolution criteria

Close as **resolved** when a deck outside the checkout can descend, with a boundary that is stated
rather than inherited. Close as **superseded** if cuecraft grows a project root for another reason
and this falls out of it.
