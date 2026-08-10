---
id: tsk_01KZMT59VG8C1X57VZ4ZD7BR34
sequence: 181
kind: task
status: closed
sprint: spr_01KZMT59TE6S528DXCD68THMBX
created: 2026-08-09
closed: 2026-08-09
---

# Connect the staircase, and walk the emphasis down it

## Objective

Make the drawing on slide 5 read as one disturbance travelling, which is its entire subject and
currently the one thing it fails to show.

Two causes, and both need addressing:

- **At rest the staircase is twenty-two unconnected dots.** The cascade is there in the geometry
  and nothing draws the eye down it.
- **Three named marks out of twenty-two.** Emphasis recedes the other named elements and leaves
  everything unnamed alone, so activating one of three produces a flicker at three unrelated
  places rather than a light moving.

## Acceptance criteria

- The marks are connected, so the run down the staircase is visible before anything is said.
- The narration walks the emphasis down the chain rather than jumping between its ends, and the
  named positions are spread through the order rather than clustered at the top.
- Names are semantic and derived — a mark is named for where the wave has got to, computed from
  the number of cars, not for its index typed into the program.
- Program, `shows:` and `activates:` agree in all three directions, and the test in
  `src/examples.test.ts` still proves it.
- No new number is spoken. Where the wave has got to is said by the picture.
