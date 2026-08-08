---
id: dec_01KZHTVPFQ43296K26YHCKP26E
sequence: 42
kind: decision
status: accepted
created: 2026-08-08
---

# Let a composition be laid out inside the box it was given

## Context

decision:40 takes a strip out of the bottom of a composition so that nothing is ever laid out
underneath the narration, and sprint:13 made that strip unconditional. Two adversarial decks —
`examples/meridian-bickering.yaml` and `examples/orpheus-failover.yaml` — then produced frames where
slide content and narration were drawn in the same pixels: a row ordinal and a speaker label
overprinted into an unreadable mash, a list's closing hairline running through a sentence, a world
node printing "traffic" on top of "that now".

The measurement, on `witnessglass`'s `index` slide:

    subtitles off   closing hairline y=971   content box ends 972   correct
    subtitles on    closing hairline y=879   content box ends 734   overflows by 145

So the padding was honoured and the *box* was not. `IndexList` and `Cascade` laid their rows out at
a fixed `TYPE.row` / `TYPE.stage` with fixed `SPACE.lg` padding inside a `flex: 1` container whose
`min-height` resolves to `auto` — which refuses to shrink below its intrinsic height. The stack kept
its natural size and ran past `Frame`'s bottom padding, and what is under that padding is the
narration.

None of this was new. Every other stacked archetype already asks `bodyBox` how much room it has;
these two were written before the box could ever be smaller than the frame, and never learned. What
changed is that the room under them stopped being empty. The trigger is a **wrapped title over
full-width stacked rows** — `lead` has two-line titles in both decks and is comfortable, because it
puts its title in a column beside the rows rather than above them.

Three further defects fell out of looking at the arithmetic rather than at the frames:

- **The bottom of the frame was paid for twice.** `Frame` padded `marginY + band` and `bodyBox`
  subtracted the same, so a subtitled composition gave up 108px of margin *underneath* a band that
  already ends in `SUBTITLE.gap` — 148px of air where 40 was designed.
- **`HEADING_CHAR_WIDTH` was a guess that rounded the wrong way.** At 0.5, a 29-character title at
  104px came out one character over the measure, so `headingLines` reported two lines for a title
  that renders on one and `bodyBox` handed the composition beneath it 110px less than it had.
  Measured, "WitnessGlass records the work" is 1475px wide: 0.489.
- **`atlas` was worse than dragon:21 assumed.** dragon:21 accepted an overlay and asked for a shot
  where the subtitle covers what is being explained. `orpheus` produces one, and the failure mode is
  not occlusion but mutual destruction: `HALO` is tuned for text over a field, and a world node is a
  filled plate with its own glow, so neither text wins.

## Decision

**A stacked composition derives its type and its spacing from the box it was given.** `fitIndex` and
`fitCascade` join `fitSpecimen`, `fitQuote`, `fitFormula` and `fitTerm` in `theme.ts` — same shape,
same readable floor, same estimate of a wrapped line. Both spend *air* before they spend *type*: a
row loses padding more gracefully than it loses size, and a staircase's descent is carried by the
indent and the rules rather than by the space around them.

**The containers cannot overflow downward even if a fitter is wrong.** `minHeight: 0` on both, so a
box too small for its content squeezes into the whitespace under the title instead of descending
through the narration. The fitters are what stop it coming to that; this is what stops it being a
collision when it does.

**`frameBottom(band)` is the margin or the band, whichever is larger — never both.** In practice
that is the band whenever there is one, and it gives every subtitled composition 108px back.

**`HEADING_CHAR_WIDTH` is 0.49, from a measurement rather than a guess.** Two of the 55 titles in
`examples/` change line count and both are corrections; no specimen, formula or figure moves.

**The two bleeding compositions frame into `1920 x (1080 - band)`.** The camera is told about a
smaller *viewport* and nothing else: same events, same span, same shots, in the same order, at the
same frames. dragon:21 estimated this as a change with a large blast radius, and it is not — `band`
is zero for every deck that did not ask for subtitles, so `tap`, `order`, `cathedral` and
`observatory` render byte-identical. The transcript takes the same treatment despite never having
been caught failing, because "usually field" is what dragon:21 said about the atlas too.

## Consequences

- **Both adversarial decks are clean end to end**, and their timelines are untouched: 302.357333s
  and 308.416000s before and after, to the frame.
- **`witnessglass` without subtitles renders byte-identical**, which is the acceptance artifact
  decision:7 keeps for exactly this.
- **A slide can still be over-full**, and the answer is the floor rather than an invention. A deck
  whose title wraps over four rows with a subtitle band gets 46px rows at 8px of air, which is tight
  and legible and honest. Deriving a continuation slide was refused: the renderer inventing a scene
  changes the number of scenes, and decision:9 forbids anything downstream of compilation touching
  derived timing.
- **The estimate is still an estimate.** `bodyBox` is deliberately conservative by 24px for `index`
  — `IndexList` spends `SPACE.lg` on the gap under its heading where `bodyBox` models `SPACE.xl` —
  and that direction is the safe one. A fitter that under-reports its room gives a slide slightly
  more air than it asked for; one that over-reports prints on the narration.
- **The camera is one shot higher on a subtitled world.** dragon:14's title-grazing is the same in
  kind before and after in the frames checked, but a world centred in a shorter box sits closer to
  the title by construction, and that dragon now has one more source of pressure.
- **dragon:21 is resolved.** The band is no longer something the camera is ignorant of.
