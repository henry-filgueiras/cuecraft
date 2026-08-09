---
id: dec_01KZKPX6VM3RSV1DXBX37RHHM1
sequence: 56
kind: decision
status: accepted
created: 2026-08-09
---

# Describe outputs on stdout, carry them on the filesystem

## Context

`decision:55` puts an R program on the far side of a process boundary and needs the result back.
The question is what crosses, and the temptation is to make it general: a manifest format, a
resource registry, a typed RPC, a language-agnostic descriptor. All of that is a distributed
systems design for a problem whose entire payload is "here is a PNG".

There is a second, sharper constraint. The bootstrap installs base R and no packages, and base R
cannot emit JSON without one. A protocol that required `jsonlite` would make the first R package a
prerequisite of the first R program.

## Decision

**stdout describes outputs; the filesystem carries them.** One line per output, and every other
line is ordinary R diagnostics:

    #cuecraft output png quarterly-revenue quarterly-revenue.png

Four fields, space separated, with the file as the unconstrained remainder so a filename with
spaces needs no quoting rules. The name is constrained to an identifier, which is what makes that
remainder unambiguous.

The file is named **relative to a directory the runner chose and emptied**. That single choice does
most of the work: "resolve the path safely" becomes a containment check with nothing to configure,
a program cannot declare `/etc/passwd`, and nothing is ever discovered by scanning — an output that
was not declared does not exist as far as cuecraft is concerned.

The program is told where it is through the **environment**, so that it parses nothing:
`CUECRAFT_OUTPUT_DIR`, `CUECRAFT_INPUT_<NAME>`, `CUECRAFT_INPUT_NAMES`, and the frame. The output
directory is also the process's working directory, so `png("chart.png")` lands in the right place
without the program composing a path at all.

Source is supplied over **stdin** to `Rscript --vanilla -`. `--vanilla` means a run depends on the
program it was handed and not on anything in the invoking user's home directory.

Everything declared is checked to the bytes: the type is one cuecraft accepts, the path resolves
inside the output directory, the file exists, is a file, is not empty, and begins with a PNG
signature followed by an `IHDR` whose width and height are read back out. None of those refusals
has a fallback, because every one of them is a program that *succeeded* and produced something that
would otherwise have gone onto a slide.

## Consequences

- **Base R is enough.** A program declares an output with one `cat()`. No package, no dependency,
  no bootstrap step beyond R itself.
- **`print()` and `message()` keep working.** Reserving a prefix rather than owning the stream is
  what makes ordinary R debugging survive; non-protocol stdout is kept and shown when a run fails.
- **stdout and stderr stay separate.** A warning is not mistaken for a malformed declaration, and
  R's traceback arrives under its own label in the error report.
- **Refusal is the common path for a broken program.** Six of the eight things that can go wrong
  produce a message naming the file and the fix; only "R exited nonzero" hands the problem back
  untranslated, which is correct because R has already explained it.
- **The protocol is one output type wide.** SVG, PDF and data-back-as-values are all expressible in
  this shape and none is implemented. Adding one is a line in a list plus a validator.
- **No caching.** A rerun always runs. Correct invalidation would have to cover the program, every
  input, the R version and its installed packages, and getting that wrong silently shows a stale
  picture — which is the exact failure the whole design refuses.
