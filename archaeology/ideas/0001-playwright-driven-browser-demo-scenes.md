---
id: ide_01KZA2RZJCB9AQG9MG1NBAQJGK
sequence: 1
kind: idea
status: parked
created: 2026-08-05
---

# Playwright-driven browser demo scenes

## Problem

Software presentations frequently need to show the software. A bullet describing a UI is weaker
than the UI. Today that means recording a screen capture externally — which loses every property
that makes cuecraft interesting: diffability, regeneration, and narration-derived timing.

## Sketch

A `demo` scene type driven by Playwright. The source names a URL and a scripted sequence of
interactions (navigate, click, type, wait, focus an element); the compiler drives a headless
browser, captures the result, and composes it as a scene with narration timed alongside.

Because the script addresses the page semantically, focus/zoom/spotlight effects could be
derived from DOM selectors rather than pixel coordinates — which is the version of this idea
worth wanting, and the one a screen recorder cannot give us.

## Boundaries

Not v0 (decision:2). It needs deterministic capture, a frame/audio synchronization story, and a
failure model for flaky pages — none of which the slide probe requires. It should not influence
v0 code beyond keeping the scene list open to more than one scene type (idea:3).

## Evidence

Adopt if the slide-and-narration probe succeeds and the first real presentations are
demonstrably weakened by the inability to show a running product.
