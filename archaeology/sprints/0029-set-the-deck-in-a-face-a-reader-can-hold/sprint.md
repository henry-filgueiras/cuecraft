---
id: spr_01KZM5EXSYFDBB87YWSEQSC0V0
sequence: 29
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Set the deck in a face a reader can hold

## Goal

Let a presentation ask, at its root and in one boolean, to be set in a typeface designed for
readers who find ordinary text hard to hold:

```yaml
accessibility:
  dyslexia: true
```

When it does, the whole film — prose, headings, labels, and every place cuecraft already means
monospace — is set in Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono, at the same
sizes, the same colours, the same leading and the same timings as before. Nothing else changes.
When it does not, the film is byte-for-byte the film it is today.

Underneath that boolean, build the thing the boolean needs and cuecraft does not have: a
**typography profile** chosen before anything is laid out, carrying the two families and the
advance-width estimates every fitter in `theme.ts` works from.

## Rationale

dragon:4 has been open since sprint:2 and says the deck's typography is whatever the host machine
happens to have installed. Its candidate direction is to bundle a face and load it through the
composition's own webpack, and sprint:7 already proved that affordable and discovered the part that
would otherwise have been found the hard way — a bundled face needs a `delayRender` gate or the
renderer photographs the fallback (`./mathfonts.tsx`).

This round does not close dragon:4, and saying why is the point. It bundles two faces and pins
them, but only the *opt-in* profile uses them; the default profile is still a system stack, still
host-dependent, still exactly what it was. What it does do is build the mechanism dragon:4 will
need — a profile resolved before layout, with its own metrics — and prove it against a second,
genuinely different face. A profile abstraction with one profile in it is a guess. With two it is
tested.

The accessibility framing is what keeps this from being the theming system decision:2 rules out.
There is no `font:` key, no size, no weight, no colour, no per-slide override, and no way for an
author to name a family. There is one boolean, it means one thing, and the set of profiles it can
select is closed and internal. An author cannot express a preference about typography; they can
express a **constraint about a reader**, and cuecraft decides what that looks like — which is
decision:10's rule, not an exception to it.

The metrics are the part that cannot be hand-waved. Every fitter in `theme.ts` divides a character
count by an average advance width, and those five numbers were measured against Helvetica Neue.
Atkinson Hyperlegible is a wider face by design — the glyph differentiation that makes it legible
costs width — so copying the constants across would produce a film that clips its headings and
overruns its plates. They have to be measured against the real WOFF2 in the real rendering
environment, and the measurement has to be repeatable rather than a number somebody once wrote down.

## Success criteria

- `accessibility: dyslexia: true` at the presentation root resolves to an internal `hyperlegible`
  profile. Omitted and `false` are indistinguishable from each other and from today.
- The profile is resolved in `buildTimeline` and carried on the `Timeline`, so it is settled before
  any layout runs and travels with the render rather than beside it. No mutable process global.
- Nested worlds, recalled slides and embedded modules use the root's profile and acquire no
  configuration surface of their own. `accessibility:` on a slide or in a module is *rejected*.
- Both families are provisioned from pinned, checksummed, offline-after-install artifacts, with
  `npm run bootstrap:fonts` as the documented idempotent command.
- The faces are loaded and ready before any frame is captured, through the same gate `mathfonts.tsx`
  established.
- The hyperlegible profile's five advance-width estimates are **measured**, by a script that can be
  re-run, against a corpus of real cuecraft strings.
- KaTeX is untouched.
- Every default render is unchanged. Not "close enough" — unchanged.
- `examples/cuecraft.yaml`, `examples/deploy.yaml` and `examples/leases-narrated.yaml` render in
  both profiles and are inspected across frames, not only the first.

## Non-goals

- **Closing dragon:4.** The default profile stays a system stack. Bundling the deck's *own* sans is
  a separate decision about what the deck should look like, and this round deliberately does not
  make it while wearing an accessibility hat.
- **A `font:` key, a theme, or any per-slide typography.** decision:2's boundary is the whole reason
  the public surface is one boolean. If this round produces a second knob it has failed.
- **Changing sizes, weights, leading, tracking or colour under the profile.** The round isolates the
  effect of glyph design. Anything else and the A/B tells us nothing.
- **A text-layout engine.** The estimates stay estimates. Measuring them properly is in scope;
  replacing them with real shaping is not (and would break composition resolving without a browser,
  which every fitter in `theme.ts` depends on).
- **A render manifest or provenance subsystem.** The resolved profile goes wherever cuecraft already
  reports what it did, and nowhere new.

## Outcome

**Every success criterion met, and the round's central assumption was wrong.**
`accessibility: dyslexia: true` selects a `hyperlegible` profile resolved in `buildTimeline` and
carried on the `Timeline`; the default is unchanged, proven rather than asserted; decision:62
records the shape and dragon:36 records what the round found on its way.

### The face is narrower, not wider

The sprint opened expecting all five advance-width estimates to grow, on the reasoning that a face
which draws `I` unmistakably apart from `l` must be spending width to do it. Measured over 1353
samples from all 28 decks in `examples/`, in Remotion's own Chrome, against the exact pinned WOFF2:

    heading  0.490 -> 0.480      body   0.520 -> 0.510
    plate    0.550 -> 0.530      event  0.530 -> 0.520
    mono     0.602 -> 0.633

Four of five *narrower*. Atkinson Hyperlegible Next buys its differentiation from glyph shape — a
tailed `l`, a slashed zero, an angled `1`, terminals cut at distinct angles — rather than from
advance. The **monospace** is the one that pays, and it pays there because a monospace face has one
advance for every glyph: every distinction it wants has to fit a cell the widest letter sets.

That is the whole justification for the calibration having been in scope. Copying the defaults
across would have been optimistic by five percent on exactly the class where optimism runs a
specimen off the right edge of the frame — in the profile a reader asked for because they were
struggling. `scripts/calibrate-widths.ts` re-derives all five and `src/render/calibration.json`
plus a unit test keep a font upgrade from moving them silently.

### The `<code>` element had been overriding the deck's monospace stack since sprint:2

The largest finding, and it is not about accessibility at all. `<code>` carries
`font-family: monospace` in the browser's user-agent stylesheet, and a UA rule on an element beats
an inherited value from its parent — so the mono stack `Specimen` and `Revision` set on the block
around the code has never reached the code. Every specimen cuecraft has rendered was set in
whatever Chrome's *generic* `monospace` resolves to, which on this machine is Menlo, which is the
first entry of the stack it was ignoring. Two coincidences stacked, and they hid it for
twenty-eight sprints.

It became visible in one frame: the first hyperlegible render of `examples/cuecraft.yaml`, where
the heading changed face and the code did not. Fixed with `font-family: inherit`, and the default
stills stayed byte-identical — which is itself the proof that the two coincidences were real.

### What "unchanged" means here

The pre-sprint tree was extracted at `e8b75ab` and fed the *same* dumped `CompiledPresentation`, so
specimen text and narration were held constant and only the renderer varied. 24 stills — three
decks, eight frames each, across the whole film rather than the opening — byte-identical. The same
24 under the hyperlegible profile all differ, with no clipping, no truncation, no overflowing
plate, no shifted diagram geometry and no camera framing regression.

One consequence is worth stating rather than hiding: a specimen line that fitted at the default
mono advance can wrap under the wider one, and it wraps with decision:21's `↳` rather than
clipping. That is the mechanism working.

### What was refused

No `font:`, no theme, no per-slide override, no second knob, and no closing of dragon:4 — the
default profile is still a system stack and still host-dependent. What this round built is the
mechanism dragon:4 will need, tested against a second genuinely different face rather than against
itself. Whether the deck's *own* sans is worth bundling stays a separate decision about what
cuecraft should look like, and it should not be made while wearing an accessibility hat.
