---
id: tsk_01KZKRP51N8ANEVDR8M7HAHTKK
sequence: 134
kind: task
status: closed
sprint: spr_01KZKRNA3PE1ZD0S85JHH7EF5Y
created: 2026-08-09
closed: 2026-08-09
---

# Let narration reach inside the chart

## Objective

Make `activates:` reach something inside the revenue chart, using the chosen mechanism and nothing
new.

## Acceptance criteria

- The existing activation treatment, the existing timing, the existing palette. A thing inside a
  picture lights up the way a bullet does.
- An exhibit that declares nothing behaves exactly as it does today — the shipped film is unchanged
  unless the deck asks for something.
- Malformed and unresolvable identities are refused with the same loudness as every other anchor.
- Unit-testable without R; the R half covered by the live tests.
- `npm run check` and `scarp doctor` pass.

## Done, and nothing new was invented to do it

`activates: asia-pacific` on the revenue deck's exhibit slide dims the rest of the chart for the
moment the sentence lands and leaves a quiet mark on the panel afterwards. The envelope is
`anchorState`, unchanged; the colours are `COLORS.accent` and `COLORS.flare`, unchanged; the frame
it happens on is derived from measured audio exactly as a bullet's is.

**heat veils, degree marks** — decision:23 with the nouns changed. A veil driven by `degree` would
persist, and a slide ending with three quarters of its chart in shadow has declared three quarters
of its chart irrelevant.

About 210 lines: `RRegion` and `resolveRegions` in the runner, `shows:` and `ExhibitRegion` in the
body, a both-directions match in materialization, and a `Regions` component.

### Two things the first render got wrong, both caught by looking

**The veil escaped the picture.** `box-shadow: 0 0 0 9999px` is how a region becomes a hole in a
dimming layer, and unclipped it reached the whole frame: the heading went grey while the subtitle
band stayed bright, because the band is composited elsewhere. Half the chrome responding to an
exhibit's internals is a treatment nobody designed. `overflow: hidden` on the wrapper, and what dims
is the picture.

**`inset` and `left/top/width/height` are the same property.** The first mark used a `border` plus
`inset` for standoff, which silently overrode the rectangle it was supposed to be describing. An
`outline` with `outlineOffset` does not participate in layout at all, which is the right tool: this
must not move the region by a pixel.

### An unanchored region draws nothing at all

`anchorStatesFor` reports `ESTABLISHED` for an element nobody reaches — right for a bullet that
should simply be legible, wrong here, where it would put a permanent box around every region of
every exhibit whose deck happens to declare `shows:` without talking about any of it. The marks are
filtered against `scene.anchors`, so a deck that declares four regions and reaches two draws two.

### Both halves of the bargain refuse, and they refuse in different places

Driven through the CLI. A deck naming an identity the slide does not show fails at **parse**, from
the ordinary anchor resolution, with the declared list printed. A program drawing different names
fails at **materialize**, naming both directions:

    the slide shows "north-america", "asia-pacific", "latin-america", which the program did not draw;
    the program drew "north_america", "asia_pacific", "latin_america", which the slide does not show

30 new tests. `npm run check` 744, `npm run test:r` 11, `scarp doctor` clean.
