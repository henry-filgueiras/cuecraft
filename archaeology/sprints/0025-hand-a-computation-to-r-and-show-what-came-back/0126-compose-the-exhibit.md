---
id: tsk_01KZKNG291MHK8BFZDEXRDQ5NK
sequence: 126
kind: task
status: closed
sprint: spr_01KZKNE2VBP4FK8GVSTT50E27Z
created: 2026-08-09
closed: 2026-08-09
---

# Compose the exhibit

## Objective

The composition: a computed image as the slide's whole visual, under its heading.

## Acceptance criteria

- Aspect preserved, contained, centred in the room below the heading.
- Legible at 1920x1080; the plot does not read as a screenshot pasted onto the frame.
- Respects the subtitle band like every other bounded composition.
- No new authored key reaches any of it.

## Done, and it is the shortest composition in the file

Thirty lines in `layouts.tsx`: heading, then the picture contained and centred in whatever room is
left. That shortness is the content of it — every other archetype is an argument about what gets the
scale and what recedes, and none of those questions can be asked about a picture cuecraft has never
looked inside.

Remotion's `Img` rather than a bare `img`, so the frame is held open until the PNG has decoded. A
bare tag renders an intermittently empty rectangle in a headless still.

**The first cut was measurably wrong and the frame caught it.** It sized the image at `EXHIBIT`'s
pixels with `maxWidth`/`maxHeight`, and the rendered chart came out at about seventy percent of the
room — because the deck has subtitles, the band eats the bottom of the frame, and the box the
program had been given was measured without one. Fixed in two places: the image now fills the room
it actually has and contains within it, and `EXHIBIT` is measured against the *subtitled* case so
the smaller of the two rooms is the one the program draws for. What is left of the mismatch is
dragon:31.

The gap under the heading is `SPACE.xl`, matching what `bodyBox` subtracts, so the room this gets is
the room `EXHIBIT` was measured against rather than a second nearly-equal number.
