---
id: spr_01KZES9SFB63FP2G1CRH4NTKEN
sequence: 8
kind: sprint
status: active
created: 2026-08-07
---

# Make repetition visible, and make SHA-256 earn the README

## Goal

Make **bounded repetition visible**, and rebuild the SHA-256 film until it earns the top of the
README.

    understand one round at human scale
      -> come out and find it is one of sixty-four
        -> watch the field of sixty-four accumulate while a sentence is spoken
          -> fold the result back into the running state
            -> return to the outer algorithm

The language addition is one content role and one narration relationship, and no more. The author
says *what repeats and how many times*; cuecraft derives the arrangement, the order, the pace, the
colour and the camera.

## Rationale

sprint:7 shipped a film that is accurate about one round and silent about sixty-three of them. The
gap it exposed is precise and it is not a rendering gap:

> Cuecraft can show one unit of work. It cannot show that unit becoming repeated work.

Everything the format has is a *point*: an element exists, and narration reaches it at a moment.
Repetition is not a point. It is a population with a size, and a stretch of narration during which
the viewer watches it accumulate. sprint:7's answer was the sentence *"sixty-four of them,
stacked"* — a claim the picture never supports, which is the exact failure `activates:` was
invented to prevent (decision:14: an identity nothing declares is a compile error, because silent
desynchronisation is the defect a compiler exists to catch). The narration is currently allowed to
assert something the frame cannot corroborate.

**Why this reopens decision:30's pause.** That decision stopped feature expansion until the three
artifacts had been *seen*, and its stated exception is "a blocking defect found while packaging is
still fair game". This is that: the film cannot be promoted to the README while its central claim
is carried entirely by the voice. The pause is narrowed by this round, not lifted — the seam being
opened is the one the artifact demonstrably broke on, and nothing else.

**Why a labelled back-edge is not enough.** `round -> round` annotated `x64` is one glyph saying
"again". It is true and it teaches nothing: a viewer who has just understood one round learns from
it only that there are more. What has to be *seen* is accumulation — sixty-four discrete pieces of
work coming into being at a rate a human can watch — because that is the only way the security
argument (diffusion through repeated mixing) becomes an observation rather than an assertion.

### The baseline this round is measured against

`examples/sha256/sha256.yaml` at 4b0aa25, rendered unchanged:

    duration        2:55.6
    source          284 lines across 4 files
    descent         root -> squeeze -> {stretch, round}, both returning
    scope sequence  5 cues / enter / 2 / enter / 7 / exit / 1 / enter / 7 / exit / 2 / exit / 2

What a viewer can learn from it: the outer pipeline; that a block is sixteen words stretched to
sixty-four; that a round mixes eight working words with two boolean functions; that `Ch` and `Maj`
are one line each.

What a viewer cannot learn from it, and this is the round's work list:

- that expansion happens forty-eight times — the voice says so and the frame does not;
- that a round happens sixty-four times — same;
- what `T1` and `T2` are, or that there are two big sigmas distinct from the schedule's two small
  ones;
- that `e` receives `d + T1` — the film says only that everything shifts down, which is wrong by
  omission and is the single largest factual defect;
- that the schedule word and the round constant enter each round;
- that feed-forward exists as a step, rather than as a clause in one sentence.

Claims requiring correction, found by audit rather than by watching:

- *"no way at all to walk backwards"* and *"impossible to walk back"* — absolute where the truth is
  computational infeasibility under assumptions, and false for low-entropy inputs.
- *"sixty-four of them, stacked, is what makes it impossible to walk back"* — attributes one-wayness
  to round count alone, ignoring compression, feed-forward and the construction.
- The Git opening implies the sixty-four characters a repository shows are SHA-256. Ordinary Git
  object names are SHA-1 by default; SHA-256 repositories exist and are not the common case.
- *"one of them gets stirred"* conflates the two big sigmas and attaches them to no path.

## Success criteria

- One new content role for a bounded population, plus whatever compiled narration relationship it
  genuinely requires, and nothing else. No `loop:`, no condition, no traversal, no runtime.
- The author writes a count and what the members are. The author cannot write a cell, a row, a
  column, a coordinate, a colour, a frame, a duration, or a camera instruction.
- Sixty-four members cost one YAML entry and zero extra narration clips.
- Arrangement is derived from the count and the frame's shape. An 8x8 field for sixty-four falls
  out of a general rule that also handles 1, 7, 16, 48, 90 and a stated maximum.
- Progress runs over a *measured narration interval*, so rewording the sentence retimes the
  visual with no edit to the source's structure.
- The interval is a first-class thing in the compiled timeline, inspectable beside anchors and
  calls. No component reads prose, guesses intent, or matches a magic id.
- Point activation stays a point. The interval is modelled as its own relationship rather than by
  overloading `activates` until it means two incompatible things.
- The renderer knows a count, a progress fraction and the deck's palette. It does not know what a
  compression round is, that sixty-four is special, or that a file called `sha256` exists.
- A generic non-cryptographic fixture proves the primitive is not a SHA-specific animation.
- Every technical claim in the film is checked against FIPS 180-4, and the round shows both real
  update paths — `T1` into `a`, and `d + T1` into `e`.
- Absolute one-wayness language is gone, and what replaces it is defensible.
- Message-schedule expansion is *seen*, not asserted.
- Feed-forward is a distinct causal step.
- 2:30–2:45, one slide, no cuts, the call stack intact. Three minutes needs evidence.
- The three existing showpieces render identically.
- `npm run check`, `npm run test:render`, `scarp doctor` clean.

## Non-goals

Conditionals, branch evaluation, condition expressions, an interpreter, data-dependent or unknown
loop bounds, nested repetition, concurrency, per-member labels, per-member animation, arbitrary
array visualisation, an animated-code subsystem, a second visual theme, deeper child modules, a
production SHA-256 implementation, and any claim that this film proves SHA-256 is secure.

The field is a **population**, not a data structure. It has a size and members that are alike.
It has no values, no indices the author can address, no per-member content, and no way to acquire
any — because the moment a member can carry its own content this stops being a quantifier and
becomes a table.
