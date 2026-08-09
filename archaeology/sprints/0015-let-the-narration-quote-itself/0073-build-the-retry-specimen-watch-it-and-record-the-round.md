---
id: tsk_01KZHY86W56HJX55TDEY20DA9N
sequence: 73
kind: task
status: pending
sprint: spr_01KZHY6QMS7W4P3442GSSA9X8D
created: 2026-08-08
---

# Build the Retry specimen, watch it, and record the round

## Objective

Build "The Retry That Charged You Twice", render it at full size, watch it, and record what the
round found.

Small enough that the feature is what is under test rather than the writing.

## Acceptance criteria

- `examples/retry.yaml`: two narrators, subtitles on. An early slide establishes and anchors the
  first settlement; a later speaker calls the retry harmless; the other invokes `recall`; the film
  cuts back to the exact earlier statement; it returns to a short subtitle-free pause; the first
  speaker attempts an implausible reinterpretation.
- Rendered and watched at full size. Confirmed by eye: source and recalled frames evolve identically;
  the original audio and narrator label replay; the progress rule retreats and returns; the current
  slide resumes cleanly; the silence after the recall carries no stale subtitle.
- A decision recording that recall preserves one serialized audible stream, and why it is not a call.
- A dragon for speaker handover / interruption overlap, if nothing already houses that question.
- `npm run check` and `scarp doctor` pass; sprint:15 closed against its success criteria.
