---
id: ide_01KZA6T62HQTAB63VNC6RKET7J
sequence: 4
kind: idea
status: parked
created: 2026-08-05
---

# A resident local inference daemon

## Problem

Loading Kokoro's ONNX graph costs about 0.29 seconds and 325 MB of resident memory. A one-shot
CLI pays that on every invocation, which is the classic argument for keeping a model resident in
a long-lived process and talking to it over HTTP or a socket — the shape most local-inference
projects converge on.

## Sketch

A `cuecraft ttsd` daemon holding the model, with synthesis requests arriving over a Unix socket
as JSON and WAV bytes coming back. The compiler would connect on demand and start the daemon if
absent.

## Boundaries

Not built, because the measurements say the problem is imaginary at this scale. Model load is
0.29s against a warm synthesis of 0.40s for a 3.67-second line — and within one compiler run the
model is already loaded exactly once, since the runtime is cached for the life of the process. A
presentation with thirty narration lines pays 0.29s of load in total, not thirty times.

A daemon would buy back that fraction of a second and cost a process lifecycle, a socket
protocol, a stale-model failure mode, and a piece of infrastructure that must be shut down
correctly in CI. decision:8 chose an in-process boundary precisely to avoid that.

It would also undermine the CLI-first constraint: a capability that needs a background service
running is not straightforwardly scriptable.

## Evidence

Revisit if a real measurement shows load time dominating a real compile — most plausibly if a
future scene type needs synthesis interleaved with rendering in separate processes, or if the
model grows by an order of magnitude. Until then this is optimizing a rounding error.
