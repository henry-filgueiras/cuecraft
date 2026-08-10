---
id: drg_01KZMS58ATSY17CN9VMW8K6K1Z
sequence: 42
kind: dragon
status: open
created: 2026-08-09
---

# The wave is slower than the experiment it reproduces

## Context

`examples/phantom/model.R` produces a jam that travels backwards at about twelve kilometres an
hour. Sugiyama et al. (2008), the experiment it reproduces, report about twenty; motorway
observations put stop-and-go waves between fifteen and twenty. The sign is right, the persistence
is right, the order of magnitude is right, and the number is thirty to forty per cent low.

sprint:34 tried to close that gap and could not, and the shape of the failure is the interesting
part.

## Question

Is the twelve kilometres an hour a defect in the model, a different measurement from the published
one, or the right answer for these parameters?

## Constraints

The wave's speed is roughly the jam's spacing divided by the time it takes a stopped car to move
after the car in front of it does. Both were pushed:

- **Larger standstill spacing** (`MIN_GAP` 1.5 -> 3.0 m) raises the speed, and simultaneously
  drives the desired free speed the equilibrium requires up towards fifty kilometres an hour,
  which is no longer a plausible thing to ask of a driver on a two-hundred-metre track.
- **Faster start-up** (`ACCEL` 1.6 -> 3.2 m/s^2) raises it further, and past about 2.5 m/s^2 the
  ring stops producing **one** jam and starts producing three to nine. Multiple clusters are not
  a faster wave; they are a different phenomenon, and they make the measurement meaningless — the
  circular mean of "where the slowness is" jumps between clusters and reports sixty or ninety-five
  kilometres an hour, which is nonsense of a kind that would have been easy to ship.

Across every parameter set that produced a single jam, no collision, and a plausible free speed,
the answer was between 10.7 and 15.5 km/h, clustered near 13. It is a robust property of this
model at this density, not a tuning artifact.

## Candidate direction

Three explanations, and this round cannot distinguish them:

1. **The model is missing something.** IDM with a fixed reaction delay is not what a human driver
   is. Real start-up waves involve variation between drivers, and a ring of twenty-two identical
   drivers may genuinely relax more slowly than twenty-two different ones.
2. **The published number is not the same measurement.** "About 20 km/h" is quoted for the
   propagation of the jam; this measures the weighted centre of slowness over the settled window.
   Those may not be the same quantity, and the formation phase in this run *does* propagate
   through the cast much faster — about one car every 0.62 seconds, which if read as a ground
   speed would be far too high.
3. **It is right.** The parameters are not fitted to the experiment's vehicles and the track's
   drivers, and twelve is what these ones give.

### What was done about it meanwhile

Nothing was fudged. The deck says "about twelve kilometres an hour", which is the measured value,
and does not claim agreement with the literature. That is the right default — sha256 verifies
against `node:crypto` rather than against a number somebody typed — but it does leave the
showpiece quietly weaker than it could be, because "and that is what is measured on real
motorways" is a sentence the slide would like to be able to say and currently cannot.

## Resolution criteria

Either a defensible parameter set that gives a single jam near twenty, or a measurement of the
published quantity that shows the two figures are not comparable. Related: `dragon:41`.
