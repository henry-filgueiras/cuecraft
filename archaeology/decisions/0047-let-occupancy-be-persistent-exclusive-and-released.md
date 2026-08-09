---
id: dec_01KZJBCTTH9A3GKRY6392XP17F
sequence: 47
kind: decision
status: accepted
created: 2026-08-08
---

# Let occupancy be persistent, exclusive, and released

## Context

decision:17 gave activation three states and decision:23 recalibrated what they should look like.
Underneath both is one model, in three numbers, and every archetype in cuecraft reads it:

    degree   how established this element is. Rises once, monotonically, and never comes back down
    heat     a transient. Rises at the word, holds, decays to nothing inside a second
    sweep    a one-way wipe

That model has been enough eleven times because every composition it has met asks the same
question: *has narration reached this yet?* An element that has been reached stays reached. Nothing
in cuecraft has ever needed to say that something stopped being true.

A machine needs exactly that, and it needs it to be the strongest thing on the frame. Its whole
subject is that **one** state is current, that it was somewhere else a moment ago, and that it is
no longer there. Written in the existing model the sentence comes out wrong in both halves: `heat`
says *this just happened* and then stops saying anything, so a frame paused two seconds after an
arrival cannot say where the machine is; `degree` says *this has been reached* and then says it
forever, so after five occurrences five states claim to be current.

Two workarounds were auditioned before this was accepted. Reading occupancy as "the most recent
element with nonzero degree" makes the renderer re-derive from a list it should be consuming, and
gives no way to draw the *release*. Stretching `heat` to cover a whole beat makes the transient
permanent, at which point it is this decision with a misleading name and decision:23's surround
attenuation — half a stop off everything that is not the moment — becomes half a stop off the map
for the entire film.

## Decision

**Occupancy is a fourth quantity, and it is persistent, exclusive, and released.**

    occupancy   0 to 1, on every state, summing to one across the machine at every frame

It is not derived from the anchor model and does not go through it. It comes from the compiled
beats and the scenario, in one pass (`runProgress`), and the composition reads a snapshot rather
than walking anything per frame.

**It flows rather than switches.** While the traveller is crossing an edge, occupancy leaves the
source at exactly the rate it arrives at the destination. So the frame never claims the machine is
in two states and never claims it is in none, and the mid-traversal frame is *itself* a legible
answer to "where is it now" — it is on that edge. The self-transition falls out for free and is the
proof the shape is right: source and destination are one state, the two halves cancel, and
occupancy does not move, which is exactly what a self-transition means.

**`heat` is still a transient and now says something narrower.** It fires when the traveller lands,
not when it sets off, and it means *now*, not *this one* — because *this one* is occupancy's job
and occupancy does not decay. On a self-transition the arrival ring is the only thing on the frame
that says an event happened at all.

**decision:23's surround attenuation had to be halved and re-hung.** Dimming everything that is not
the moment by half a stop is the single most effective device cuecraft has, and it silently assumes
the moment *ends*. Here it does not, so a permanent half stop would be a permanent map nobody can
read — and the map is two thirds of what this composition has to say. So the attenuation rides the
arrival transient rather than the occupancy, at a quarter stop, for about a second.

**Nothing is attenuated for not having happened.** An atlas draws unreached entities dim because
narration is going to reach them and dimness is a promise. A machine makes no such promise: an
untaken transition is the answer to "what else could happen from here", and an answer nobody can
read is not one. `possible` is a real contrast, not a hint of one, and the separation from
`current` is bought with the accent, a fill and a ring rather than by pushing the rest into the
dark.

**Colour encodes occupancy and nothing else.** The atlas reads hue off the flow and the transcript
off the column, and both work because hue is there a redundant encoding of *identity* — a fact that
never changes about a thing that never moves. A machine has nothing like that to encode, and a
frame where nine states are nine colours has no colour left to say which one is occupied. So the
topology is one neutral steel at three brightnesses (possible, visited, current) and the deck
accent is spent entirely on the one state the machine is in.

**A departed state is ordinary topology, not a spent one.** `visited` sits one shade above
`possible` and no further. "The door was open a moment ago" is not a fact about the door.

**And one piece of notation is added, because the metaphor has a hole.** A traversal is legible
*while it is happening*: a spark crosses an edge and nobody has to be told it is the second time.
**Paused, it is not** — a brighter stroke can say "this was taken" and has no way to say "twice".
So from the second occurrence onwards an event label carries `×N`. Derived, absent on every
transition taken once or never, and the only mark on the frame that exists purely to survive a
pause.

## Consequences

- The composition answers the three paused-frame questions with three different devices, and this
  decision is why they do not fight: **where** is occupancy (persistent, exclusive, accent),
  **how it got here** is the wake plus the counts (persistent, graded, neutral-bright), **what else**
  is the untaken topology (persistent, flat, legible). Nothing here is a transient except the
  arrival ring, and nothing except the arrival ring needs the viewer to have been watching.
- The wake's numbers were set by looking. The first render's floor and decay left the transition
  the run *opened with* indistinguishable at the closing overview from one it never took, which is
  the frame most responsible for answering how the machine got where it is. Untaken came down and
  taken went up to roughly two to one in both alpha and stroke weight. **`available` deliberately
  stayed the smallest step on the frame** — a viewer reading "could happen" as "did happen" is
  reading the film backwards, and that error is worse than missing the hint.
- **This is scoped to `circuit`, and the other twelve archetypes are untouched.** Whether the
  activation model should gain occupancy generally is a real question and is not answered here; see
  idea:20. What is now known is that three numbers were not enough for the thirteenth body, which
  is the first time that has been true.
- The exclusivity is a property of the *scenario*, not of the model: one run, one traveller, one
  current state. A second traveller would make occupancy a set and every sentence above would need
  restating, which is why concurrent regions are a non-goal rather than a gap.
