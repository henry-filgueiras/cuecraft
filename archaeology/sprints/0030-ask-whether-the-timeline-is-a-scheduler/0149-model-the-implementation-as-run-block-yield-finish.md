---
id: tsk_01KZMB1K1F9ZPNMXTQBFXPX8FD
sequence: 149
kind: task
status: closed
sprint: spr_01KZMB06WDSJMNNW2MEEH53GV8
created: 2026-08-09
closed: 2026-08-09
---

# Model the implementation as run, block, yield, finish

## Objective

Model the current implementation against READY / BLOCKED / DONE and run / block / invoke / resume /
finish. Do not force the metaphor: the valuable output is the list of places it breaks.

Answer specifically whether evidence recall behaves as `root invokes → root blocks → recall owns
presentation time → recall completes → root resumes`, and if not, say precisely what it does
instead.

## Acceptance criteria

- Each of speech, pause, dwell, call, recall, camera motion, nested worlds and slide extent is
  classified as mapping cleanly, mapping trivially, or not mapping — with the code that decides it.
- The status of BLOCKED is settled: either an existing construct blocks on something, or nothing
  does and the state is unreachable.
- The relationship between `bindNarration`'s static splice and a runtime call stack is stated,
  including what `stackProblem` actually is and where it runs.
- The recall answer is grounded in `NarrationRecall`, `Recall` and `RecalledCanvas` rather than in
  the docstring's description of itself.
