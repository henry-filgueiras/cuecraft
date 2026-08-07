# Working in this repository

cuecraft compiles a YAML presentation source into a narrated MP4. It is an experimental probe,
not a general video tool. These instructions are durable; they apply to every session.

## Read the archaeology before assuming anything

Durable project knowledge lives in `archaeology/`, managed by [scarp](https://crates.io/crates/scarp).
Before proposing architecture, changing a boundary, or concluding that something is missing,
inspect what is already recorded:

```
scarp list decisions    # accepted architectural choices and their consequences
scarp list ideas        # parked expansions — deliberately not built
scarp list dragons      # open questions that are not yet settled
scarp show decision:3   # or any collection:sequence reference
```

Several things that look like gaps are decisions. The absence of a GUI, the single scene type,
the fixed set of composition archetypes, and the fact that an author cannot set a size, a
position, a colour or a time are all intentional and documented.

## Use scarp for durable knowledge, not ad-hoc files

Do not create `NOTES.md`, `PLAN.md`, `TODO.md`, `docs/architecture/`, or similar parallel
hierarchies. Record durable knowledge as scarp artifacts:

- `scarp new decision "<title>"` — a choice made, with context and consequences
- `scarp new idea "<title>"` — something considered and deliberately parked
- `scarp new dragon "<title>"` — a question that is open and unsettled
- `scarp new sprint "<title>"` / `scarp new task "<title>" --sprint sprint:N` — planned work

Use `--body-file <path>` to fill sections; scarp owns the template and layout. Reference other
artifacts inline (`decision:3`, `dragon:1`) so the graph stays connected. Close, adopt, or
reject artifacts as their state actually changes — a dragon that has been resolved should be
closed with `scarp close dragon:N --resolved-by decision:M`, not silently deleted.

Run `scarp doctor` before considering any meaningful unit of work complete.

`runme/` is the one exception, and it is narrow: procedures a **human** has to carry out by hand
because no command can, such as attaching the showpiece videos through GitHub's web editor. It
holds steps, not knowledge — no rationale, no architecture, no plans. Anything explaining _why_ is
a scarp artifact.

## Preserve the source/projection distinction

This is the central idea of the project, and it is easy to erode:

- **Source**: the YAML presentation, slide components, and any _frozen_ narration assets.
- **Projections**: the narration cache, rendered frames, and the output MP4. Always safe to
  delete; never hand-edited; never committed.

Anything that makes a projection independently editable — an editor UI, a "just tweak the
output" escape hatch, committing rendered media — defeats the thesis. Frozen narration is the
one deliberate promotion from generated to source, and it is explicit (see `decision:3` and
`dragon:2`).

Never commit API keys, `.env` files, generated audio caches, rendered video, or `dist/`.

## Prefer mature libraries over bespoke media machinery

Rendering delegates to Remotion; encoding, muxing, and audio measurement delegate to ffmpeg and
established libraries. Do not implement encoders, timeline engines, audio mixers, or layout
machinery here. If a media problem seems to need custom code, first check whether it is a
misuse of the existing tool.

Keep dependencies few and justified. This repository intentionally has a small toolchain
(TypeScript, Prettier, Node's built-in test runner); adding a framework needs a reason recorded
as a decision.

## Keep the CLI first-class

Every capability must be reachable and scriptable from the command line, and must work headless
in CI. The CLI is the product surface, not a wrapper around one.

## Do not expand scope implicitly

v0 is slides plus narration (`decision:2`). Additional scene types, browser demos, terminal
replays, charts, captions, theming systems, and any GUI are out of scope until a decision
artifact says otherwise. If a task seems to require crossing that line, stop and record the
decision first — do not widen the boundary inside an unrelated commit.

Preserving a seam is not the same as building an abstraction. Keep future scene types possible;
do not design for them speculatively.

## Verification and commits

Before completing meaningful work:

```
npm run check    # typecheck + format check + tests
scarp doctor     # archaeology invariants
```

Commit in coherent units with messages that explain why, not just what. Reference scarp
artifacts in commit messages where relevant (`decision:4`, `dragon:1`) so the archaeology and
the history stay connected. Leave the working tree clean.
