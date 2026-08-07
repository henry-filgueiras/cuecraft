---
id: dec_01KZEWE0GTBKMJBWZTYV888N2B
sequence: 33
kind: decision
status: accepted
created: 2026-08-07
---

# Let a body be a bounded population, and a sentence fill it

## Context

sprint:7's SHA-256 film was accurate about one compression round and silent about sixty-three of
them. The gap it exposed is precise, and it is not a rendering gap:

> cuecraft can show one unit of work. It cannot show that unit becoming repeated work.

Everything the format had was a **point**. An element exists; narration reaches it at a moment;
`activates:` says those two are the same idea and the compiler works out the frame (decision:14).
Repetition is not a point. It is a population with a size, and a stretch of narration during which
a viewer watches it accumulate.

The film's answer had been the sentence *"sixty-four of them, stacked"* — a claim the picture never
corroborates. That is exactly the failure `activates:` was invented to prevent: decision:14 makes
an identity nothing declares a compile error, because narration asserting something the frame does
not show is the silent desynchronisation a compiler exists to catch. The narration was allowed to
do by voice what the format forbids by reference.

**On decision:30.** That decision paused feature expansion until three artifacts had been seen, and
named its own exception: "a blocking defect found while packaging is still fair game". This is
that defect. A film cannot be promoted to the README while its central claim is carried entirely by
the voice, and the seam being opened is the one the artifact demonstrably broke on. The pause is
**narrowed by this round, not lifted** — nothing else in idea:16's parked vocabulary was built.

## Decision

**A body may be a bounded population, and a sentence may fill it.**

```yaml
series:
  - count: 16
    text: arrive with the block
  - id: derived
    count: 48
    text: built from four earlier words each

say:
  - speech: "And forty-eight more are built out of them, one at a time."
    fills: derived
```

**A group is an item with a cardinality**, and that is why this needed almost nothing underneath
it. Groups are *elements*: they resolve through `bodyElements`, address through `bodyAddresses`,
activate through the same three-state envelope, and open as an interior through decision:25. The
**members are not elements and never will be** — they have no identity, no content, and no way to
acquire either. The moment a member could carry something of its own this would stop being a
quantifier and become a table, which is a different feature with a much larger blast radius.

**`fills:` is a second relationship, not the first one overloaded.** An `Anchor` is a frame; a
`Span` is a range. They are separate records in the compiled scene because a field that sometimes
means "at this frame" and sometimes "across this clip" is one field with two incompatible meanings,
and the consumer that forgot to check which would be silently wrong rather than loudly broken. A
cue may carry `activates` or `fills` and never both: those are two different claims about one
moment.

**The duration is measured, and there is no key that could set it.** A span begins at the clip's
first audible sample — decision:13's rule, the same one an anchor uses, because a population that
started filling during Kokoro's leading silence would be visibly ahead of the voice. It ends with
the clip. Trailing silence is deliberately **not** subtracted, because nothing measures it:
`leadingSilence` is the only onset the synthesizer reports, and subtracting a guess would be
inventing a measurement. The consequence is that the field completes a beat before the last word
rather than after it, which is the side to err on.

**Everything else is derived.** The arrangement comes from the count alone, searched against a cost
that wants a near-square field and hates holes — 64 is 8×8, 48 is 8×6, 90 is 10×9, 7 is 4×2, and
the rule is verified for every count from 1 to 200. The member size comes from the box. The order
is reading order, because that is the order a viewer would count in and an order nobody has to be
told is an order that costs no narration. The colours are the deck's, unchanged: a member that has
not happened is `future`, one that has is normal, and the accent is spent on the frontier alone
(decision:23).

### Three spellings rejected

**A relation that repeats** — `round -> round`, with a count on it. Cheapest, and wrong twice. It
says *again*, never *sixty-four times*: one glyph on an edge cannot be watched accumulating, which
is the entire requirement. And it has nowhere to attach in a message schedule, whose repetition is
not an edge between two entities at all.

**Multiplicity on an entity** — `repeats: 64` beside `child: ./round.yaml`. The most attractive of
the three, because it is an adjective on exactly the noun that repeats and it composes with the
interiors that already exist. It fails on scale and on scope: a plate is a few hundred world units,
so sixty-four legible members cannot be drawn where the author put them, and it can only ever
describe an *entity*, so a population that is not a node in a world has nowhere to live.

**Asking the compiler** — the fourth candidate turned out not to be a fourth. `bodyElements` is
already "the list of elements narration can reach", every body is already a list of those, and
`change` already proved a body may declare an element the author never typed. The shape the
compiler was asking for was a body whose elements are groups carrying a cardinality, which is the
one that won.

## Consequences

- **The eleventh archetype, and the ceiling was meant to be nine.** Both of the two that broke it —
  `formula` and `series` — were added because a *role* had no composition, not because an
  arrangement wanted a variant. That is evidence the ceiling in `layout.ts` was always about
  arrangements and never about meanings, and it is now recorded there.
- **What is deliberately absent is the whole of control flow.** No condition, no branch, no bound
  that could be unknown or data-dependent, no nesting, no concurrency, no "until", and no index the
  author can name. A series states a finite cardinality that was true before the presentation
  existed. It does not run, and nothing about it should ever be made to.
- **The ceiling on members is reasoned from legibility.** Five hundred and twelve is thirty-two by
  sixteen at about forty pixels a cell — still plainly a grid of things. An order of magnitude
  above that it is texture, the count stops being checkable by looking, and the composition would
  be asserting a number again, which is the failure this exists to fix.
- **A bug worth keeping.** `Interior` reindexed anchors into a chamber's local element list and did
  not reindex spans, so a population inside a chamber looked up nothing, fell through to the
  unanchored default — *established*, because that is what an element the narration never reaches
  is — and drew a field that was complete on its first frame and never moved. It rendered
  beautifully and taught the opposite of the truth. No test caught it; watching did.
- **The interval exposed a pacing constraint nothing else has.** A derived portal takes about three
  and a half seconds to open (decision:25), so a `fills:` cue that follows immediately after the
  cue that opened the chamber begins while the chamber is still expanding. The fix was in the
  artifact — lengthen the sentence that opens it — and the general problem is dragon:15.
- The narration vocabulary is now three words wide: `activates`, `fills`, `enter`. That is the
  most a cue can say, and each one says something a different layer of the compiler consumes.
