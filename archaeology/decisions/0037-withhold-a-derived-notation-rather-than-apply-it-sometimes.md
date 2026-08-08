---
id: dec_01KZFEE6AKYN1K2W1WTGSBRJKB
sequence: 37
kind: decision
status: accepted
created: 2026-08-07
---

# Withhold a derived notation rather than apply it sometimes

## Context

The message order of a sequence diagram implies a call stack, and reading it is the standard
heuristic every draughtsman applies without being told: **a message that goes back the way the last
unanswered one came is an answer to it.** One stack, one pass, and it hands you two pieces of
notation nobody authored — a reply, drawn dashed, and a bar on the lifeline of whoever is holding
an unanswered call for exactly as long as they hold it.

`examples/tap.yaml` is perfectly nested and the notation is perfect on it. `examples/deploy.yaml`
was built to break things, and it broke this:

    forge -> ci    webhook: push refs/heads/main 9f2c1ab
    ci -> forge    clone at 9f2c1ab

Two independent requests. The stack sees a call and its answer, draws the clone dashed, and then
draws the *actual* response — `47 MB of history` — solid, because by then the stack has moved on.
The notation is exactly inverted. Worse, further down the film drew three identical `bind` messages
in two different styles, for a reason no viewer could possibly infer.

**No structural test can separate the two cases.** `A → B` then `B → A` is the same shape whether
it is a call and its answer or two notifications, and the difference is entirely semantic. Every
narrowing that was tried either failed on the deploy example or destroyed the nesting the card
example depends on — requiring adjacency breaks four-deep nesting; requiring the sub-exchange to be
balanced is what the stack already does. Reading the label text is refused: a compiler that decides
notation by looking for the word "response" is a compiler that will one day be wrong about somebody
called Response.

## Decision

**Withhold a derived notation rather than apply it sometimes.**

The notation is applied only when the protocol is *provably* call/return shaped: every call is
answered and nothing is left outstanding at the end. That is a global, checkable property, and a
misfire is impossible where it holds — because a misfire always leaves an unmatched call behind.

A balanced protocol gets its dashed returns and its activation bars. An unbalanced one gets
neither, and every arrow carries its meaning in its direction alone. The second case is poorer, and
it is never wrong.

## Consequences

- `examples/tap.yaml` keeps the notation; `examples/deploy.yaml` loses it entirely, and looks
  plainer and more honest for it. Direction turns out to carry most of what the dashes were
  carrying: a left-pointing arrow labelled `approved` reads as a return without help.
- **The rule has a cliff, and the cliff is deliberate** (dragon:17). Adding one unanswered
  notification to a balanced protocol removes the notation from the whole film. Smoothing that —
  applying it per message, or per region — is exactly the failure this replaced.
- The general principle is worth stating beyond this case, because cuecraft will keep being tempted
  by derivations that are usually right: **a derived notation must be either always correct or
  visibly absent.** A notation that is correct most of the time teaches the viewer to trust it, and
  then lies to them once. There is no author-facing repair for that, and adding one would be
  admitting the derivation should never have been attempted.
- This is the round's most expensive finding and the most useful one. The inference was free, the
  picture it produced was attractive, and it was wrong — which is only discoverable by building a
  hostile example and *looking at it*.
