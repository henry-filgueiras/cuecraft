---
id: drg_01KZMJG0R1521GSJPMM8BWYYAP
sequence: 39
kind: dragon
status: open
created: 2026-08-09
---

# A film's moments have names until they have frames

## Context

A temporal exhibit is the only body in cuecraft whose authored identities do not survive
compilation. A deck names a state the film reaches, and speaks over it:

    play: animation
    during: pass-3
    say: "Here every point has switched cluster at least once."

`footage.ts`'s `queue()` groups the cues under `pass-3`, uses the name to look up the second at
which the program said that state occurs, and emits slices measured in seconds. The name is a map
key inside that function and reaches nothing downstream. `NarrationPlayback` carries `source` — the
name of the *output file* the program declared — and `Playback` carries `src`, `sourceFrom`, `rate`
and `sourceLast`. Neither carries `pass-3`.

So the compiled timeline knows the exact frame at which the film freezes, and does not know what it
froze at.

The asymmetry is sharp against the rest of the compiler: `Anchor` carries both the author's `id`
and its structural `address`, `Recall` carries the author's `id`, `Call` carries the entity's
`target`, and `Beat` carries a reserved `step-N` the compiler assigned on the author's behalf. Only
a film's moments are anonymous by the time they have frames.

## Question

Should a rendezvous name survive lowering onto the timeline, and if so, what does it name once it
is there — the slice cut at that moment, the freeze the narration speaks over, or both?

## Constraints

Before sprint:32 this cost nothing, because nothing read the timeline backwards. decision:66 now
publishes a symbol table of authored semantic addresses, and this is the only kind that had to be
refused for want of a key. The queries it blocks are the natural ones for the feature sprint:31
shipped, and every one of them is a fact `buildTimeline` already holds:

- when does the film freeze at `pass-3`?
- what interval is the narrator speaking over the frozen frame?
- which frame of the film is on screen while they do?

decision:63 constrains any answer: whatever is carried must be settled before frames are assigned,
and it must not let a medium ask for time. A name is inert on both counts, which is why this looks
small — the difficulty is entirely in what it should mean.

## Candidate direction

Carry the name through `NarrationPlayback` onto `Playback`, which is a field and not a mechanism —
`queue()` already has it in hand at the moment it computes the seconds. What is unsettled is the
meaning:

- a slice is cut *at* a moment and runs to the next one, so is the name the slice's start, or the
  interval it opens?
- a hold is derived in `held()` from the room the slices left, and it is the hold — the freeze —
  that the narration is actually speaking over. A hold has no cue and therefore no name of its own;
  it would have to borrow the name of the moment the film stopped at.
- a `replay:` reaches backwards to a moment already passed, so one authored name can produce several
  intervals in the film. That is `recall:`'s shape, and probably wants `recall:`'s answer.

## Resolution criteria

A `playback` symbol kind keyed by the authored moment, such that `cuecraft snapshot --symbol
playback:kmeans/pass-3` extracts the frozen frame the deck is talking about, and the answer to the
`replay:` case is stated rather than fallen into.
