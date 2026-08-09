---
id: tsk_01KZM5GH30E7ETDADJQY9W5NJV
sequence: 144
kind: task
status: closed
sprint: spr_01KZM5EXSYFDBB87YWSEQSC0V0
created: 2026-08-09
closed: 2026-08-09
---

# Pin two faces, and hold the frame until they are there

## Objective

Provision Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono deterministically, offline after
install, and load them behind the gate `mathfonts.tsx` established so no frame is ever photographed
in the fallback.

## Acceptance criteria

- Both families come from pinned npm packages, integrity-checked by `package-lock.json`, and reach
  the browser through the composition's own webpack exactly as KaTeX's faces do — no fetch at render
  time, no `publicDir` copy, no unversioned URL.
- Only the weights the deck actually sets (400, 500, 600, 700), latin only, upright only. Not the
  catalogue.
- `fonts.lock.json` names the eight expected WOFF2 files and their SHA-256, and
  `npm run bootstrap:fonts` verifies them: cheap when they are already valid, actionable when they
  are missing and the machine is offline.
- The OFL-1.1 licence text ships with the fonts and is pointed at from the documentation.
- The gate is the smallest shared primitive that serves both KaTeX and this, and it waits on the
  families **by name** rather than on `document.fonts.ready`.
- Nothing generated is committed.
