---
id: ide_01KZKQ02D9VS19588JEZKPBSAR
sequence: 23
kind: idea
status: parked
created: 2026-08-09
---

# A second environment behind the same output protocol

## Problem

`decision:56`'s protocol is not R-shaped. "Source over stdin, inputs and a frame through the
environment, outputs declared on stdout, files in a directory the runner owns" describes Python,
Julia, gnuplot, or a shell script equally well. The only R-specific things in `src/compute/r.ts`
are the command name and its two flags.

## Sketch

A second module beside it — `python.ts` — that is a copy with a different command, a different
bootstrap, and the same protocol. Not a registry, not a plugin interface, and not a `runtime:` key
in the YAML: the language would still be carried by the program's extension, exactly as `.R` is.

## Boundaries

Deliberately a copy rather than an abstraction. The round that built the R runner refused a
"generalized language runtime architecture" in its non-goals, and the argument survives: two
concrete runners that share a protocol are much easier to reason about than one runner with a
strategy object, and if a third ever appears the duplication will say what actually wants factoring.

What would *not* be acceptable is a deck naming an interpreter, or a path by which an author
supplies flags, an environment, or a working directory.

## Evidence

Worth building when a real presentation wants something R is bad at and another environment is good
at — a trained model's output, an image pipeline, a simulation. One example deck is not evidence
that a second language is needed; it is evidence that the first one worked.
