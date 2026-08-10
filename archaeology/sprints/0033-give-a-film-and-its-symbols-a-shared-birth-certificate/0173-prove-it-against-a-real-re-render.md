---
id: tsk_01KZMMTH6S8NFZEEEFQE08TZBJ
sequence: 173
kind: task
status: closed
sprint: spr_01KZMMSQ1XA0QK02A337P2PJNM
created: 2026-08-09
closed: 2026-08-09
---

# Prove it against a real re-render

## Objective

Prove the whole loop against a real render, and make the silent-wrong-frame regression impossible to
reintroduce.

## Acceptance criteria

- Unit coverage for the digest's determinism, canonicality, machine-independence and sensitivity;
  for the stamp's round trip through a tag that has been prefixed; and for all three verdicts.
- An end-to-end test that renders a deck, re-renders a *different* deck over the same output path,
  and asserts that extraction with the first sidecar is refused rather than silently wrong.
- A pair with no stamp on either side still extracts.
- README and `CLAUDE.md` say what `renderId` is in a sentence, and `npm run check` and `scarp doctor`
  are green.
