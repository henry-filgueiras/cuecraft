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

## Evidence

**The frame arrived, in sprint:28.** `examples/pivot/`'s first heading was "R drew this, and named
every bar in it", which wraps to two lines, and the SVG chart under it came out at about three
quarters of the room — visibly small, with air on both sides, beside a subtitled deck whose other
exhibit fills its room exactly. It was diagnosed by outlining the container and the picture: the
container was full width and the picture was correctly `contain`ed inside a room that had simply
become 4:1 when the program had drawn for 3:1.

So the wobble is real and it is worth about a fifth of the picture, as this dragon predicted. What
it is *not* is subtle: it was obvious on the first rendered frame and the fix was to shorten the
heading by four characters, which is a thing an author can see and do.

That weakens the case for the two structural answers rather than strengthening it. Running
materialization after timing would buy an exact room at the cost of a minute of Kokoro on every
broken program; a vector exhibit already dissolves the *raster* half of the problem (decision:59)
and still cannot know the room. What is left is a heading that costs a picture some scale, visibly,
in a system where headings are authored and the cost shows up on the first render.

## Resolution criteria

A frame that convicts the wobble — a two-line heading whose chart is visibly undersized beside an
unsubtitled deck's — or a measurement showing the difference is invisible. Either closes it.
