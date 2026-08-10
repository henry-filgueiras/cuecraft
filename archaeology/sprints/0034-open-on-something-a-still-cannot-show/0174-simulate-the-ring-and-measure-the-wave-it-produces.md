---
id: tsk_01KZMPQ0P222M9Y0WBMBC9PRCS
sequence: 174
kind: task
status: closed
sprint: spr_01KZMPN6YTF45B7CDBMHDJNBWT
created: 2026-08-09
closed: 2026-08-09
---

# Simulate the ring, and measure the wave it produces

## Objective

Simulate the Sugiyama ring experiment for real, before anything is drawn: twenty-two cars on a
230-metre single-lane loop, a car-following model, one instruction to hold thirty kilometres an
hour, and a perturbation small enough that it is fair to call it nothing.

The output of this task is a run recorded as data — every car's position and speed at every step —
and the measurements taken off it. Drawing is the next task's problem, for the reason
`examples/kmeans/kmeans.R` separates them: the animation must be a *reading* of the run rather
than a second computation of it.

## Acceptance criteria

- `examples/phantom/ring.R` records a full run in base R with a fixed seed: optimal-velocity or
  intelligent-driver following, published parameters cited in the file's header comment, and no
  scripted event — no car is told to brake.
- A uniform ring is a fixed point of the model, and the run starts within a hair of it. The wave
  must emerge from the instability, not from the initial condition. Verified by a second run from a
  perfectly uniform state that stays uniform.
- The backwards propagation speed of the jam is **measured from the recorded run** and lands in the
  literature's range (~15-20 km/h). If it does not, the model or the parameters are wrong and get
  fixed; the number is never narrated around.
- The run reaches, in order, four states worth naming: even flow, the first visible compression, a
  car actually stopped, and a stable travelling wave.
- Deterministic: two runs produce identical output.
