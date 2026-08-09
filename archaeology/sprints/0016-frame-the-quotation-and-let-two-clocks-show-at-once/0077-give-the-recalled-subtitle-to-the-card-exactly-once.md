---
id: tsk_01KZJ19WZRHB1AAPAP8B7MQADF
sequence: 77
kind: task
status: closed
sprint: spr_01KZJ18K655EV1A9690KY555BE
created: 2026-08-08
closed: 2026-08-08
---

# Give the recalled subtitle to the card, exactly once

## Objective

Give the recalled subtitle to the card, and make sure it is drawn once.

## Acceptance criteria

- During a recall the deck-level subtitle band draws nothing; the card draws the cue instead.
- The cue is the source clip's text and the source clip's narrator, on the compiled recall interval,
  and it is not recomputed from anything.
- Subtitles outside recalls are unchanged; the authored pause after a recall still shows nothing.
- With subtitles off, the card contains none and the timeline still has an empty track.
- The suppression rule is testable without a browser, and is tested.
