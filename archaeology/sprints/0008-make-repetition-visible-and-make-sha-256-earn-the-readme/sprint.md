---
id: spr_01KZES9SFB63FP2G1CRH4NTKEN
sequence: 8
kind: sprint
status: closed
created: 2026-08-07
closed: 2026-08-07
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

## Outcome

Every success criterion was met except the duration, which came in at 2:49.4 against a 2:30–2:45
target and inside the three-minute ceiling. The evidence for the four seconds is in the film: both
fill windows have to be long enough to watch, and the six-line definition of `T1` and `T2` needs
its four sentences. Everything cheaper than that was already cut — the first rebuild ran 3:47 and
lost 58 seconds without losing a single fact.

### Does it teach better? Yes, and the reason is narrower than "there is a picture now"

The baseline said *"sixty-four of them, stacked"* over a frame showing one round. A viewer could
believe it or not; nothing on screen bore on the question. The rebuild shows sixty-four discrete
pieces of work arriving at a rate a human can watch, with a count that reaches 64 while the
sentence is still being spoken.

What makes that *teaching* rather than decoration is the adjacency. The camera comes out of `One
round` — having just been shown `T1`, `T2`, and the two values a round injects — and the plate
immediately to its right opens into the field. The viewer is not shown "sixty-four things"; they
are shown *the thing they just understood*, sixty-four times, without leaving the world that
contains both. The message schedule does the same one scale up: sixteen words present, forty-eight
arriving, and the sentence "forty-eight times over" is now a caption on something rather than a
claim about nothing.

The honest limit: the field shows **that** it repeats, not **why repeating helps**. Diffusion is
still carried by one sentence at the end. A viewer finishes this film able to answer all seven
questions of the learning contract, and takes the security argument on the same trust they always
did — which is correct, because an animation is not a proof, and the narration now says so instead
of implying otherwise.

### What the design phase did not predict

- **The bug that mattered was not in the new code.** `Interior` reindexed anchors into a chamber's
  local element list and did not reindex spans. A population inside a chamber therefore looked up
  nothing, fell through to the unanchored default — *established* — and drew a field that was
  complete on its first frame and never moved. It rendered beautifully and taught the opposite of
  the truth. Every test passed. Watching caught it in one frame.
- **Two derived clocks now have to agree and nothing makes them.** A derived portal takes about
  three and a half seconds to open; a fill runs across a measured sentence. If the sentence that
  opens the chamber is shorter than the expansion, the field fills behind a boundary that is still
  growing. Fixed in the artifact by lengthening one sentence; recorded as dragon:15, because the
  author had to satisfy a constraint nothing told them about.
- **The verification test found a factual gap the audit did not.** `src/examples.test.ts` reads the
  rotation amounts out of the deck's own TeX and runs SHA-256 with them. On its first run it failed
  with *"the deck never defines Σ0"* — the film named the big sigmas in `T1` and `T2` and never
  defined them, so a viewer had no way to tell them from the schedule's small ones. That is
  precisely the class of defect a human audit reads straight past.
- **A six-line formula does not fit.** `Formula` sized by width alone, and KaTeX's `.katex-display`
  margin compounds with the leading this composition supplies, so the definition set two and a half
  times taller than the fit predicted with four lines off the bottom of the frame. Fitted by height
  as well now, with KaTeX's margin zeroed.

### The factual audit, against FIPS 180-4

Removed or weakened: *"no way at all to walk backwards"*; *"impossible to walk back"*;
*"sixty-four of them, stacked, is what makes it impossible to walk back"* (attributed one-wayness
to round count alone); and a Git opening that implied ordinary repositories name objects with
SHA-256.

Added because it was missing and wrong by omission: `T1` and `T2` with their full definitions; the
schedule word and round constant entering each round; **`e ← d + T1`**, the second injection, which
the baseline omitted entirely while saying "everything shifts down"; the two big sigmas, defined
and distinguished from the schedule's two small ones; and feed-forward as a step in the world with
its own formula rather than a clause in a sentence.

### Promotion

`series` should be promoted from experiment to supported role on the same terms `formula` was: it
is small, closed, reuses the whole existing seam, and its failure mode is a compile error. What
must **not** be promoted is any of the vocabulary next to it — this is a quantifier and the
pressure to make it a loop will be constant.

decision:30's pause is narrowed, not lifted. The seam opened is the one the artifact broke on; none
of idea:16's parked vocabulary was built alongside it.

### Left undone

The one-bit avalanche comparison was auditioned and not built. `change` needs two source states in
a language cuecraft can highlight, and two hex digests are neither; a `formula` of two 64-character
strings would set at about 20px. It is recorded here rather than as an idea because the thing it
would demonstrate — diffusion — is one sentence of narration away from being said accurately, and
the film says it.
