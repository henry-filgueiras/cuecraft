---
id: drg_01KZMMRW88M2FHCT1GKA4PN1VA
sequence: 40
kind: dragon
status: closed
created: 2026-08-09
resolved-by: "[[dec_01KZMN9G84WRPWZKMW82TZJWS1|Give a film and its symbols one birth certificate]]"
---

# A sidecar cannot tell whether it is describing the film beside it

## Context

decision:66 exists to stop a downstream tool guessing where things are in a film. `symbols.ts` then
says, in its own docstring, that the guessing has not been eliminated so much as moved:

> It is also the only place that has to know a symbol table might be *stale* — a sidecar beside a
> film that has since been re-rendered is still valid JSON, and nothing here can tell.

Nothing acts on that sentence. `cuecraft snapshot` and `cuecraft snapshots` read whatever
`.symbols.json` sits beside the video, resolve a key to a frame, and extract it. If the film has
been re-rendered since — a line of narration edited, a voice changed, a slide reordered — every
frame number in the sidecar describes a film that no longer exists, and the extraction still
succeeds. It writes a PNG, prints a key beside a timecode, and returns zero.

That is the failure decision:66 was written to prevent, displaced one step. An agent that trusted
`slide:architecture` and got a frame of the conclusion has been misled *more* effectively than one
that sampled blindly, because the output carries a name and a number and looks authoritative.

## Question

What establishes that a symbol table and an MP4 describe the same render, and where does the check
belong?

## Constraints

- **`inspect` must stay ffmpeg-free.** It takes a sidecar and no film, so there is no pair to check
  and nothing to read an MP4 with. Whatever this is, it cannot live inside `parseSymbolTable`.
- **The check runs per invocation, and invocations come in bulk.** A shell loop over
  `cuecraft snapshot --symbol …` pays the cost once per marker. Anything proportional to the size of
  the film is paid tens of times over a twenty-megabyte file.
- **A negative must be actionable and a positive must be honest.** Refusing to extract is only
  reasonable if the refusal is nearly always right; a check that fires on films which are in fact
  correctly described would be worse than no check.
- **Artifacts already on disk have no such marker.** Every film and sidecar rendered before this is
  answered must remain usable, so whatever the check is, "cannot tell" has to be a real answer and
  must not be fatal.

## Candidate direction

The instinct is a tiered comparison ending in a hash of the MP4's bytes, and the last tier is the
one to be suspicious of. **This is a provenance question, not an integrity question.** There is no
adversary and no corruption; the two files are siblings from one compilation. "Are these bytes what
I rendered" and "do these frame numbers describe this film" come apart in both directions — a
re-encode changes every byte while leaving every frame number correct, and re-rendering the *same*
deck to the *same* path leaves a hash that matches the film which is there rather than the film the
sidecar was born beside, which is precisely the case that matters.

What both artifacts do share is a parent: the final `Timeline`. A digest of it is deterministic, is
computed over kilobytes rather than megabytes, and differs exactly when the frame coordinates could
have differed — so two artifacts from an identical timeline agree, correctly, rather than by luck.

An input digest (deck source, version, configuration) is the wrong parent. dragon:33 already records
that a deck with an exhibit is reproducible only up to whatever R is installed, and re-synthesised
narration moves every duration. The timeline is downstream of all of it and absorbs it.

## Resolution criteria

Extracting a frame from a film with a sidecar that describes a different render is refused, by name,
with the action that fixes it; extracting from a matched pair is silent; and a pair where nothing
can be established proceeds. The check is bounded by the size of the compilation rather than the
size of the film, and `cuecraft inspect` still runs with no ffmpeg on the machine.
