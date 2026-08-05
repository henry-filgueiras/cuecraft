---
id: dec_01KZA3MMMYV994XZBG2WMFYE6Z
sequence: 7
kind: decision
status: accepted
created: 2026-08-05
---

# Observe development with WitnessGlass without depending on it

## Context

Development on cuecraft is observed by [WitnessGlass](https://github.com/henry-filgueiras/witnessglass),
a flight recorder for coding agents. It records what Claude did in this repository — session
boundaries, tool requests, completions, failures — as an append-only NDJSON stream.

The relationship is one-directional and easy to get wrong:

```
WitnessGlass  observes→  Claude  modifies→  cuecraft
```

WitnessGlass observes the agent, not the project. It is not a build tool, not a runtime
dependency, and not something a contributor needs in order to build a presentation. A clone of
this repository must compile without it and must record nothing by default.

The tempting shortcuts all create a dependency that does not exist: vendoring the WitnessGlass
source, adding a Git submodule because it is not yet published to crates.io, or committing hook
configuration that points at a path only one machine has.

## Decision

Instrument sessions through configuration only, and keep every trace of it out of the build.

1. **The tool is installed, not vendored.** WitnessGlass is a separately installed developer
   binary on `PATH` (today `cargo install --path <checkout> --locked`; eventually
   `cargo install witnessglass`). No submodule, no vendored source, no entry in `package.json`.
2. **Hooks live in `.claude/settings.local.json`, which is untracked.** Claude Code's exec-form
   hooks resolve `command` on `PATH`, so the configuration names `witnessglass` and never an
   absolute path. Observation is per-developer and opt-in; nothing is committed that would arm a
   clone.
3. **Recordings are projections, and they are the strictest kind.** `.witnessglass/` is
   gitignored. It is generated, always safe to delete, never hand-edited, and — unlike the
   narration cache — never promotable to source: a recording is unredacted session evidence that
   can contain prompts, source, command output, and credentials.
4. **Absence of instrumentation is never an error.** No cuecraft script, check, or code path may
   detect, require, or read `.witnessglass/`.

## Consequences

- `npm run check` and every other build path are unchanged by arming or disarming. Instrumentation
  is invisible to the compiler.
- Arming is manual today: WitnessGlass's `scripts/arm.sh` is bound to its own checkout and has no
  concept of an external repository, so this repository's hook configuration was written directly.
  That gap belongs to WitnessGlass, not here — cuecraft must not grow scripts to compensate for it.
- Recordings accumulate in `.witnessglass/recordings/<session-id>.ndjson` and are pruned by
  deleting them. Nothing in cuecraft manages their lifecycle.
- A recording does not currently identify which repository or which WitnessGlass revision produced
  it, so the link between a recording and the commits it explains is held outside the recording.
  This is a WitnessGlass limitation and is recorded here only because it bounds what a cuecraft
  reader can later ask of one.
- This decision covers observation only. It grants nothing to WitnessGlass over cuecraft's source
  or projections (decision:3) and does not widen v0's scope (decision:2).
