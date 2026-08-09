---
id: tsk_01KZJ19WZKEPMC7R1BRM7NAB9A
sequence: 76
kind: task
status: closed
sprint: spr_01KZJ18K655EV1A9690KY555BE
created: 2026-08-08
closed: 2026-08-08
---

# Frame the quotation, and name the slide it came from

## Objective

Build the quotation card: the present slide recessive underneath, the recalled canvas inset and
outlined, and a derived label naming the slide being quoted.

## Acceptance criteria

- The present slide keeps rendering underneath at its own present-time frame. It is not replaced,
  restarted, or unmounted.
- The recalled canvas is inset at the chosen scale, centred, with a thin `COLORS.accent` outline
  drawn in screen space so it is not scaled with the canvas.
- The label is derived from `Recall.sourceOrdinal`, set in the deck's existing small-caps idiom, in
  the exposed margin — consuming no authored layout and reading from no YAML.
- Hard cut in and hard cut out: no fade, no settle, no interpolation of any kind.
- The recall constants live in `theme.ts` with the rest of the deck's vocabulary.
- Every timing invariant holds: `totalFrames`, clip placement, audio, source-frame mapping and
  entrance offsets are unchanged, and the no-recall decks are byte-identical.
