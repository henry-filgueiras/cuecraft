---
id: dec_01KZCADSVV4DRWAH2PSTE80APK
sequence: 17
kind: decision
status: accepted
created: 2026-08-06
---

# Give anchor activation a transient, not just an accumulation

## Context

decision:14 shipped semantic anchors with one activation treatment: colour and opacity rising
over ten frames, then staying. It works, and watching the WitnessGlass render while *listening*
rather than inspecting showed what is wrong with it. The change is monotone and slow. By the time
a viewer notices a row is brighter, the sentence that brightened it has finished. The mechanism
fires correctly and the causal link — *that sentence lit that row* — never arrives.

The failure is specific: there is no transient. A change that only accumulates is invisible while
it happens, because nothing about it says "now".

The obvious fixes are both wrong. Making the settle faster makes it a flicker and loses the
accumulated emphasis that lets a slide build. Making it larger makes a treatment that fires eight
times in eighty seconds into a tic by the third repetition.

## Decision

**An anchored element passes through three states, and only the middle one is loud.**

    future  ->  hot  ->  established

`src/render/anchor.ts` maps `(absoluteFrame, anchorFrame)` to three numbers, and nothing else:

- **degree** — 0 to 1 over ten frames, monotone, never given back. Drives what must persist:
  contrast, opacity, colour.
- **heat** — 0 to 1 to 0 across twenty-four frames, peaking three frames after activation. Drives
  what must not persist: the flare, the overshoot.
- **sweep** — a one-way wipe on its own clock, for marks that draw themselves across something.

Three numbers rather than one because the three do different jobs and must be able to disagree.
The case that forced the separation is the self-demo's best moment: narration reaches
`activates:` *inside* an already-established `say:` block, so `degree` is already 1 and only
`heat` can say that something happened.

**The archetypes decide what the envelope means.** `index` brightens its ordinal and wipes accent
along the row's divider. `matrix` doubles the weight of a term's rule and flares it. `cascade`
draws the accent along the stage's own rule. `specimen` tints a band of lines and lights a mark in
the gutter. One vocabulary, four dialects — not one treatment parameterised four ways.

**`matrix` now has a treatment.** decision:14 implemented only `index` and called the gap honest.
The self-demo's fourth scene strikes off four terms by name, and the gap stopped being honest.

**None of it is authorable.** No state name, duration, easing, colour or curve appears in the
source, and the source gained no key. This is renderer behaviour (decision:10).

## Consequences

- Activation is noticeable while listening naturally, which is the whole and only point. It is
  also still quiet enough to fire eight times without becoming a mannerism — the transient is
  eight tenths of a second and gone.
- The envelope is pure and unit-tested against frame numbers, so its shape and its invariants
  (heat never returns, degree never falls, everything stays in range) are checkable without a
  browser. Whether it is *perceptible* is not, and never will be; that stays a question for a
  human watching.
- `ANCHOR_TIMING` is five constants tuned against one deck at 30fps. They will be wrong for a
  deck whose cues are much shorter.
- This is one envelope consumed by existing style computations, and it must stay that. The moment
  archetypes want their own curves, cuecraft has an animation system it decided not to have.
