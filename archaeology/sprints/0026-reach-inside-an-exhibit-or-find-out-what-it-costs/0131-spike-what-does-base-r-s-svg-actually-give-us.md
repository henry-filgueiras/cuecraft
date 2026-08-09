---
id: tsk_01KZKRP50YW3CPQNMA9TKYQNZE
sequence: 131
kind: task
status: closed
sprint: spr_01KZKRNA3PE1ZD0S85JHH7EF5Y
created: 2026-08-09
closed: 2026-08-09
---

# Spike: what does base R's svg() actually give us

## Objective

Find out what base R's `svg()` device actually emits, and whether any of it can be reached.

## Acceptance criteria

- The shipped revenue chart drawn to SVG by base R, and the file read rather than assumed.
- Answered with evidence: what elements does cairo emit? Is there any grouping that corresponds to
  a panel, a bar, or an axis? Is anything labelled, and if not, is anything *positionally* stable
  enough to be addressed?
- Answered: does it render faithfully in the same headless Chromium Remotion uses — fonts, fills,
  clipping, text — or does it degrade?
- Answered: does it scale to an arbitrary box without redrawing, which is the property that would
  dissolve dragon:31.
- File size, against the 67 kB PNG.
- A written finding either way. "Cairo emits unlabelled paths" is a result, not a failure.

## Finding: SVG carries geometry without meaning — and that is not the same as being useless

The shipped chart was drawn to SVG by base R's `svg()` device and the file read.

### Nothing in it is addressable

A census of the 61 kB output:

    118  <path>          every mark, every gridline, every glyph outline
    112  <use>           glyph references into <defs>
    109  <g>             one per drawing operation, all of them clip-path wrappers
     40  <clipPath>
      1  <rect>          the background
      0  <text>          text is outlined into glyph paths

**There is not one `id` outside `<defs>`**, no grouping that corresponds to a panel, a bar or an
axis, and no `<text>` to read. Cairo emits a flat stream of clipped paths in draw order. Addressing
*a particular thing* is not possible from the file alone, so **SVG does not remove the need for the
program to declare where it drew things**. That is the finding that decides the sprint: the two
candidate mechanisms are not alternatives.

Positional addressing was considered and rejected on sight — "the 47th path" is an identity that
changes when a gridline is added.

### It renders faithfully, and it is stylable when inlined

Rendered in the same Chrome Headless Shell Remotion uses (146.0.7680.153). Fills, clipping, stroke
opacity and outlined text all correct; visually indistinguishable from the PNG at 1656x552.

**The interesting result is the second one.** Carried as `<img src>`, an SVG is in secure static mode
and nothing reaches inside it. **Inlined into the DOM, cuecraft's own stylesheet reaches every
element in it** — a one-line rule matching the accent fill turned all sixteen bars from `#D9A05B` to
`#FFE3B8`, from the parent document, with no ids involved:

    #exhibit path[fill*="85.098039%, 62.745098%"] { fill: #FFE3B8 }

That works because **the palette cuecraft handed R comes back as a selector cuecraft can use.**
decision:55 gave the program its colours for a compositional reason, and the consequence is that
"everything drawn in the accent" is addressable in the output without any protocol at all. It is
still a *category* rather than an *instance* — it cannot select one panel — but it is a real handle
and it was not designed for.

### It is resolution-independent, which is a different prize

`viewBox="0 0 3312 1104"` is present and the picture scales to any box without redrawing. That
dissolves most of dragon:31 — the reason the program is given a fixed pixel box is that a raster has
to be drawn for one — and it does so **independently of the addressing question**. The two concerns
are orthogonal, which is why SVG is being parked as its own idea rather than lost with this round's
decision.

Side effect worth recording: text-as-paths means an SVG exhibit has **no font dependency at all**,
which is the only thing in this repository that is immune to dragon:4.

### It costs

61 kB against the PNG's 67 kB — no meaningful size win, and a chart with thousands of marks would
invert it. Inlining is mandatory for any of the styling benefit, which means the composition must
read the file at render time rather than pointing `staticFile()` at it.
