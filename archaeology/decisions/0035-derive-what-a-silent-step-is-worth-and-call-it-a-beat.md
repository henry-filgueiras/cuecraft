---
id: dec_01KZFEE6AB6H66KTQSENFT3TV7
sequence: 35
kind: decision
status: accepted
created: 2026-08-07
---

# Derive what a silent step is worth, and call it a beat

## Context

dragon:1's architecture rests on one rule: **every duration in cuecraft is measured, and nothing
downstream of the measurement may invent one.** A scene lasts as long as its narration. An anchor
lands on a clip's first audible sample. A population fills across a sentence. The two constants
that are not measured — `ENTER_MS` and `EXIT_MS` — are thresholds rather than content, and neither
is authorable, precisely so that no author can write a duration.

decision:34 makes `say:` optional on a step, and that one allowance breaks the rule. A step nobody
talks over still has to *happen*: an arrow has to cross, a label has to be readable, and the film
has to move on. There is no sound file to measure, and there is no author-written number, because a
`dwell:` key would be exactly the mechanical authoring the whole project exists to avoid.

## Decision

**A silent step is timed by what it has to show, and the policy is four rules in one small module.**

1. **A narrated step is paced by its narration.** It lowers to a speech cue that activates the
   step, so its frame comes from decision:14's anchor machinery at decision:13's onset. Nothing new
   times it, and rewording the sentence retimes the visual.
2. **A silent step is paced by its label.** `TRANSIT_MS` for the arrow to cross and land, plus the
   label's length times `PER_CHARACTER_MS` — about 260 words a minute, brisk, because a message
   label is scanned rather than read and the arrow is still on screen afterwards. Clamped between
   `MINIMUM_DWELL_MS` and `MAXIMUM_DWELL_MS`: below the floor two arrows in a row read as one event
   with a flicker in it, and above the ceiling a viewer with nobody talking to them starts
   wondering whether something has broken.
3. **A run of silent steps accelerates.** The first costs the viewer a lane geometry, a direction
   and a label; the fourth costs them a label. Each is scaled by `RUN_DECAY` to a floor, gently,
   because a viewer with no voice is doing all of the work. The floor is set so the shortest step
   in the longest run still outlasts the arrow it contains.
4. **Nothing is added when narration resumes.** A narrated step after a silent run begins on the
   frame the run ends. There is no glue, and no author could write any.

**The dwell is a cue.** It is a fourth never-authored kind in `NarrationCue`, beside `enter` and
`exit`, and it is the same kind of thing they are: a silence with a *cause*. It occupies the
narration track exactly as a pause does, it is compiled into a positioned record beside the clips
and the calls, and `buildTimeline` merges it with the anchors into one list of beats. The renderer
gets one list in step order and cannot tell how any entry arrived.

## Consequences

- Cuecraft now has exactly one derived clock, in one module of about ninety lines, and every number
  in it is a policy a rendered minute is allowed to overturn.
- The rule "nothing downstream invents a duration" survives in the form that matters: the duration
  is derived *before* synthesis, from the source, deterministically — it is a property of the
  content, not an adjustment made to fit.
- A **beat** is the third compiled temporal record after an anchor (a frame) and a span (a range),
  and it carries something neither of those does: how long the step *owns the stage*, which runs to
  the next beat. That is what lets a sentence four times longer than its own transition read as a
  held shot rather than as a flare that burned out with five seconds still to say.
- The obvious escape hatch — a per-step `dwell:` — is refused, and the sprint's non-goals refused
  it in advance. If the pacing is wrong the answer is a better rule, because a deck that tunes its
  own beats is a deck that has gone back to authoring a timeline.
