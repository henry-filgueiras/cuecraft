---
id: ide_01KZKRZZT39Z64WEJ5AVMY4A6N
sequence: 24
kind: idea
status: adopted
created: 2026-08-09
---

# Carry an exhibit as SVG, for scale and style rather than for meaning

## Problem

An exhibit is drawn for a fixed pixel box that is chosen two stages before the room it lands in is
known (dragon:31), and the picture is a raster, so the only recourse is to letterbox. Base R's
`svg()` device produces a `viewBox` and scales to any box without redrawing — which dissolves the
dragon rather than managing it.

Two further properties fell out of the spike (task:131) and neither was the point:

- **Text-as-paths.** Cairo outlines every glyph, so an SVG exhibit has no font dependency at all —
  the only artifact in this repository immune to dragon:4.
- **It is stylable.** Inlined into the DOM, cuecraft's own stylesheet reaches every element in it. A
  one-line rule matching the accent fill recoloured all sixteen bars, with no ids and no protocol,
  because decision:55 handed R that colour in the first place.

## Sketch

A second output type beside `png` in decision:56's protocol, validated by parsing the root element
and reading its `viewBox` rather than by a signature. The composition inlines it — `staticFile()` and
`<Img>` put it in secure static mode, where none of the styling reaches — which means reading the
file at render time behind `delayRender`.

## Boundaries

**It does not replace regions.** decision:57's spike is unambiguous: cairo emits no ids, no grouping
and no `<text>`, so an SVG cannot say which panel is Asia Pacific. Addressing needs the program to
declare it whichever format carries the picture. This idea buys scale and style, not meaning.

What would make it a trap: treating "cuecraft can restyle the SVG" as a licence to build an
animation vocabulary that reaches into a picture element by element. Whatever cuecraft does to an
exhibit it does because narration reached a declared identity, and the author never names an
element, a selector or a style.

Also unresolved: inlining an arbitrary SVG puts foreign markup in the render DOM. It comes from a
program the deck already runs, so it is not a new trust boundary — but ids inside it can collide with
the composition's own, and that wants scoping before it ships.

## Outcome

**Adopted in sprint:28 (decision:59), and its own boundary note turned out to be wrong.**

The sketch shipped almost exactly as written: a second output type validated by parsing the root
element, inlined into the DOM rather than put through `staticFile()` — though by carrying the markup
in the timeline rather than reading it behind `delayRender`, since a specimen already carries a
whole quoted file that way and it keeps every still synchronous. The id-collision worry was real and
the answer was to not use ids at all: `data-cuecraft="..."` collides with neither cairo's `<defs>`
nor the composition's own DOM, and may appear on several elements at once, which one semantic object
frequently is.

**"It does not replace regions. This idea buys scale and style, not meaning."** That was written on
decision:57's evidence and it is false. The evidence was about the *device* — cairo emits no ids —
and the thing that was missing was a technique on the *program's* side: draw in a sentinel colour,
find it in your own output, write a name onto it. A program knows which object it just drew, and
nothing about the device prevents it from saying so afterwards.

What the idea got right is that it would be worth building "when a deck's exhibit is visibly
letterboxed in a room it did not expect" — which is also what happened, and is recorded on dragon:31.

## Evidence

Worth building when a deck's exhibit is visibly letterboxed in a room it did not expect, or when
dragon:4 bites a chart rather than a heading. The revenue deck is neither today: it is subtitled, it
fits exactly, and its labels are drawn by R rather than by the host's fonts.
