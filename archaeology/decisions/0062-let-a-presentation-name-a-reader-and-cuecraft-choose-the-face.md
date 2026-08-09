---
id: dec_01KZM8MV36HQ5QD2Y22JY62EFE
sequence: 62
kind: decision
status: accepted
created: 2026-08-09
---

# Let a presentation name a reader, and cuecraft choose the face

## Context

decision:2 allows one built-in look and no theming system; decision:10 keeps sizes, positions and
colours out of the author's hands. Between them, a cuecraft source cannot say anything at all about
what the film looks like — which is the whole thesis and is not in question.

But there is a claim a source might reasonably want to make that is not an aesthetic preference:
*the people watching this include readers who find ordinary text hard to hold.* That is a statement
about an audience, not about a typeface, and refusing it on the grounds that decision:2 refuses
theming would be answering a question nobody asked.

dragon:4 has been open since sprint:2 for a neighbouring reason: the deck's faces are a system
stack, so the same YAML renders differently on two machines. Its candidate direction is to bundle a
face and load it through the composition's own webpack, and sprint:7 proved that affordable while
bundling KaTeX (decision:32) — including the part that would otherwise have been found the hard
way, that a bundled face needs a `delayRender` gate or the renderer photographs the fallback.

## Decision

A presentation may carry exactly one accessibility key, at its root:

```yaml
accessibility:
  dyslexia: true
```

It selects an internal **typography profile** from a closed set of two. `default` is the system
stack this repository has always used. `hyperlegible` is Atkinson Hyperlegible Next for every
proportional face and Atkinson Hyperlegible Mono everywhere cuecraft already means monospace, both
bundled and pinned.

Four things make this a constraint rather than a knob:

- **The set is closed and internal.** A source names neither a family, a size, a weight, a colour
  nor a line height, and cannot reach the profile except through this boolean. The compiled model
  carries the profile's *identity*, never a font name, so a later round that changed which face
  serves this constraint would not change a byte of any compiled artifact.
- **It is at the root, and refused anywhere else.** Not under `defaults:`, whose every other entry
  has a per-slide counterpart; not on a slide; not in a child module. A film that changed face
  partway through would be worse for a struggling reader than either face alone.
- **It changes glyph design and nothing else.** Same sizes, weights, tracking, leading, colours,
  timings, camera and layout selection. The comparison of the two films is a comparison of one
  variable, which is what makes it judgeable at all.
- **Mathematics is exempt.** A `formula` sets in KaTeX's faces in both profiles. There the glyphs
  *are* the notation — an italic `x` is a variable and an upright one is not — so substituting a
  face designed for running text would change what a definition says.

A profile is **a pair of families and five advance-width estimates, never one without the other**,
and it is resolved in `buildTimeline` and carried on the `Timeline`. That placement is the whole of
the ordering argument and the whole of the isolation argument: every fitter in `theme.ts` already
has the profile on first render, so the arithmetic and the pixels are never set in different faces;
and there is no mutable "current profile", so a batch, a nested world or a recall cannot see
another render's.

## Consequences

**The metrics had to be measured, and measuring them overturned the premise.** The round opened
expecting all five to be wider — a face that draws `I` unmistakably apart from `l` must be spending
width on it. Four of the five came back *narrower*: heading 0.490 → 0.480, body 0.520 → 0.510,
plate 0.550 → 0.530, event 0.530 → 0.520. Atkinson Hyperlegible Next buys its differentiation from
shape rather than from advance. The **monospace** is the one that pays, by five percent, 0.602 →
0.633, and it pays there because a monospace face has one advance for every glyph. Copying the
defaults across would therefore have been *optimistic* on exactly the class where optimism runs a
specimen off the edge of the frame. `scripts/calibrate-widths.ts` re-derives all five, and each sits
at the same quantile of its own distribution as the shipped default sits in the default face's — so
the profile inherits cuecraft's risk posture rather than somebody choosing one.

**Provisioning is `npm ci`, not a downloader.** decision:8 wrote one for the Kokoro weights because
Hugging Face is not a package registry. Fonts are not that shape of problem: npm pins the version
exactly, verifies each tarball against a SHA-512 before unpacking, stages extraction so an
interrupted install cannot leave a half-written package, and keys the cache on the version.
`fonts.lock.json` adds the part a tarball hash cannot answer afterwards — the eight files cuecraft
actually draws with, by name, size and SHA-256 — and `npm run bootstrap:fonts` checks it.

**A deck that asks and cannot have it fails, rather than falling back.** Silently rendering in a
system stack would produce a film that looks fine and helps nobody, failing somebody who is not the
person reading the error. The check runs before bundling and costs a default render nothing.

**This does not close dragon:4.** The default profile is still a system stack and still
host-dependent. What this round did was build the mechanism dragon:4 will need and prove it against
a second, genuinely different face — a profile abstraction with one profile in it is a guess, and
with two it is tested. Whether the deck's *own* sans is worth bundling is a separate decision about
what cuecraft should look like, and it should not be made while wearing an accessibility hat.

**It exposed a latent defect that had been invisible for twenty-eight sprints.** A `<code>` element
carries `font-family: monospace` in the browser's user-agent stylesheet, and a UA rule on an element
beats an inherited value from its parent — so the mono stack every specimen composition sets has
never reached the text inside it. Every specimen cuecraft has rendered was set in whatever Chrome's
*generic* `monospace` resolves to, which on the development machine is Menlo, which is the first
entry of the stack it was ignoring. Two coincidences stacked. It became visible the instant a second
profile named a different monospace face and the heading changed while the code did not.

**It also found dragon:36**, a `lead` list laid out into the room the subtitle band reserved —
pre-existing, identical in both profiles, and deliberately not fixed here.
