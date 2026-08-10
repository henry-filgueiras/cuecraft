---
id: tsk_01KZMGMJKZR5CH4BDV3SM8DZQ6
sequence: 161
kind: task
status: pending
sprint: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
created: 2026-08-09
---

# Replay an interval slower, and come back to the frozen frame

## Objective

Show an interval of the film again, slower, in the middle of an aside — and then return to the
exact frozen frame and carry on.

    - play: kmeans
    - speech: "Hold it there. A centre has crossed the sparse middle."
      during: pass-3
    - speech: "That happened in about a second. Watch it again."
      during: pass-3
    - replay: pass-2
    - speech: "Forty-four points changed hands in that one pass."
      during: pass-3

The claim being tested is decision:63's last consequence: that instant replay is **another lowered
temporal leaf**, and that nothing in the timeline understands the word.

## Acceptance criteria

- `replay: <moment>` lowers to an ordinary slice with a different rate: local media interval
  `[that moment, this rendezvous]`, played at a derived rate. No new record, no new renderer branch.
- The rate is derived, not authored. There is no key with which a deck could set a playback speed.
- The frozen primary state is restored **exactly** after the replay, and playback resumes from the
  original rendezvous position — proven against lossless stills, not against a re-encode.
- The replay does not move the primary cursor: the slices of the primary film still consume exactly
  the film's own length.
- A replay of a state the film reaches *after* the rendezvous is refused.
- If any of this stops being boring, stop and record why.
