/**
 * Where a population sits, and how much of it has happened.
 *
 * Two derivations, both pure, neither reachable from the source. The author says *how many*; this
 * decides what that looks like — and it decides it from the count alone, so the same rule that
 * puts sixty-four members in an eight-by-eight field also handles one, seven, forty-eight, ninety,
 * and the ceiling.
 *
 * Plain TypeScript, no Remotion import, so the whole of it is unit-testable without a browser —
 * the same constraint `layout.ts`, `anchor.ts`, `projection.ts` and `world.ts` work under.
 *
 * Nothing here knows what a member is for.
 */

/**
 * The shape a field wants to be, as width over height.
 *
 * Not the frame's shape, which is 16:9 and much wider. A population is easiest to *count* when it
 * is nearly square, because a viewer counts one row and multiplies — a long strip has to be
 * counted along, and a tall column reads as a list. Slightly wider than tall because the eye scans
 * horizontally and because the frame gives width away more cheaply than height.
 *
 * This is the same kind of constant as `WORLD.plateAspect`: a claim about what a shape is for,
 * applied to whatever the content turns out to be.
 */
const FIELD_ASPECT = 1.35;

/**
 * How much a cell of unused space costs, against being the wrong shape.
 *
 * A field is *countable* when its rows are full, because a ragged last row is the one thing that
 * makes "eight times eight" stop being obvious. So waste is expensive: at four, sixty-four takes
 * the exactly-square eight-by-eight rather than the better-proportioned ten-by-seven that would
 * leave six holes, and ninety takes ten-by-nine rather than anything squarer.
 */
const WASTE_WEIGHT = 4;

export interface FieldShape {
  readonly columns: number;
  readonly rows: number;
}

/**
 * The arrangement for a population of `total`.
 *
 * Searched rather than computed, because the search space is small, the answer is exact, and the
 * cost function is the thing worth reading: be near the shape a field wants to be, and do not
 * leave holes. Ties go to fewer columns, so the choice is deterministic.
 */
export function fieldShape(total: number): FieldShape {
  const members = Math.max(1, Math.floor(total));
  let best: { shape: FieldShape; cost: number } | undefined;

  for (let columns = 1; columns <= members; columns += 1) {
    const rows = Math.ceil(members / columns);
    const proportion = Math.abs(Math.log(columns / rows) - Math.log(FIELD_ASPECT));
    const waste = (columns * rows - members) / members;
    const cost = proportion + WASTE_WEIGHT * waste;
    if (best === undefined || cost < best.cost) best = { shape: { columns, rows }, cost };
  }

  return best?.shape ?? { columns: 1, rows: 1 };
}

/**
 * How far into a member the accumulation has got, 0 to 1.
 *
 * A frontier rather than a switch: the member the fill is currently passing is part way in, so a
 * field accumulating over four seconds reads as a wave crossing it rather than as sixty-four
 * separate pops. Members behind the frontier are complete and stay complete — the same
 * monotonicity `degree` has in `anchor.ts`, for the same reason.
 */
export function memberFill(index: number, total: number, progress: number): number {
  if (progress >= 1) return 1;
  if (progress <= 0) return 0;
  return clamp01(progress * total - index);
}

/**
 * How many members are done, for the running count on screen.
 *
 * Floored, so the number never claims a member the field has not finished drawing, and clamped so
 * that a completed series reads exactly its own size rather than one less through a rounding
 * accident.
 */
export function membersDone(total: number, progress: number): number {
  if (progress >= 1) return total;
  if (progress <= 0) return 0;
  return Math.min(total, Math.floor(progress * total));
}

/**
 * The largest cell that fits the arrangement in the space available, and the gap around it.
 *
 * The one place the *frame's* shape enters: the arrangement comes from the count, and the size
 * comes from the box it has to live in. Whichever of width and height binds, binds.
 */
export function cellSize(
  shape: FieldShape,
  box: { readonly width: number; readonly height: number },
  gapRatio = 0.22,
): { readonly cell: number; readonly gap: number } {
  const pitchX = box.width / Math.max(1, shape.columns);
  const pitchY = box.height / Math.max(1, shape.rows);
  const pitch = Math.max(1, Math.min(pitchX, pitchY));
  const gap = pitch * (gapRatio / (1 + gapRatio));
  return { cell: pitch - gap, gap };
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
