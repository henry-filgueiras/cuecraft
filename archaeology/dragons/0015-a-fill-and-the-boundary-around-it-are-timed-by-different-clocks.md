---
id: drg_01KZEWFNG6PTD3XDDY7DGSSVVW
sequence: 15
kind: dragon
status: open
created: 2026-08-07
---

# A fill and the boundary around it are timed by different clocks

## Context

Two of cuecraft's timings are now derived from two different clocks and have to agree, and nothing
makes them.

A **derived portal** (decision:25) opens on the cue that reaches inside a concept, and the opening
takes about three and a half seconds: compose the plate, settle, expand the chamber. Those frames
come from `CAMERA`, and they are a directorial constant.

A **fill** (decision:33) runs across a measured sentence, and its length is whatever the
synthesizer produced for that sentence.

In `examples/sha256/compression.yaml` the two collide. One cue opens the chamber; the next cue
fills the population inside it. If the opening cue is shorter than the expansion, the field starts
filling behind a boundary that is still growing, and by the time the chamber lands the count is
already well advanced — which is the one thing the field exists to prevent, since the point is
watching it accumulate.

It was found by watching, fixed in the artifact by lengthening the sentence that opens the chamber,
and the fix works. But it is a constraint the author has to satisfy without being told it exists:
nothing validates it, nothing reports it, and the failure is silent and looks fine.

## Question

When two derived timings have to agree, whose job is it to make them?

## Constraints

Every obvious answer costs something the project has been careful about.

- **Validate it.** The compiler knows the clip length and could know the expansion length, so it
  could refuse a fill that starts before its chamber is open. But the camera's constants live in
  `render/world.ts` and the narration's timing lives in `compile/`, and making the parser import
  the camera to check a sentence would invert a dependency the whole architecture leans on.
- **Delay the fill.** Start the span when the chamber finishes rather than when the sentence does.
  Silent, automatic, and it breaks the one property decision:33 is built on — that the span is the
  *measured sentence* and rewording retimes the visual. A span that started somewhere else would
  be a third clock.
- **Shorten the opening.** Make the derived portal faster when a fill follows it. That is the
  camera taking instructions from the narration's content, which is the direction decision:22 spent
  a whole round refusing.
- **Say nothing and let the author watch.** What happens today. It worked, because somebody
  watched. It will not always be somebody who knows to look.

There is also a version of this that is not about fills at all: `enter:` occupies a fixed window
(dragon:12) that the descent has to fit inside, and the same "two derived things that must agree"
shape is there too. Whatever answers one probably answers both.

## Candidate direction

Do not fix it yet — one artifact is not enough to know whether this is a real class of problem or
one awkward adjacency. Watch for the second occurrence. If it arrives, the most promising answer is
the one that neither moves the span nor slows the camera: **report** it. A compiler that says "this
population begins filling 1.2 seconds before the boundary around it finishes opening" costs no
architecture, tells the author exactly what to do, and is the same kind of thing `cuecraft render`
already prints about the call stack.

## Resolution criteria

Close as **resolved** when a second artifact hits it and the compiler either reports or prevents
it. Close as **weakened** if two or three more decks with populations never come near the boundary,
which would say this was an adjacency rather than a class.
