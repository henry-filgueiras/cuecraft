---
id: tsk_01KZESBWSQ343FPYBP7CE8HVZW
sequence: 33
kind: task
status: closed
sprint: spr_01KZES9SFB63FP2G1CRH4NTKEN
created: 2026-08-07
closed: 2026-08-07
---

# Rewrite the film against FIPS 180-4, and make repetition visible

## Objective

Rewrite the film so that every claim it makes is one the picture supports and FIPS 180-4 agrees
with.

The audit list from the baseline is the work, and it is bigger than the repetition feature:

- **The round is wrong by omission.** It says everything shifts down; it does not say that `e`
  receives `d + T1`. Two values are injected each round, not one, and the second is the one that
  makes the round more than a rotation.
- **`T1` and `T2` are absent**, and with them the schedule word and the round constant.
- **The two big sigmas are conflated into "stirred"**, and never distinguished from the schedule's
  two small ones.
- **Feed-forward is a clause**, not a step.
- **The one-wayness claims are absolute** where the truth is conditional, and they attribute to
  round count what belongs to the whole construction.
- **The Git opening implies SHA-256** where ordinary repositories use SHA-1.

And the two places repetition must now be *seen* rather than asserted: forty-eight schedule words
accumulating, and sixty-four rounds accumulating.

Length is a constraint rather than a hope: the baseline is 2:56 and proved that density beats
volume. Every sentence that survives has to be carrying something the picture cannot.

## Acceptance criteria

- Every formula on screen matches FIPS 180-4, verified rather than transcribed from memory.
- A test extracts the rotation and shift amounts from the deck's own TeX, runs a reference
  implementation with them, and checks the digest against `node:crypto`. A deck that lies fails.
- The learning contract's seven questions are each answerable after one watch.
- No jargon arrives before the picture that motivates it.
- 2:30–2:45, one slide, no cuts, the call stack intact.
- Renders end to end with the command recorded.
