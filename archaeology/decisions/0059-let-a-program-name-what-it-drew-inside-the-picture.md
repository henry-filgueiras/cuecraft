---
id: dec_01KZKZF5PN3C6V4NWBFGXBT19S
sequence: 59
kind: decision
status: accepted
created: 2026-08-09
---

# Let a program name what it drew, inside the picture

## Context

decision:57 asked whether narration could reach inside a computed picture, spiked SVG, and found
that base R's `svg()` device emits no `id` outside `<defs>`, no grouping per panel, and no `<text>`
— cairo outlines every glyph. The conclusion drawn was that **addressing a particular thing requires
the program to say where it is, whichever format carries the picture**, and regions exist because of
it. idea:24 parked SVG as something that would buy scale and style but explicitly *not* meaning.

That conclusion was right about the device and wrong about the program, and the difference is one
sentence: **a program knows which object it just drew.** cairo writes one `<path>` per drawing call
carrying the fill it was given, so a call made in a colour nobody else uses is findable in the
program's own output afterwards. Draw in a sentinel, find the sentinel, write a name onto the
element and put the real colour back. Three lines of `gsub`, base R, no package.

## Decision

**A program may name the things it drew, inside the artifact.**

    <path data-cuecraft="south-q4" fill="#e8833a" d="..."/>

`svg` is a second output type beside `png` in decision:56's protocol, and the identities are
**discovered** rather than declared on a second protocol line — which is the whole difference from a
region. cuecraft reads two things out of an SVG: how large it is, and which names it carries. It
does not know what shape a named element is, where it sits, or what it means, exactly as it does not
for a PNG. Only the *carrier* of the identity moved.

`data-cuecraft` rather than `id` for two reasons idea:24 had already flagged: cairo fills `<defs>`
with `id="glyph-0-0"` and refers to them with `<use xlink:href>`, and an inlined SVG's ids land in
the same document as the composition's own. A namespaced data attribute collides with nothing and
may legally appear on several elements at once, which matters because one semantic object is
frequently several paths.

**`shows:` stands, and the check against it becomes one-directional.** decision:57's ordering is
unchanged — anchors resolve at parse time, R runs afterwards — so the deck still declares what it
will reach. What changed is the reverse check. A `#cuecraft region` line is *hand-written per panel*,
so a region the deck never asked for means the two statements have drifted. A tag is *generated per
drawn object*: sixteen bars produce sixteen names and a deck that talks about four of them is a
deck, not a mismatch. So the half that stops a highlight landing on nothing is kept, and the half
that would force `shows:` to transcribe the picture is dropped.

**Emphasis inverts, because the format allows it to.** A raster can only be dimmed *around* the
subject (decision:58's veil). A drawing can be reached element by element, so what recedes is the
other named things and the subject is lifted — and the axes, gridlines and labels, which the program
never named, carry on untouched. That also removes the residue sprint:26 recorded: the emphasis
lands on the shape rather than on a rectangle around it.

**Ground state is never left, rather than restored.** The markup is inlined once and never modified;
emphasis is a stylesheet computed from the frame number and matching on the attribute. At zero
strength no rule is emitted at all, so the element is byte for byte what cairo wrote. There is no
saved original, no override to undo, and therefore no way for a restoration to be incomplete.

What cuecraft knows about a named element also forces the *vocabulary*: it has the name and nothing
else — not the fill, not the shape. So the treatment has to compose with an unknown original, which
means multiplicative terms that are the identity at zero (an opacity and a brightness) rather than
a replacement of a value it would have to read first. decision:55's boundary is what picks the
mechanism, which is a good sign the boundary is real.

## Consequences

- **idea:24's own boundary note is falsified in the useful direction.** It says SVG "buys scale and
  style, not meaning", on decision:57's evidence. It buys meaning too, and the thing that was missing
  was not a feature of the device but a technique on the program's side.
- **The overhead is measurable, and it was measured.** Both showcase programs were rewritten as the
  standalone R somebody would write to get the same file onto disk, and diffed against the shipped
  ones. The **table** program's entire delta is five lines: three that say where the input and output
  are (a substitution for a hardcoded path, not an addition) and one `cat()` declaring the output.
  All twenty-four lines of actual work — derive the quarter, derive the segment, `aggregate`,
  `reshape`, order, format, `write.csv` — are byte-identical. The **chart** program's delta is twenty
  lines, and seventeen of them are the tagging helper; the rest is receiving the palette instead of
  hardcoding it, and one `col = "#e8833a"` becoming `col = tag(...)`. So: **taking data back costs
  one line, and naming what you drew costs about twenty.** Nothing else about writing R changes.
- **`svg()` takes inches where `png()` takes pixels**, so a vector program converts once — `/ 96` for
  the box, `* 72 / 96` for the type size. The first version of the showcase used `/ 1.6` for the type,
  fitted by eye, and set every label seventeen percent small; the diff against standalone R is what
  made it obvious that one number was a conversion and the other was a guess. The supersampling
  factor `EXHIBIT.scale` cancels, because the box and the type size carry it equally.
- **The technique lives in the deck's R program**, not in cuecraft and not in a shared R library.
  Twelve lines that every deck wanting this would copy. That is deliberate — a cuecraft-supplied R
  helper is a plotting API with one function in it — and it is the first duplication this boundary
  has produced. See the dragon.
- **One rule is imposed on the program**: do not draw anything else in pure red. The program checks
  its own output and refuses rather than shipping a bar in the sentinel colour, because a leftover
  sentinel is a bright red bar on the film.
- **Inlining puts foreign markup in the render DOM.** It comes from a program the deck already runs,
  so it is not a new trust boundary, and the stylesheet is scoped to a wrapper class so identities
  inside one picture cannot reach the composition's own DOM.
- **dragon:31 got its convicting frame from this.** A two-line heading on the first showcase cut the
  chart to about three quarters of the room, visibly, and shortening the heading fixed it. The
  wobble is real; see the dragon.
