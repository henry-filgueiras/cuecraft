---
id: tsk_01KZKNG298V3773VSN6703XZB5
sequence: 127
kind: task
status: closed
sprint: spr_01KZKNE2VBP4FK8GVSTT50E27Z
created: 2026-08-09
closed: 2026-08-09
---

# Bootstrap R

## Objective

Bootstrap R on macOS, following the shape of the text-to-speech bootstrap.

## Acceptance criteria

- Detects an existing working `Rscript` and does not reinstall.
- Installs R through Homebrew when it is absent on macOS, then verifies.
- Refuses clearly when it cannot proceed: no Homebrew, not macOS, install failed.
- Idempotent, and verified by actually running a small R program that writes a PNG.
- Reachable as an npm script and documented beside the other bootstrap.

## Done, and it verifies a PNG rather than an interpreter

`scripts/bootstrap-r.sh`, `npm run bootstrap:r`, following `bootstrap-local-tts.sh`'s shape:
`info`/`warn`/`die`, detect before install, verify after, safe to rerun.

**The smoke test draws a PNG rather than starting R**, and that is not decoration. macOS R defaults
its `png()` device to quartz, which needs a window server; a bootstrap that verified only the
interpreter would pass on a machine where every render fails. It asserts `capabilities("cairo")`
explicitly and then actually writes a file.

It also distinguishes "on PATH" from "works" — a half-installed R puts the binary where
`command -v` finds it and fails on first use — and reinstalls in that case rather than reporting
success.

Three refusals, each naming what to do: not macOS (install from CRAN), no Homebrew (install
Homebrew, or install R yourself and rerun to verify), `brew install` failed (the output above says
why). No packages are installed and nothing writes to an R library.

Run on this machine from a state with no R at all: installed R 4.6.1 via Homebrew, verified, and
rerun idempotently.
