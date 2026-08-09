---
id: tsk_01KZKWRXSGY9JG5VM52WCGH8VT
sequence: 140
kind: task
status: closed
sprint: spr_01KZKWMMWAQ497JEVVVG56BRSX
created: 2026-08-09
closed: 2026-08-09
---

# Inline the SVG, address what it named, and never leave ground

## Objective

Let a program hand back an SVG whose named objects narration can reach, and let the round trip
ground -> active -> ground restore the imported styling exactly.

## Acceptance criteria

- The composition inlines the SVG (idea:24's sketch) rather than putting it in an `<Img>`, because
  static mode is where the styling does not reach.
- Emphasis is applied as a per-frame style overlay keyed on `data-cuecraft`; **the imported markup
  is never mutated**, so ground state is not restored but rather never left.
- Sequential and partially overlapping attention both end at ground. An element attended across two
  consecutive sentences does not flash through ground between them.
- `shows:` still declares what the deck will reach, checked against what the file actually carries,
  in both directions — decision:57's bargain with the mechanism changed.
- Demonstrated on a real R program, judged on the film.
