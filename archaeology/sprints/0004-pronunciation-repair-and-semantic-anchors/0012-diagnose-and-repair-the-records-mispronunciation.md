---
id: tsk_01KZC5821DB8W2HVACKNXKVXQE
sequence: 12
kind: task
status: closed
sprint: spr_01KZC58217DD56XN7FZ221N7EF
created: 2026-08-06
closed: 2026-08-06
---

# Diagnose and repair the records mispronunciation

## Objective

Find out why "WitnessGlass records the work" is spoken as the plural noun, from evidence rather
than intuition, and repair it with the smallest mechanism the installed stack actually leaves
available.

## Acceptance criteria

- The layer responsible is identified by a diagnostic matrix, not assumed.
- Every upstream override mechanism — inline phonemes, dictionaries, SSML, phoneme input,
  tokenizer overrides — is checked and the result recorded, including the ones that do not work.
- An author can repair one occurrence without a global dictionary, since the word legitimately
  has two pronunciations.
- The authored text stays readable; what is spoken is derived.
- A `pronounce` entry naming a word that is not in the cue is an error, not a no-op.
