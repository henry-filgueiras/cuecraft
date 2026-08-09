---
id: drg_01KZJBFQ8D8F5AQHJV0296A802
sequence: 28
kind: dragon
status: open
created: 2026-08-08
---

# Four transitions in the hostile machine are never legible in any frame

## Context

`examples/leases.yaml` lays out at 3840 by 1332 world units. Fitted to the overview that is a state
name at 23 screen pixels — legible, just — and an **event label at 16**, which is not. So the
closing shot of the adversarial film shows the shape of the machine and the names of its states,
and none of the sentences on its edges can be read.

That is arguably correct: an overview is about shape, and the film has already shown every event
label the run touched at 23 to 36 pixels in its own shot. But four of the fourteen transitions are
never taken, which means **four labels in that film are never legible in any frame** — and those
four are exactly the "what else could happen" the composition claims to answer.

The machine is wide because it is a hub: six transitions leave `Running`, each to a different
state, and a rank has to hold all of them side by side. Nothing about the layout is wasteful.

## Question

What is the honest ceiling on a machine's *width*, expressed as something an author can check
before they write it — and what should happen when a machine exceeds it?

## Constraints

The transcript hit the same wall from the other side (dragon:18) and answered it with a rail: chrome
that names the parties the shot has cut off. A machine cannot do that, because what has been cut off
is not a party but a *sentence on an edge*, and the rail would be a list of sentences.

Shrinking the type is not available: `MACHINE.widest` is already derived from where a state name
stops being readable, and the overview is exempt from it precisely because the overview is the shot
that cannot be arrived at by moving closer.

Rendering the overview at a *smaller* label size and letting the untaken labels appear only in a
shot that visits them would mean the camera visiting states the run never enters, which is a camera
telling a story the scenario did not.

## Candidate direction

## What sprint:20 measured, without closing it

The question was posed against a layout that had been asked for once, with defaults. decision:52
searched 144 of them, and the answer moved but did not arrive:

    incumbent, at the frame it now gets   19.1px state name, 13.0px event label
    elected                               23.9px state name, 16.3px event label
    best candidate found, on any axis     ~24px state name, ~17px event label

So roughly a quarter more, in world units, and about half of that handed back to decision:49's
ledger rail, which takes a fifth of the width off a machine that is width-bound. The event label at
the canonical overview is still under the floor and **four transitions in that film are still never
legible in any frame**.

Two things did change, and both are about the diagnosis rather than the number.

**It is now known to be a property of the machine rather than of the layout.** Nine states and
fourteen labelled edges, of which one rank has to hold five siblings and seven captions side by
side, is about 8000 world units of text; no arrangement of it fits a 16:9 frame at a readable size.
The search says so with 144 data points instead of one.

**And the composition stopped needing the overview to carry that weight.** decision:49's ledger
answers *what happened and in what order* in screen-fixed type at 27px, and decision:51's planner
now gets close enough to read the label on twelve of thirteen occurrences rather than three. What is
left unreadable at the overview is exactly the four untaken transitions — the "what else could
happen" half — which is where this dragon started and is now the *only* thing it is about.

## Resolution criteria

Close as **inherent** if the answer is that a machine wider than about eight legible states cannot
be explained whole and the format should say so — in which case the ceiling belongs in the
documentation next to the grammar, not in a policy. Close as **fixable** if a treatment is found
that keeps untaken possibility readable in a wide overview without either shrinking the type or
sending the camera somewhere the run never went.

## What sprint:21 measured, and why it still does not close

sprint:20 left this as "a property of the machine rather than of the layout", measured against a
search space of 144 candidates. sprint:21 was opened because that space could not express the
obvious alternative — dagre ranks globally, so nothing in it can say *keep these six states
together* — and a conclusion measured against a space that cannot hold the alternative is not yet a
conclusion.

It is one now. Three things were established (decision:53).

**Arrangement is exhausted, and it lands under the floor.** The best-aspect candidate of the 144 is
2688 x 1830 = 1.47:1 against a 1.426:1 frame — a near-perfect fit — and gives 26.8px state name and
**18.2px** event label. An area-preserving ideal repack of the same content gives 26.4 / 17.9, so
the search already beats the theoretical optimum. There is no arrangement of this content that
clears 20px.

**Seeding cannot be drawn.** The whole point of the round. Laid out alone, the six states the run
actually touches come out 1602 x 1146 = 1.40:1 and give **29.9px** — nearly double. But no lever the
dependency has will produce that inside the whole machine: compound clustering, edge weight to 150,
`minlen` exile and their combinations, over 4 x 144 configurations on both films, and **not one
meets both floors at once**. The single configuration that gets a territory shot over 20px costs
seven pixels of atlas. Building it anyway means a bespoke placer, which is refused.

**And the shortfall is not only a width problem, which is new.** The leased runner's occurrences #9,
#10 and #11 are three consecutive *silent* ones with move windows of **14 and 11 frames against a
16-frame minimum** — they cannot move at all, so the shot chosen at #9 must hold all three. The
union of their essential bounds is **3078u = 17.0px**. Even a perfect shot on that trio is under the
floor, and no camera policy can reach it. This dragon has a second cause, and it is a *timing* one:
a run that goes quiet across a wide part of the map strands itself.

So the case for **inherent** is much stronger than sprint:20 could make it — the ceiling is now
measured from three directions rather than asserted from one. It is still not closed, for one
honest reason: closing it as inherent requires the ceiling to be *stated*, next to the grammar,
where an author can check it before writing a machine. That is the resolution criterion, and writing
it is a round of its own. What has changed is that there is now something definite to write down.

The candidate direction above — a rail of cut-off sentences, borrowed from dragon:18 — remains
unattempted and remains unattractive for the reason recorded there.

## What sprint:22 changed, and why this is still open

An author now has an answer, and it is not a fix for this dragon.

`scope: narrated` (decision:54) lets a slide declare that it explains the run rather than the
machine. `examples/leases-narrated.yaml` is this exact machine and this exact scenario under that
key, and in it **there is no illegible transition**: 41.0px state names, 27.9px event labels, zero
camera moves, and all thirteen occurrences read from one held overview.

That does not close this dragon, and it is worth being precise about why. The resolution criteria
above say to close as **fixable** only if a treatment "keeps untaken possibility readable in a wide
overview". The reduction does not keep it readable — it removes it, and says so on the frame. It is
an escape from the problem rather than a solution to it, and the two should not be confused.

So what has changed is the dragon's **scope**, not its status:

- It is now specifically about `scope: whole`, which is still the default and still what both
  showcase examples use.
- The pressure is lower, because an author who hits the wall has somewhere to go rather than only a
  worse film.
- The wall itself is exactly where sprint:21 left it: arrangement exhausted at 18.2px, seeding
  undrawable in 4 x 144 configurations, and a silent trio whose union is 17.0px.

Closing it as **inherent** still needs the ceiling written down next to the grammar, where an author
can check it before writing a nine-state machine — and now that check has a second half worth
stating in the same place: *if your machine is too wide to explain whole, you can explain the run
instead, and here is what that costs.*
