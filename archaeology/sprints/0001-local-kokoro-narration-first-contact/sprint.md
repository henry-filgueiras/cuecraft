---
id: spr_01KZA66KVXZF819AWX0PB977SM
sequence: 1
kind: sprint
status: closed
created: 2026-08-05
closed: 2026-08-05
---

# Local Kokoro narration first contact

## Goal

Prove that cuecraft's TypeScript process can synthesize speech on the developer's own machine,
with no API credentials and no network call at inference time, and that a fresh developer can
reproduce that state from one bootstrap command.

The hero result is deliberately unimpressive: TypeScript in, `hello.wav` out.

## Rationale

decision:4 put speech synthesis behind a narrow provider interface and named OpenAI as the first
implementation. That was the right call for getting narration at all, but it makes every
iteration of the compiler cost money, require a credential, and depend on someone else's uptime.
Narration is on the critical path for timing (dragon:1), so the inner loop of this project is
"synthesize, listen, adjust" — exactly the loop a metered remote API punishes.

A local model changes the economics of the probe before the probe has started. It is also the
cheapest moment to establish where model artifacts live and who owns them, because nothing yet
depends on the answer.

## Success criteria

- One documented command bootstraps the local TTS stack on a clean, compatible macOS machine.
- Bootstrap is safe to rerun, verifies what it downloads, and fails loudly rather than partially.
- Model and voice artifacts are pinned to immutable revisions and never enter Git.
- TypeScript initiates synthesis and receives a valid 24 kHz mono WAV of nonzero duration.
- Inference performs no network I/O; unplugging the machine does not change the result.
- The ordinary unit suite still runs without the model present.
- The mechanics — what was installed, what executes, what came from where — are legible from the
  archaeology rather than from reading `node_modules`.

## Non-goals

Everything downstream of "the laptop can talk": presentation YAML, slide rendering, Remotion,
timelines, content-addressed narration caching, `freeze`, remote providers, and any speech
markup. decision:2 and decision:6 already draw those lines; this sprint does not move them.

Also not a goal: a general benchmarking harness. Numbers are recorded once, by hand, to size the
problem — not to be tracked over time.
