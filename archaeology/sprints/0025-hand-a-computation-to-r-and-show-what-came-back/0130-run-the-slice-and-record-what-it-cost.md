---
id: tsk_01KZKNG29XKPXHHYZWJ7NAR4J7
sequence: 130
kind: task
status: closed
sprint: spr_01KZKNE2VBP4FK8GVSTT50E27Z
created: 2026-08-09
closed: 2026-08-09
---

# Run the slice and record what it cost

## Objective

Run the whole slice on this machine, look at what came out, and write down what it cost.

## Acceptance criteria

- Bootstrap run from a state with no R.
- Unit tests, R tests, and `npm run check` pass.
- The demo renders to an MP4 and the chart in it was computed on that run.
- The plot is inspected as an image, not inferred from an exit code.
- README documents the capability, the commands, and the limits.
- The archaeology carries the decisions and the open questions this produced.

## Done, and the film exists

Bootstrap run from a machine with no R: Homebrew installed R 4.6.1, `Rscript --vanilla -` verified
over stdin, headless cairo PNG verified. `npm run check` passes at 725 tests; `npm run test:r`
passes at 11. `out/revenue.mp4` is 1:25.6, 1920x1080, five slides, layouts
`statement series specimen exhibit statement`, with the chart computed in 0.2s during the render.

**Inspected as images rather than as exit codes**, which is what caught the composition bug: the
first contact sheet showed the chart at about seventy percent of its room, and the fix is written up
in task:126.

The four claims the deck makes were each checked directly rather than argued:

| claim                                    | check                                                        |
| ---------------------------------------- | ------------------------------------------------------------ |
| the picture is computed on this run      | `rm -rf` the workspace, render, it comes back                |
| the same inputs give the same picture    | two runs, byte-identical SHA-256                             |
| the data drives the chart                | one CSV row edited ×40, Latin America's Q4 goes 52k -> 148k  |
| no image is committed                    | `examples/revenue/` holds three files, asserted by a test    |

Both failure paths were driven through the CLI: a typo in the R program and a deleted input each
fail during "running exhibits...", before a word of narration, naming the slide and quoting R.

README gained a showpiece section, a body-table row, two rows in the authored/derived columns, a
"Computing an exhibit" reference, the bootstrap in Quick start, `test:r` in Development, and an
honest paragraph in Status. `runme/upload-revenue.md` carries the manual attachment step.
Archaeology: decision:55, decision:56, dragon:31, dragon:32, dragon:33, idea:22, idea:23.
