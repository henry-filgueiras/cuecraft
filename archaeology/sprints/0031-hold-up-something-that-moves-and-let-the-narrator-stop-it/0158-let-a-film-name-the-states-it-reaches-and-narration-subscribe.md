---
id: tsk_01KZMFGXPHSRFD29N2WMH41X8M
sequence: 158
kind: task
status: closed
sprint: spr_01KZMDB3GVJR1G787Z6YSZ1VT5
created: 2026-08-09
closed: 2026-08-09
---

# Let a film name the states it reaches, and narration subscribe

## Objective

Let a program annotate the film it hands back with **semantic events in local media time**, and let
narration subscribe to one.

    #cuecraft moment pass-3 4.0667

    - speech: "Stop there. That centre has crossed the sparse middle of the cloud."
      during: pass-3

`during:` is the dual of `activates:`. That one says *narration reaches a representation*; this one
says *the representation reaches a state, and the narration has the floor while it does*.

## Acceptance criteria

- `#cuecraft moment <name> <seconds>` joins `output` and `region` in decision:56's protocol, with the
  same grammar and the same refusals: a name that is not an identifier, a time that is not a number,
  a negative time, a duplicate name, and a time past the end of the film.
- A moment nothing subscribes to does nothing at all. A film may be densely annotated.
- `during:` is a key on a speech cue, validated at parse for the one thing that is a fact about the
  source: that it sits inside the region of a `play:` cue. What it names is checked against the film
  at materialization, exactly as `shows:` is.
- No absolute presentation timestamp appears anywhere, in the source or in the protocol.
