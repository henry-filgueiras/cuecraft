import { interpolateZoom } from "d3-interpolate";

/**
 * Looking at a rectangle.
 *
 * Everything in this module is about a viewport and the things it can contain, and nothing in it
 * knows what those things *are*. That distinction was invisible while cuecraft had one composition
 * with a camera; it became the whole design when a second one arrived, because a protocol has no
 * nodes, no edges and no graph, and it wants every single decision below.
 *
 *     bounds + world       ->  a viewport that frames it        fitTo
 *     current + bounds     ->  hold, pan, or recompose          shotFor
 *     current + subject    ->  hold, or arrive properly         composedShot
 *     two viewports        ->  how long the move should take    paceOf
 *     keys + frame         ->  where the camera is now          cameraAt
 *     viewport + frame     ->  one CSS transform                viewportTransform
 *
 * The interesting entry is `shotFor`, which is decision:24: a semantic event is a *reason* to move
 * and not an obligation to, and the camera declines when the shot it is already holding does the
 * job. That policy was measured against a world and it turns out to be about frames rather than
 * about worlds — it is the reason repeated traffic between two lanes of a protocol does not make
 * the picture bounce, and nothing had to be added for that to be true.
 *
 * What stayed behind in `./world.ts` is everything that mentions a node: what bounds an event
 * wants on screen, what a chamber is, and the plan that walks a graph traversal. A second
 * composition writes its own planner and reuses every primitive here, which is the test this split
 * was made to run.
 *
 * One mature library does the part that is genuinely hard and genuinely solved.
 * **d3-interpolate**'s `interpolateZoom` is Van Wijk and Nuij's smooth-and-efficient zooming — the
 * published answer to "move a viewport between two rectangles without making anyone seasick"
 * (decision:5).
 *
 * Plain TypeScript, no Remotion import, so the whole of the geometry is unit-testable without a
 * browser.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Top-left origin, like every rectangle in a browser. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The smallest rectangle containing all of them. */

export function union(rects: readonly Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * What the camera is looking at: a centre, and how much world fits across the frame.
 *
 * Width rather than a zoom factor, because that is the coordinate `interpolateZoom` works in and
 * because it is the quantity that means something — "this much of the world is on screen".
 */
export interface Viewport {
  readonly cx: number;
  readonly cy: number;
  readonly width: number;
}

export const CAMERA = {
  /** Breathing room around whatever is being framed, as a fraction of the framed size. */
  pad: 0.34,
  /**
   * Breathing room for the reveal, which gets almost none.
   *
   * A travelling shot is padded so its subject sits in space; the wide shot's subject *is* the
   * space, and every percent of padding is a percent smaller the labels come out in the one frame
   * that has to be read whole.
   */
  revealPad: 0.035,
  /** Closest the camera will ever come. Below this a single plate fills the frame. */
  nearest: 1250,
  /**
   * Widest a *travelling* shot is allowed to be. The whole-world reveal is exempt: it is the one
   * shot that is supposed to be wider than anything the traversal showed.
   */
  widest: 2600,
  /** Frames a move may take, before the gap to the next cue is allowed to shorten it. */
  minTravel: 22,
  maxTravel: 46,
  /** The reveal is slower than any move inside the world, and deliberately so. */
  revealTravel: 130,
  /**
   * `interpolateZoom` reports a recommended duration for the path it found. Scaled into frames,
   * it makes a short hop brisk and a long traversal unhurried without anyone choosing either.
   */
  paceMsPerFrame: 26,
  /** How far outside the world the centre may wander, as a fraction of the viewport. */
  slack: 0.3,

  /* ---- what a move has to be worth, before it is made at all ---- */

  /**
   * A shot is kept if every target sits at least this far inside it, as a fraction of the frame.
   *
   * Measured, not guessed. Across v1's eleven moves the smallest comfortable margin on a shot
   * that plainly did not need recomposing was 0.18, and the tightest shot that plainly *did* was
   * clipping at -0.006. Anything in between is a judgement call, and the threshold sits nearer
   * the clipping end because a target touching the frame edge looks like an accident.
   */
  holdMargin: 0.045,
  /**
   * ...and only if the subject is at least this much of the frame.
   *
   * The whole-world opening shot contains every target perfectly and is the wrong shot for all of
   * them, because at that scale a plate is nine percent of the frame. Containment alone would
   * have held it and never dived in.
   */
  holdOccupancy: 0.21,
  /** A pan keeps the scale if the subject fits inside the frame with this much room. */
  panMargin: 0.06,
  /**
   * Beyond this, a pan across the world is not a small move and pretending otherwise is worse
   * than recomposing honestly: a long sideways slide at close range is the most nauseating shot
   * available.
   */
  maxPan: 1.15,

  /* ---- going inside something ---- */

  /**
   * How much world a chamber spans. The interior is drawn as a 1920x1080 composition scaled into
   * this, so at the portal shot it lands at roughly one composition pixel per screen pixel.
   */
  chamberWidth: 2400,
  /**
   * The chamber is framed almost exactly, so its border sits just inside the frame edge.
   *
   * That is the entire trick of the transition: the plate's own outline arrives at the edge of
   * the picture and stops there, and the viewer reads the frame as the inside of the node.
   */
  chamberPad: 0.008,
  /**
   * How long it takes to go in, and to come back out.
   *
   * Constants rather than derivations, like `revealTravel` and for the same reason: neither is a
   * traversal. A move between two concepts is paced by the distance between them because that is
   * what makes it feel like distance; going inside one covers no distance at all, and its
   * duration is a directorial choice about how long a threshold should take to cross.
   *
   * The exit is quicker than the entry. Opening something is an arrival and wants to be savoured;
   * closing it is a departure, and a slow one reads as reluctance.
   */
  enterTravel: 44,
  exitTravel: 30,
  /**
   * A beat on the way out, before the camera goes anywhere else.
   *
   * Without it the retreat runs straight into the next traversal and the node the viewer just
   * came out of is never actually seen back in its place — which is the only thing that tells
   * them where they have returned to. Six tenths of a second is enough to land it.
   */
  returnHold: 20,

  /* ---- landing on a subject, before something that is not a framing decision ---- */

  /**
   * A beat between arriving on a subject and the operation that consumes it.
   *
   * Two moments in a traversal are not followed by another shot: going *inside* a concept, and
   * pulling back off the last one. Running either straight out of the approach reads as one
   * continuous gesture — "scale this rectangle from wherever it happens to be" — rather than as
   * two things, and the composition the approach just found is never actually seen. Four tenths
   * of a second is the shortest hold that registers as a hold.
   */
  settle: 12,
  /**
   * How far off centre a subject may already sit and still count as composed, as a fraction of
   * the frame, and how far off the scale may be, as a fraction of the composed width.
   *
   * This is the hold policy again, at a tighter tolerance and against a different question.
   * `shotFor` asks "can the viewer see it?", which is the right question for a shot that is about
   * to be replaced by another shot. A composed arrival asks "is this the shot?", because what
   * follows it is a scale transition or a reveal, and both of those are read against the frame's
   * centre. So the test is proximity to the canonical framing rather than mere containment —
   * still a reason to move rather than an obligation, just a stricter one.
   */
  composedOffset: 0.05,
  composedScale: 0.15,
} as const;

/** The centre of a rectangle. */
export function centreOf(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Between two points. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** How wide a viewport has to be to hold these bounds at this aspect, with padding. */
export function fitWidth(
  bounds: Rect,
  aspect: number = 16 / 9,
  pad: number = CAMERA.pad,
): number {
  const padded = 1 + 2 * pad;
  return Math.max(bounds.width * padded, bounds.height * padded * aspect);
}

/**
 * Turn bounds into a viewport: fit, clamp the magnification, then clamp the centre.
 *
 * The centre clamp is what keeps the camera honest. Framing a plate at the far edge of the world
 * would otherwise put half the frame outside the world entirely, and empty space at the edge of a
 * space reads as a mistake rather than as an edge. `slack` allows a little of it, because none at
 * all makes the edge plates look pinned to the frame.
 */
export function fitTo(
  bounds: Rect,
  world: Rect,
  options: {
    readonly widest?: number;
    readonly aspect?: number;
    readonly pad?: number;
  } = {},
): Viewport {
  const aspect = options.aspect ?? 16 / 9;
  const widest = options.widest ?? Infinity;
  const pad = options.pad ?? CAMERA.pad;
  const wholeWorld = fitWidth(world, aspect, CAMERA.revealPad);

  const width = Math.min(
    Math.max(fitWidth(bounds, aspect, pad), CAMERA.nearest),
    Math.max(Math.min(widest, wholeWorld), CAMERA.nearest),
  );
  const height = width / aspect;

  const centre = centreOf(bounds);
  return {
    cx: clampCentre(centre.x, world.x, world.x + world.width, width),
    cy: clampCentre(centre.y, world.y, world.y + world.height, height),
    width,
  };
}

function clampCentre(value: number, low: number, high: number, extent: number): number {
  const slack = extent * CAMERA.slack;
  const min = low - slack + extent / 2;
  const max = high + slack - extent / 2;
  if (min > max) return (low + high) / 2;
  return Math.min(Math.max(value, min), max);
}

/** One camera move: where it ends, when it starts, and how long it takes to get there. */
export interface CameraKey {
  readonly frame: number;
  readonly view: Viewport;
  readonly travel: number;
}

/** What the camera decided to do about one narration event, and why it is describable. */
export type ShotKind = "hold" | "pan" | "recompose" | "enter" | "exit" | "arrive";

export interface CameraShot {
  readonly frame: number;
  readonly id: string;
  readonly kind: ShotKind;
  readonly view: Viewport;
}

/**
 * Whether the shot the camera is already holding is good enough for what was just said.
 *
 * This is the whole of decision:24, and it is three comparisons rather than an optimiser. The
 * measurement that motivated it is in the decision: of v1's eleven moves, one recomposed a target
 * that was already fully visible with comfortable margin, and three more zoomed by ten to
 * twenty-five percent to fix a framing nobody would have complained about. Each was individually
 * correct and the sequence was restless, because every shot was solved from scratch as though the
 * viewer had not been looking at anything a moment earlier.
 *
 *     hold        the target is already inside the frame, with room, at a readable size
 *     pan         it fits at this scale but not in this position — keep the scale, move the least
 *     recompose   it does not fit, or it is too small to read: solve the shot properly
 *
 * The ordering is the preference ladder, and the reason it is a ladder rather than a cost
 * function is that the three cases are perceptually different rather than differently weighted.
 * A hold costs the viewer nothing. A pan costs them tracking. A recompose costs them
 * re-orientation, and re-orientation is the one that reads as the camera being nervous.
 */
export function shotFor(
  current: Viewport,
  bounds: Rect,
  world: Rect,
  aspect: number = 16 / 9,
  /**
   * What a recomposed shot is fitted to, when the defaults are wrong for the space.
   *
   * Both defaults were measured against a world, where a subject is a plate or two floating in an
   * open field: `pad` is what stops such a subject looking pinned to the frame, and `widest` is
   * where a plate stops being readable. Neither transfers to a space whose subject is a *band* —
   * a protocol's shot already carries its own margins, because the bounds it is given include a
   * minimum span of the cast and a row of room below, so padding it again pads it twice. The hold
   * and pan tests above are unaffected either way: they are fractions of the frame that is
   * actually being held, and know nothing about how it was arrived at.
   */
  options: { readonly pad?: number; readonly widest?: number } = {},
): { readonly view: Viewport; readonly kind: "hold" | "pan" | "recompose" } {
  const held = viewRect(current, aspect);

  if (
    marginOf(bounds, held) >= CAMERA.holdMargin &&
    occupancyOf(bounds, held) >= CAMERA.holdOccupancy
  ) {
    return { view: current, kind: "hold" };
  }

  // Would it fit where we are standing, if we simply looked somewhere else?
  const room = 1 - 2 * CAMERA.panMargin;
  const fitsHere =
    bounds.width <= held.width * room && bounds.height <= held.height * room;
  if (fitsHere && occupancyOf(bounds, held) >= CAMERA.holdOccupancy) {
    const panned: Viewport = {
      cx: slideInto(current.cx, bounds.x, bounds.width, held.width),
      cy: slideInto(current.cy, bounds.y, bounds.height, held.height),
      width: current.width,
    };
    const distanceMoved =
      Math.hypot(panned.cx - current.cx, panned.cy - current.cy) / current.width;
    if (distanceMoved <= CAMERA.maxPan) return { view: panned, kind: "pan" };
  }

  return {
    view: fitTo(bounds, world, {
      aspect,
      widest: options.widest ?? CAMERA.widest,
      ...(options.pad === undefined ? {} : { pad: options.pad }),
    }),
    kind: "recompose",
  };
}

/**
 * The shot a subject gets when what happens next is not another shot.
 *
 * `shotFor` decides between three ways of *continuing* a traversal, and its preference for doing
 * nothing is what makes the camera calm. But twice in a scene the thing after the shot is not a
 * framing decision at all — the camera goes inside the subject, or it pulls back off it — and
 * both of those are read against the centre of the frame. A subject sitting a quarter of the
 * frame off to one side is perfectly visible and completely wrong for either: the expansion
 * becomes "this rectangle grows from over there" instead of "this concept opens", and the pull
 * back leaves from a destination that never landed.
 *
 * So this asks the stricter question — *is this the composition?* rather than *can it be seen?* —
 * and answers it the same way, with a hold when the answer is already yes. Off-centre and
 * off-scale are compared separately because they fail differently: a subject at the right size in
 * the wrong place needs the camera to look elsewhere, and one in the right place at the wrong
 * size needs it to move closer.
 *
 * decision:29 has the measurements that motivated it, both taken off the observatory's own frames.
 */
export function composedShot(
  current: Viewport,
  subject: Rect,
  world: Rect,
  aspect: number = 16 / 9,
): { readonly view: Viewport; readonly kind: "hold" | "arrive" } {
  const composed = fitTo(subject, world, { aspect, widest: CAMERA.widest });
  const offset = Math.max(
    Math.abs(current.cx - composed.cx) / current.width,
    Math.abs(current.cy - composed.cy) / (current.width / aspect),
  );
  const scale = Math.abs(current.width - composed.width) / composed.width;
  return offset <= CAMERA.composedOffset && scale <= CAMERA.composedScale
    ? { view: current, kind: "hold" }
    : { view: composed, kind: "arrive" };
}

/** The rectangle a viewport covers. */
export function viewRect(view: Viewport, aspect: number = 16 / 9): Rect {
  const height = view.width / aspect;
  return {
    x: view.cx - view.width / 2,
    y: view.cy - height / 2,
    width: view.width,
    height,
  };
}

/** The smallest gap between a target and the frame edge, as a fraction of the frame's width. */
export function marginOf(inner: Rect, frame: Rect): number {
  const aspect = frame.width / frame.height;
  return (
    Math.min(
      inner.x - frame.x,
      frame.x + frame.width - (inner.x + inner.width),
      (inner.y - frame.y) * aspect,
      (frame.y + frame.height - (inner.y + inner.height)) * aspect,
    ) / frame.width
  );
}

/** How much of the frame the target takes up, on whichever axis it fills more of. */
export function occupancyOf(inner: Rect, frame: Rect): number {
  return Math.max(inner.width / frame.width, inner.height / frame.height);
}

/** Move a centre the least distance that brings `[low, low + extent]` inside the frame. */
function slideInto(centre: number, low: number, extent: number, frame: number): number {
  const gap = frame * CAMERA.panMargin;
  const min = low + extent - frame / 2 + gap;
  const max = low + frame / 2 - gap;
  if (min > max) return low + extent / 2;
  return Math.min(Math.max(centre, min), max);
}

/**
 * How long a move should take, asked of the thing that found the path.
 *
 * `interpolateZoom` reports the duration its own path would want at a constant perceived
 * velocity. Dividing by a constant turns that into frames: a hop between neighbours comes out
 * brisk, a traversal across the world comes out unhurried, and no one chose either number.
 */
export function paceOf(from: Viewport, to: Viewport, low: number, high: number): number {
  const interpolator = interpolateZoom(
    [from.cx, from.cy, from.width],
    [to.cx, to.cy, to.width],
  );
  const frames = Math.round(interpolator.duration / CAMERA.paceMsPerFrame);
  return Math.min(Math.max(frames, low), high);
}

/**
 * Where the camera is on this frame.
 *
 * The path between two stops is `interpolateZoom`'s; the *timing* along it is smootherstep,
 * Perlin's second-order smooth step, which has zero first and second derivative at both ends.
 * A camera that starts and stops with zero acceleration reads as a camera operator; anything
 * with an overshoot reads as a plugin.
 */
export function cameraAt(track: readonly CameraKey[], frame: number): Viewport {
  const first = track[0];
  if (first === undefined) return { cx: 0, cy: 0, width: 1 };

  let index = 0;
  for (let candidate = 0; candidate < track.length; candidate += 1) {
    if ((track[candidate] as CameraKey).frame <= frame) index = candidate;
  }

  const key = track[index] as CameraKey;
  if (index === 0) return key.view;

  const previous = (track[index - 1] as CameraKey).view;
  const progress = smootherstep((frame - key.frame) / key.travel);
  const [cx, cy, width] = interpolateZoom(
    [previous.cx, previous.cy, previous.width],
    [key.view.cx, key.view.cy, key.view.width],
  )(progress);
  return { cx, cy, width };
}

/**
 * The viewport, as the one CSS transform that puts the world behind it.
 *
 * World point `p` lands at `(p - centre) * scale + half the frame`, which composes to a single
 * `translate` then `scale` about the origin. Here rather than inline in the composition because
 * it is the step where a sign error is invisible in code and obvious on screen, and because the
 * `parallax` factor — the background field moving at a fraction of the rate — has to be the same
 * arithmetic or the two layers drift apart.
 */
export function viewportTransform(
  view: Viewport,
  frame: { readonly width: number; readonly height: number },
  parallax: number = 1,
): { readonly scale: number; readonly x: number; readonly y: number } {
  const scale = (frame.width / view.width) * parallax;
  return {
    scale,
    x: frame.width / 2 - view.cx * scale,
    y: frame.height / 2 - view.cy * scale,
  };
}

export function smootherstep(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * t * (t * (t * 6 - 15) + 10);
}
