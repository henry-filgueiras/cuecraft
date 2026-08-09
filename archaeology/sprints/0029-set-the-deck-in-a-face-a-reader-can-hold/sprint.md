---
id: spr_01KZM5EXSYFDBB87YWSEQSC0V0
sequence: 29
kind: sprint
status: active
created: 2026-08-09
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
