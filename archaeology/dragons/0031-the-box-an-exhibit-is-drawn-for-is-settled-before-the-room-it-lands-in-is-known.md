---
id: drg_01KZKPYZJY7X3T3RHHHZ7D9X4C
sequence: 31
kind: dragon
status: open
created: 2026-08-09
---

# The box an exhibit is drawn for is settled before the room it lands in is known

## Context

An exhibit's program is told the box it must fill (`decision:55`), and it is told once, during
materialization — the second stage of the compilation. The room the picture actually gets is
`bodyBox(title, band)`, and `band` is the height of the subtitle strip, which is derived from the
longest sentence in the deck **two stages later**, after synthesis and timing.

So the picture is drawn for a room whose dimensions are not yet knowable.

## Question

`EXHIBIT` in `src/render/theme.ts` currently resolves it by picking the *smaller* of the two rooms
— subtitled, one-line heading — and letting the composition contain the result in whatever room
turns up. A subtitled deck fits exactly; an unsubtitled one gains about ninety pixels of air above
and below; a heading that wraps to two lines shrinks the picture whole.

That is defensible and it is not obviously right. What it means in practice:

- **The apparent type size in a picture depends on the deck around it.** Two decks running the
  same program with the same data get charts whose labels are different sizes on screen, because
  one of them has subtitles and the other does not. Nothing else in cuecraft behaves that way:
  every other composition re-fits its own type against the room it was given.
- **A two-line heading costs the picture about a fifth of its scale**, and the program has no way
  to know it happened.

## Constraints

## Candidate direction

Either direction would be an answer, and neither has been tried:

- **Run materialization later.** Nothing forces it to precede synthesis — that ordering was chosen
  so a broken R program costs no Kokoro time. Moving it after timing would make the exact room
  knowable and would cost a minute of narration on every failed program.
- **Give the program the aspect and not the pixels**, and let the composition rasterize at whatever
  size it needs. That is an SVG answer, and SVG is deliberately not implemented.
- **Decide the wobble does not matter.** Ninety pixels of air on an unsubtitled deck is invisible;
  the two-line-heading case may simply be rare enough not to matter. This wants a frame that
  convicts it rather than an argument.

## Resolution criteria

A frame that convicts the wobble — a two-line heading whose chart is visibly undersized beside an
unsubtitled deck's — or a measurement showing the difference is invisible. Either closes it.
