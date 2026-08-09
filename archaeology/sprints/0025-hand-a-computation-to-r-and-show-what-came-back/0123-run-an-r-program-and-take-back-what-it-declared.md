---
id: tsk_01KZKNG28AW4H4Q3SCWBRDSRF5
sequence: 123
kind: task
status: closed
sprint: spr_01KZKNE2VBP4FK8GVSTT50E27Z
created: 2026-08-09
closed: 2026-08-09
---

# Run an R program and take back what it declared

## Objective

A TypeScript module that runs one R program and returns what it declared, or explains why it
could not.

## Acceptance criteria

- R source is supplied over stdin to `Rscript --vanilla -`; the caller never writes an executable
  `.R` file for the runner's benefit.
- stdout and stderr are captured independently and the process is awaited.
- Each invocation gets an output directory the runner chose, created empty.
- The program discovers its inputs and its output directory without parsing anything.
- Outputs are declared on stdout by the program; nothing is discovered by scanning.
- A declared file that escapes the output directory is refused; a declared file that does not
  exist is refused; a malformed declaration is refused; each names what was wrong.
- A nonzero exit carries the exit status and R's stderr into the error.
- A missing `Rscript` is a distinct, actionable error naming the bootstrap.
- Paths containing spaces work end to end.

## Done, and the output directory is what made the path check trivial

`src/compute/r.ts`, 400 lines including the reasoning. Source over stdin to `Rscript --vanilla -`,
stdout and stderr captured separately, the process awaited, and a two-minute kill for a run that
will not finish.

**The one design choice that paid for itself: the runner owns and empties the output directory, and
a declaration names a file *relative to it*.** "Resolve output paths safely" then stops being a
policy with options and becomes `relative(dir, path)` not starting with `..` — and `/etc/passwd`,
`../escape.png` and `figures/../../elsewhere.png` are all the same refusal. Emptying it first is
what makes a program that stopped drawing its chart fail instead of quietly succeeding against last
run's file, which is the property `r.live-test.ts` asserts directly.

Discovery is entirely by declaration. Nothing is found by scanning, so an output that was not
declared does not exist, and a stray `Rplots.pdf` is invisible rather than ambiguous.

The environment carries the program's bearings — `CUECRAFT_OUTPUT_DIR`, `CUECRAFT_INPUT_<NAME>`,
`CUECRAFT_INPUT_NAMES`, and the frame — so an R program parses nothing to find its way. The output
directory is also the working directory, so `png("chart.png")` lands correctly with no path
arithmetic in the program at all.

Every refusal names the thing and the fix. A missing `Rscript` says to run the bootstrap; a nonzero
exit carries the status and R's stderr under a label; a malformed declaration quotes the shape back.

Paths with spaces work end to end and are tested that way deliberately: the live tests run in a
`mkdtemp` whose template contains spaces, because nothing is shelled out and this is what proves it.
