import type { Point, Rect } from "./camera.ts";

/**
 * Drawing a route between two boxes.
 *
 * Everything here is about a sequence of points and the rectangles at its ends, and nothing in it
 * knows what those rectangles *are*. That distinction was invisible while cuecraft had one
 * composition with a routed graph in it; it became a module when a second one arrived and wanted
 * every line below and none of the meaning around them.
 *
 *     points + two boxes   ->  a route that starts at an edge      trimToBoxes
 *     points               ->  an SVG path, rounded at the bends   smoothPath
 *     points               ->  how long it is                      polylineLength
 *     box + a direction    ->  where a ray leaves it               exitPoint
 *
 * This is decision:36's rule applied a second time, and applied the same way: nothing was made
 * generic, nothing gained a strategy object, and the split happened *because* a second caller
 * demonstrated the sharing rather than in anticipation of one. `./world.ts` re-exports the two
 * names it published, so no existing importer changed and the history of what used to live there
 * stays legible.
 *
 * What deliberately did **not** move is anything that mentions a node, an entity, a state or a
 * transition. A world trims an edge to two plates; a machine trims one to two plates *and* has to
 * decide what a self-loop looks like, which is not a fact about polylines. Putting both behind one
 * signature would have produced a parameter nobody could name.
 *
 * Plain TypeScript, no Remotion import, so all of it is unit-testable without a browser.
 */

/** Where the segment from a box's centre towards `towards` leaves the box. */
export function exitPoint(rect: Rect, towards: Point): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = towards.x - cx;
  const dy = towards.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const scaleX = dx === 0 ? Infinity : rect.width / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Infinity : rect.height / 2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/**
 * Pull a route's ends back to the boxes it joins.
 *
 * A layout engine routes to box centres, so an undisturbed path runs underneath both of them.
 * Everything about the drawing wants the route to *start at an edge* — the dash that travels along
 * it, the arrow head, and the eye following it — so the first and last points are moved to where
 * the polyline crosses the boundary.
 */
export function trimToBoxes(
  points: readonly Point[],
  from: Rect | undefined,
  to: Rect | undefined,
): Point[] {
  const trimmed = [...points];
  if (from !== undefined && trimmed.length >= 2) {
    trimmed[0] = exitPoint(from, trimmed[1] as Point);
  }
  if (to !== undefined && trimmed.length >= 2) {
    trimmed[trimmed.length - 1] = exitPoint(to, trimmed[trimmed.length - 2] as Point);
  }
  return trimmed;
}

/**
 * A path through the routing points, rounded at the bends.
 *
 * Quadratic segments through the midpoints of the polyline, which is the standard way to round a
 * polyline without moving its ends: the curve passes through every midpoint and uses the original
 * vertices as controls, so a straight run stays straight and a corner becomes an arc.
 */
export function smoothPath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  if (first === undefined) return "";
  if (rest.length === 0) return `M ${round(first.x)} ${round(first.y)}`;
  if (rest.length === 1) {
    const only = rest[0] as Point;
    return `M ${round(first.x)} ${round(first.y)} L ${round(only.x)} ${round(only.y)}`;
  }

  let d = `M ${round(first.x)} ${round(first.y)}`;
  for (let index = 0; index < points.length - 2; index += 1) {
    const control = points[index + 1] as Point;
    const next = points[index + 2] as Point;
    const midX = (control.x + next.x) / 2;
    const midY = (control.y + next.y) / 2;
    d += ` Q ${round(control.x)} ${round(control.y)} ${round(midX)} ${round(midY)}`;
  }
  const end = points[points.length - 1] as Point;
  return `${d} L ${round(end.x)} ${round(end.y)}`;
}

/** Close enough for a dash pattern to travel along the route at an even rate. */
export function polylineLength(points: readonly Point[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] as Point;
    const current = points[index] as Point;
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
  }
  return total;
}

/** Where along a polyline a fraction of its length falls. */
export function pointAlong(points: readonly Point[], progress: number): Point {
  const first = points[0];
  if (first === undefined) return { x: 0, y: 0 };
  if (points.length === 1) return first;

  const target = polylineLength(points) * Math.min(Math.max(progress, 0), 1);
  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] as Point;
    const current = points[index] as Point;
    const segment = Math.hypot(current.x - previous.x, current.y - previous.y);
    if (segment === 0) continue;
    if (walked + segment >= target) {
      const t = (target - walked) / segment;
      return {
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
      };
    }
    walked += segment;
  }
  return points[points.length - 1] as Point;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
