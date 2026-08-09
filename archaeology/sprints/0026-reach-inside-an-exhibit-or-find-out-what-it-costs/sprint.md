---
id: spr_01KZKRNA3PE1ZD0S85JHH7EF5Y
sequence: 26
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Reach inside an exhibit, or find out what it costs

## Goal

Find out whether narration can reach inside an exhibit, and by what mechanism — or establish that
it cannot be done at a price worth paying, and say so.

This round is an **evaluation**. Shipping is conditional on the finding. Discarding the
implementation is an acceptable outcome; discarding it without writing down why is not.

## Rationale

dragon:32 is the gap watching the film exposed: the narration says "Asia Pacific doubles across the
year" and nothing lights up, because cuecraft has never looked inside the picture. Every other
composition in the deck answers a sentence with a visual state. The one that most obviously wants to
is the one that cannot.

Two mechanisms are candidates and they are not variations of each other.

**Regions over the protocol.** The program declares where it drew things, in fractions of the image,
alongside the picture. Proven to be expressible in base R already — `grconvertX/grconvertY` reports
the four panels of the shipped chart to four decimal places, with no package. cuecraft never reads a
pixel; it draws its own activation treatment over a rectangle somebody else computed.

**SVG instead of PNG.** The metadata travels *inside* the artifact instead of beside it. If base R's
`svg()` device emits anything addressable, cuecraft could reach elements directly, and three things
follow that regions do not give: the picture becomes resolution-independent, which dissolves most of
dragon:31; the artifact becomes editable at render time, so emphasis could be a style rather than an
overlay; and animation stops being a thing cuecraft draws *over* the picture and becomes a thing the
picture does.

The second is more powerful and much less certain. Nobody here knows what cairo's SVG backend
actually emits, whether Chromium renders it faithfully inside Remotion, or whether anything in it can
be addressed without a package. **That is the first thing to find out, because it decides the
design**, and finding it out is cheap.

The order matters: spike before choosing, choose before building, judge on the film.

## Success criteria

- A recorded, evidence-backed answer to "what does base R's `svg()` actually give us" — the emitted
  structure, whether anything is addressable, and whether it survives Remotion's Chromium.
- A recorded answer to the honest unknown in the regions design: where an overlay actually lands,
  given that the picture is `contain`ed in a room whose size was not known when it was drawn.
- A decision artifact naming the mechanism chosen and, explicitly, what the losing one would have
  bought. A round that picks the cheaper option without writing down what it gave up has not
  evaluated anything.
- If a mechanism ships: `activates:` reaches something inside the revenue deck's chart, at a moment
  derived from measured audio, drawn in cuecraft's existing activation vocabulary and not in a new
  one. Judged on the rendered film, not on a still and not on a passing test.
- If nothing ships: dragon:32 is updated with what was tried and what it cost, and the working tree
  is left exactly as sprint:25 left it.
- `npm run check` and `scarp doctor` pass either way. Every shipped example still renders identically
  unless a decision says otherwise.

## Non-goals

- **No animation system.** If SVG wins, the round stops at "narration reaches a thing and it
  responds". Motion vocabulary beyond what `anchor.ts` already derives is a separate question and
  probably a separate decision.
- **No SVG editing DSL, and no author reaching SVG.** Whatever cuecraft does to an SVG it does
  because narration reached an identity. There is no key that names an element, a selector, a style
  or a coordinate.
- **No chart library.** cuecraft does not learn what a bar is. If a design requires it to, that
  design is refused and the refusal is the finding.
- **No new emphasis vocabulary.** Existing activation treatment, existing timing, existing palette.
  A region that lights up differently from a bullet is a bug.
- **No packages** unless the spike shows base R cannot answer the question at all — and then the
  package is a decision with the measurement attached, not a convenience.
- **No relaxation of the exhibit boundary.** Still no `image:` key, still one output per slide, still
  no caching, still no path to a checked-in asset.
- **Not a refactor of sprint:25.** If the answer is "regions", the PNG path is unchanged. If the
  answer is "SVG", that is a second output type beside PNG, not a replacement of it, unless a
  decision says otherwise.

## Outcome

**Narration reaches inside an exhibit, and the mechanism chose itself.** The revenue film now
answers "Asia Pacific doubles across the year" by dimming the rest of the chart for eight tenths of
a second and leaving a quiet mark on that panel — from `activates: asia-pacific` and no coordinate.
Shipped, and judged on the film rather than on a still.

### The spike was the round

The sprint was framed as a question because the answer was not known, and the evidence changed what
got built. **Base R's `svg()` emits no `id` outside `<defs>`, no grouping per panel and no `<text>`
— text is outlined into glyph paths.** So SVG cannot say which panel is Asia Pacific either. The two
candidates were never alternatives: **addressing needs the program to declare where it drew things,
whichever format carries the picture.**

That collapsed the decision and freed SVG to be a different question. It is parked as idea:24 with
the three things it *would* buy attached — resolution independence (most of dragon:31), immunity to
dragon:4 via text-as-paths, and an animation surface — so the next round that wants any of them does
not rediscover that the fourth was never on offer.

**And the geometry cost nothing.** The honest unknown — where an overlay lands when the picture is
contained in a room whose size was not known when it was drawn — has a one-line answer: a wrapper
carrying the picture's `aspect-ratio` with both maxima *is* the letterboxed image box, so a region
is a percentage inside it. No arithmetic, no DOM measurement, verified at three room aspects.

### What shipped

    #cuecraft region asia-pacific 0.5430 0.1377 0.7543 0.8192

One more protocol line, and `shows:` on the slide. `shows:` is forced by an ordering rather than
chosen: `activates:` resolves at parse time and R runs afterwards. It is not a second copy of
something cuecraft could know — cuecraft cannot know it yet — and materialization refuses a mismatch
in **both** directions, so the two statements cannot drift. A deck naming an unshown identity fails
at parse; a program drawing different names fails at materialize, with both lists printed.

Emphasis is **heat veils, degree marks** — decision:23 with the nouns changed, through the only
mechanism a raster allows. Nothing new was invented: same envelope, same palette, same clock.

### Against the success criteria

Met: both spikes answered with evidence and written up; decision:57 names the mechanism and states
explicitly what SVG would have bought; `activates:` reaches inside the chart at a moment derived from
measured audio in the existing vocabulary; judged on the rendered film. `npm run check` 744,
`npm run test:r` 11, `scarp doctor` clean. dragon:32 closed by decision:57.

Not met, and deliberately: **every shipped example still renders identically except the one that
asked to change.** The revenue deck gained two anchors and a line of narration, which is the round's
whole point; nothing else moved.

### What the artifact corrected

**The veil escaped the picture.** A 9999px `box-shadow` spread is how a region becomes a hole in a
dimming layer, and unclipped it dimmed the heading while the subtitle band stayed bright, because
the band is composited elsewhere. Half the chrome reacting to an exhibit's internals is a treatment
nobody designed. Clipped to the picture.

**`inset` silently overrode the rectangle it was describing.** The mark used a `border` plus `inset`
for standoff; `inset` is shorthand for the same four properties the region's position uses. An
`outline` with `outlineOffset` does not participate in layout at all, which is what a mark that must
not move its subject by a pixel actually needs.

**An unanchored region had to draw nothing.** `anchorStatesFor` reports `ESTABLISHED` for an element
nobody reaches — right for a bullet that should be legible, wrong here, where it would box every
region of every exhibit whose deck declares `shows:` without talking about any of it.

### The residue, stated rather than implied

**The rectangle is the shape of the thing here, and will not always be.** A small-multiples panel
really is a rectangle, so framing one frames the subject exactly — which is most of why this reads
as the deck's language rather than as an annotation. On a scatter cloud, a region of a map, or one
line among five, the same treatment would frame a box of mostly empty space. Nothing in this round
convicts it, because the demo's chart is made of rectangles.

And narration still reaches only what the program was **willing to name**. It cannot reach the third
bar unless the program declares the third bar, and it can never reach something the program did not
think of. That is in decision:57 rather than left to be discovered.
