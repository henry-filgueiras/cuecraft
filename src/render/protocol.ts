import type { AuthoredActor, AuthoredStep } from "../presentation/protocol.ts";
import type { SlideBody } from "../presentation/body.ts";
import {
  CAMERA,
  fitTo,
  paceOf,
  shotFor,
  union,
  type CameraKey,
  type CameraShot,
  type Rect,
  type Viewport,
} from "./camera.ts";
import { allocateLanes, type LaneAllocation, type Tenancy } from "./tenancy.ts";
import { TRANSCRIPT } from "./theme.ts";
import { wrapLabel } from "./world.ts";

/**
 * Where an exchange sits, and where the camera looks at one.
 *
 * The same two derivations the atlas has, against a space whose axes mean something:
 *
 *     actors               ->  lanes            x is *who*, and never changes
 *     steps                ->  rows             y is *when*, and only ever increases
 *     steps                ->  replies          derived from the call stack the order implies
 *     layout + beats       ->  camera keys      a viewport per step
 *
 * **The layout needs no engine.** A world has adjacency and no order, which is a genuine layout
 * problem and is why `./world.ts` calls dagre. A protocol has an order and no adjacency: the lanes
 * are the cast in the sequence they were written, and the rows are the steps in the sequence they
 * were written. Both coordinates are already in the source. Reaching for a solver here would be
 * inventing a problem in order to have something to solve — and worse, it would let an actor move
 * between two renderings of the same protocol, destroying the one thing this notation gives a
 * viewer for nothing, which is that a party stays where it was put.
 *
 * **What is genuinely derived** is everything the author did not write down: how wide a lane is,
 * how tall a row is, how a label wraps, which messages are *replies*, which actor is holding an
 * unanswered call at any moment, and where the camera stands. None of it is reachable from the
 * source and none of it has a key.
 *
 * Plain TypeScript, no Remotion import, so the whole geometry is unit-testable without a browser.
 */

export interface Lane {
  readonly id: string;
  readonly label: string;
  /** The name, broken to the measure a lane plate is set at. */
  readonly lines: readonly string[];
  /** Centre x in world coordinates: the lifeline. */
  readonly x: number;
  readonly plate: Rect;
  /**
   * Declaration order, and *not* the column.
   *
   * These were the same number until `./tenancy.ts` came along, and prising them apart is the
   * round's main structural result: an actor's **identity** is what a prologue reaches by name and
   * what the anchor model addresses, and its **slot** is where the picture happens to put it. The
   * first is the author's; the second is the compiler's, and the compiler is now allowed to give
   * the same one to two actors that are never alive at the same time.
   */
  readonly index: number;
  /** The physical column, and which turn in it — 0 is the tenant the film opens with. */
  readonly slot: number;
  readonly ordinal: number;
  /** The steps this actor is live for, inclusive. */
  readonly first: number;
  readonly last: number;
  /** The stretch of world this lane's lifeline is drawn over: its tenancy, not its lifetime. */
  readonly lifelineTop: number;
  readonly lifelineBottom: number;
  /**
   * Whether this lifeline ends because the column changes hands, rather than because the film does.
   *
   * The terminator is a fact about the **slot** and never about the actor. "This column stops being
   * this party" is something the layout knows for certain; "this party is finished" is a claim
   * about the protocol, and an actor that keeps its column to the end keeps its lifeline to the end
   * rather than being quietly declared dead at its last message. It is also why
   * `examples/tap.yaml`, which reclaims nothing, draws exactly what it drew before.
   */
  readonly handsOver: boolean;
  /**
   * Where this lane sits across the cast, 0 at the left and 1 at the right.
   *
   * The atlas reads its colour off the *flow*, which is a fact about a graph. A protocol has no
   * flow, so this reads it off position instead — which turns hue into a second, redundant
   * encoding of the one thing the composition most needs a viewer to hold on to. Two lanes far
   * apart are far apart in colour as well as in space, and an arrow between them carries the
   * sender's.
   *
   * It is a fact about the **column**, so two tenants of one column share a hue. That is deliberate
   * and it is the weaker half of the handover notation: hue answers "who sent this arrow whose tail
   * is off the frame", which is a question about the present, and no two tenants are ever present
   * together. What it cannot do is distinguish them in memory, which is what the terminator, the
   * arrival plate and the rail are for.
   */
  readonly depth: number;
}

export interface Message {
  readonly index: number;
  readonly from: string;
  readonly to: string;
  /** The label, wrapped to the measure this arrow affords. */
  readonly lines: readonly string[];
  /** Where the arrow is drawn: from `x1` to `x2` at `y`. */
  readonly y: number;
  readonly x1: number;
  readonly x2: number;
  /** An actor talking to itself, drawn as a hook rather than a zero-length arrow. */
  readonly self: boolean;
  /**
   * A message that answers the last unanswered one. Derived, never authored — see `readReplies`.
   */
  readonly reply: boolean;
  /** Where the label sits, already positioned. */
  readonly label: Rect;
  /** Everything this row occupies: the label, the arrow, and a self-message's drop. */
  readonly band: Rect;
}

/**
 * A stretch during which one actor is holding a call it has not answered.
 *
 * Standard notation, and here it costs nothing extra: the same stack pass that decides which
 * messages are replies already knows exactly this. It is the one piece of the picture that says
 * *where the work currently is* rather than what just moved, which is the question a viewer of a
 * protocol is actually asking half the time.
 */
export interface Activation {
  readonly lane: string;
  readonly y: number;
  readonly height: number;
  /** How many unanswered calls are already open. Nested bars step sideways rather than overlap. */
  readonly depth: number;
  /** The steps that opened and closed it, so the bar can grow at the rate the film runs. */
  readonly from: number;
  readonly to: number | undefined;
}

export interface ProtocolLayout {
  /** Every actor, in declaration order — so `lanes[i].index === i`, whatever column it holds. */
  readonly lanes: readonly Lane[];
  readonly byId: ReadonlyMap<string, Lane>;
  /** Who holds each column, earliest first. `bySlot[s]` has more than one entry only on a reuse. */
  readonly bySlot: readonly (readonly Lane[])[];
  readonly allocation: LaneAllocation;
  readonly messages: readonly Message[];
  readonly activations: readonly Activation[];
  /** Everything: plates, lifelines, labels, arrows. */
  readonly bounds: Rect;
  /**
   * The opening row of plates — the establishing shot's subject.
   *
   * The **first** tenant of every column, which is the same thing as "every actor" whenever nothing
   * is reclaimed. A later tenant is not part of the establishing shot on purpose: it has not
   * arrived yet, and a cast row containing a party the exchange will not reach for forty seconds is
   * the cost this round exists to stop paying.
   */
  readonly cast: Rect;
  readonly lanePitch: number;
  readonly lifelineTop: number;
  readonly lifelineBottom: number;
}

/** The protocol of a slide body, or nothing if the slide is not one. */
export function protocolOf(
  body: SlideBody,
): { actors: readonly AuthoredActor[]; steps: readonly AuthoredStep[] } | undefined {
  return body.kind === "protocol"
    ? { actors: body.actors, steps: body.steps }
    : undefined;
}

/* ----------------------------------------------------------------- layout */

/**
 * Lay the whole exchange out, once.
 *
 * Once is load-bearing here for the same reason it is in a world: every frame reads the same
 * coordinates, so what the viewer is watching is a place the camera moves through rather than a
 * sequence of diagrams that happen to resemble each other.
 */
export function layoutProtocol(protocol: {
  actors: readonly AuthoredActor[];
  steps: readonly AuthoredStep[];
}): ProtocolLayout {
  // Which column each actor holds, decided offline and never revised. See `./tenancy.ts` — nothing
  // below may consult a frame, and nothing below may move an actor.
  const allocation = allocateLanes(protocol.actors, protocol.steps);

  const plates = protocol.actors.map((actor) => {
    const lines = wrapLabel(actor.text, TRANSCRIPT.actorMaxLines);
    return { actor, lines, size: plateSize(lines) };
  });

  // One pitch for the whole cast, still measured over every actor and not merely the ones in the
  // opening row: a party that arrives on row fourteen has to fit its column too, and a pitch that
  // widened when it got there would be the lanes moving by another name.
  const lanePitch =
    Math.max(...plates.map((plate) => plate.size.width)) + TRANSCRIPT.laneGap;
  const plateHeight = Math.max(...plates.map((plate) => plate.size.height));
  const xOf = (id: string): number =>
    (allocation.byActor.get(id) as Tenancy).slot * lanePitch;

  // Where a column changes hands, keyed by the row the incoming actor arrives on. A handover gets
  // **reserved vertical room of its own**, so an arrival plate can never land on a crossing arrow
  // or somebody else's label — the collision policy for a plate dropped into the middle of the
  // traffic is to make sure there is no traffic there.
  const arrivals = new Map<number, Tenancy[]>();
  for (const tenancy of allocation.tenancies) {
    if (tenancy.ordinal === 0) continue;
    arrivals.set(tenancy.first, [...(arrivals.get(tenancy.first) ?? []), tenancy]);
  }
  const entrances = new Map<number, number>();

  const replies = readReplies(protocol.steps);

  const lifelineTop = plateHeight;
  let cursor = lifelineTop + TRANSCRIPT.headroom;
  const messages = protocol.steps.map((step, index): Message => {
    const self = step.from === step.to;
    const sourceX = xOf(step.from);
    const targetX = xOf(step.to);

    // The reserved band, if anybody takes possession of a column on this row. `headroom` is used
    // at both ends of it because that is already the name for "room between a plate and the first
    // message under it" — an arrival is the cast row happening again, later and for one party.
    const bandTop = cursor;
    if (arrivals.has(index)) {
      const plateTop = cursor + TRANSCRIPT.headroom;
      entrances.set(index, plateTop);
      cursor = plateTop + plateHeight + TRANSCRIPT.headroom;
    }

    const measure = measureFor(sourceX, targetX, self, lanePitch);
    const lines = wrapToMeasure(step.message, measure);
    const labelHeight = lines.length * TRANSCRIPT.message * TRANSCRIPT.messageLineHeight;
    const labelWidth = Math.max(...lines.map(textWidth));

    // A self-message's label hangs *beside* the hook rather than above the arrow, and level with
    // it: the hook is a shape with a middle, and a caption floating over its top edge reads as
    // belonging to whatever is above. Everything else centres its label on the arrow it names.
    const labelTop = cursor;
    const drop = self ? TRANSCRIPT.selfDrop : 0;
    const y = self
      ? labelTop + TRANSCRIPT.messageGap
      : labelTop + labelHeight + TRANSCRIPT.messageGap;
    const label = {
      x: self
        ? sourceX + TRANSCRIPT.selfWidth + TRANSCRIPT.messageGap
        : (sourceX + targetX) / 2 - labelWidth / 2,
      y: self ? y + drop / 2 - labelHeight / 2 : labelTop,
      width: labelWidth,
      height: labelHeight,
    };

    const left = Math.min(sourceX, targetX, label.x);
    const right = Math.max(
      sourceX,
      targetX,
      label.x + label.width,
      self ? sourceX + TRANSCRIPT.selfWidth : -Infinity,
    );
    // The reserved band belongs to the row it precedes, so the camera frames an arrival with the
    // message that caused it rather than scrolling past an introduction.
    const band = {
      x: left,
      y: bandTop,
      width: right - left,
      height: Math.max(y + drop, label.y + label.height) - bandTop,
    };

    const occupied = band.y + band.height - labelTop;
    cursor = labelTop + Math.max(TRANSCRIPT.rowMin, occupied + TRANSCRIPT.rowGap);

    return {
      index,
      from: step.from,
      to: step.to,
      lines,
      y,
      x1: sourceX,
      x2: targetX,
      self,
      reply: replies.reply[index] ?? false,
      label,
      band,
    };
  });

  const lifelineBottom = (messages.at(-1)?.band.y ?? lifelineTop) + TRANSCRIPT.tail;

  const lanes = plates.map((plate, index): Lane => {
    const tenancy = allocation.byActor.get(plate.actor.id) as Tenancy;
    const x = tenancy.slot * lanePitch;
    const held = allocation.bySlot[tenancy.slot] as readonly Tenancy[];
    const successor = held[tenancy.ordinal + 1];

    // A first tenant has held its column since before the film began, so its plate is in the cast
    // row and nothing needs establishing. A later one takes possession where the previous tenant
    // let go, and its plate is drawn there.
    const plateTop = tenancy.ordinal === 0 ? 0 : (entrances.get(tenancy.first) as number);
    const top = tenancy.ordinal === 0 ? lifelineTop : plateTop + plateHeight;
    // The outgoing lifeline stops halfway up the room reserved for its successor's plate, so the
    // terminator and the new name are one legible event rather than two things that happen to be
    // in the same column.
    const bottom =
      successor === undefined
        ? lifelineBottom
        : (entrances.get(successor.first) as number) - TRANSCRIPT.headroom / 2;

    return {
      id: plate.actor.id,
      label: plate.actor.text,
      lines: plate.lines,
      x,
      plate: {
        x: x - plate.size.width / 2,
        y: plateTop + (plateHeight - plate.size.height) / 2,
        width: plate.size.width,
        height: plate.size.height,
      },
      index,
      slot: tenancy.slot,
      ordinal: tenancy.ordinal,
      first: tenancy.first,
      last: tenancy.last,
      lifelineTop: top,
      lifelineBottom: bottom,
      handsOver: successor !== undefined,
      depth: allocation.slots <= 1 ? 0 : tenancy.slot / (allocation.slots - 1),
    };
  });
  const byId = new Map(lanes.map((lane) => [lane.id, lane] as const));
  const bySlot = allocation.bySlot.map((held) =>
    held.map((tenancy) => byId.get(tenancy.id) as Lane),
  );

  const activations = replies.calls.map((call): Activation => {
    const opened = messages[call.from] as Message;
    const closed = call.to === undefined ? undefined : (messages[call.to] as Message);
    return {
      lane: call.lane,
      y: opened.y,
      height: (closed?.y ?? lifelineBottom) - opened.y,
      depth: call.depth,
      from: call.from,
      to: call.to,
    };
  });

  const cast = union(
    lanes.filter((lane) => lane.ordinal === 0).map((lane) => lane.plate),
  );
  const bounds = union([
    cast,
    ...lanes.map((lane) => lane.plate),
    ...messages.map((message) => message.band),
    // The lifelines themselves, so the space does not end at the last label.
    {
      x: cast.x,
      y: lifelineTop,
      width: cast.width,
      height: lifelineBottom - lifelineTop,
    },
  ]);

  return {
    lanes,
    byId,
    bySlot,
    allocation,
    messages,
    activations,
    bounds,
    cast,
    lanePitch,
    lifelineTop,
    lifelineBottom,
  };
}

function plateSize(lines: readonly string[]): { width: number; height: number } {
  const widest = Math.max(
    ...lines.map(
      (line) => line.length * TRANSCRIPT.actor * TRANSCRIPT.actorLineHeight * 0.47,
    ),
  );
  return {
    width: Math.max(
      TRANSCRIPT.actorMinWidth,
      Math.ceil(widest + 2 * TRANSCRIPT.actorPadX),
    ),
    height: Math.ceil(
      lines.length * TRANSCRIPT.actor * TRANSCRIPT.actorLineHeight +
        2 * TRANSCRIPT.actorPadY,
    ),
  };
}

/** Advance width of a message label, estimated the way every other measure here is. */
function textWidth(line: string): number {
  return line.length * TRANSCRIPT.message * 0.53;
}

/**
 * The measure a label is wrapped to.
 *
 * Derived from the arrow, which is the only honest input: the distance between two lanes is a fact
 * about the protocol, so a message between neighbours gets a narrow column and one across the cast
 * gets a wide one. `labelOverhang` lets it spill a little way into the lane gap either side —
 * without it, a two-word label between adjacent lanes wraps for no reason — and
 * `labelMinMeasure` is the floor, so a very close pair still gets a readable column rather than
 * one word per line.
 */
function measureFor(
  sourceX: number,
  targetX: number,
  self: boolean,
  lanePitch: number,
): number {
  if (self) return lanePitch * 0.9;
  const span = Math.abs(targetX - sourceX);
  return Math.max(
    TRANSCRIPT.labelMinMeasure,
    span + 2 * TRANSCRIPT.labelOverhang * TRANSCRIPT.laneGap,
  );
}

/**
 * Greedy wrap to a measure, in world units. Never truncates and never rewords.
 *
 * Greedy rather than balanced, unlike `wrapLabel`. A lane's name is a *card* and wants to be a
 * pleasing shape; a message label is a *line of running text* that happens to be short, and
 * balancing it produces the ragged, centred, two-short-lines look that reads as a poem. A word
 * longer than the measure takes the line it needs and overhangs, because the alternative is
 * hyphenating somebody's endpoint.
 */
export function wrapToMeasure(text: string, measure: number): readonly string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [text];

  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (line !== "" && textWidth(candidate) > measure) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

/**
 * Which messages are replies, and who is holding what while they are outstanding.
 *
 * One stack, one pass, and the rule is the one every reader of a sequence diagram already applies
 * without being told: **a message that goes back the way the last unanswered one came is an
 * answer to it.** So `gateway -> auth` then `auth -> gateway` is a call and its return; two
 * `gateway -> auth` in a row are two calls. Nothing in the source marks either, and nothing could
 * — asking an author to write `reply: true` would be asking them to restate the order they had
 * already written.
 *
 * A self-message is neither. It does not open a call, because an actor doing something to itself
 * is not waiting on anybody, and it does not answer one, because the thing above it is still
 * outstanding after it.
 *
 * The consequence downstream is two pieces of notation that nobody authored: a reply is drawn
 * dashed, and the actor holding an unanswered call gets a bar on its lifeline for exactly as long
 * as it is holding it.
 */
export function readReplies(steps: readonly AuthoredStep[]): {
  readonly reply: readonly boolean[];
  readonly calls: readonly {
    readonly lane: string;
    readonly from: number;
    readonly to: number | undefined;
    readonly depth: number;
  }[];
  /**
   * Whether the stack rule above is entitled to be believed about *this* protocol.
   *
   * This is the finding `examples/deploy.yaml` was built to produce, and it cost the round its
   * most attractive derived notation. The stack rule is the standard heuristic and it is exactly
   * right for a request/response protocol. It is *silently wrong* for a notification-driven one:
   * a webhook followed by a clone is two independent requests, and structurally that is
   * indistinguishable from a call and its answer. Nothing about the two situations differs except
   * meaning, so no structural test can separate them — which was verified by trying, and by
   * watching the deploy film draw three identical `bind` messages in two different styles for a
   * reason no viewer could possibly infer.
   *
   * What *is* checkable is whether the protocol as a whole is call/return shaped: whether every
   * call was answered and nothing was left outstanding at the end. A protocol where that holds is
   * one where the stack rule cannot have misfired, because a misfire leaves an unmatched call
   * behind. So the notation is not weakened, it is **withheld** — a balanced exchange gets its
   * dashed returns and its activation bars, and an unbalanced one gets neither, and every arrow
   * carries its meaning in its direction alone. The second case is poorer and it is never wrong.
   *
   * The cliff is real and it is recorded rather than smoothed: adding one unanswered notification
   * to a balanced protocol removes the notation from the whole film (dragon:17). Smoothing it
   * would mean applying the notation *sometimes*, which is the failure this replaced.
   */
  readonly balanced: boolean;
} {
  const reply: boolean[] = [];
  const calls: {
    lane: string;
    from: number;
    to: number | undefined;
    depth: number;
  }[] = [];
  const open: { from: string; to: string; call: number }[] = [];

  steps.forEach((step, index) => {
    if (step.from === step.to) {
      reply[index] = false;
      return;
    }
    const top = open.at(-1);
    if (top !== undefined && top.from === step.to && top.to === step.from) {
      open.pop();
      reply[index] = true;
      const call = calls[top.call];
      if (call !== undefined) call.to = index;
      return;
    }
    reply[index] = false;
    calls.push({ lane: step.to, from: index, to: undefined, depth: open.length });
    open.push({ from: step.from, to: step.to, call: calls.length - 1 });
  });

  if (open.length > 0) {
    return { reply: steps.map(() => false), calls: [], balanced: false };
  }
  return { reply, calls, balanced: true };
}

/* ----------------------------------------------------------------- camera */

/**
 * What one step wants on screen.
 *
 * Horizontally: the two lanes it joins, widened to hold `minLanesInShot` of the cast. A shot of
 * exactly two lanes answers "what is this message" and loses "where does this happen", and the
 * second question is the one a sequence diagram exists to answer.
 *
 * Vertically: this row, the couple before it, and one row of room below. History is in the shot
 * because a message with no visible cause is not an explanation; the room below is there so the
 * active row sits above the middle of the frame rather than clinging to its lower edge, which is
 * where "include everything up to here" would have put it.
 */
export function stepBounds(
  layout: ProtocolLayout,
  index: number,
  aspect: number = 16 / 9,
): Rect {
  const message = layout.messages[index];
  if (message === undefined) return layout.bounds;

  // **The step, and the step before it.** A shot that holds only the current pair of lanes is a
  // shot that can be entirely empty: `examples/tap.yaml` opens its settlement phase between the
  // two right-hand lanes immediately after nine messages on the left, and the frame came out with
  // one arrow in it and nothing else. Carrying the previous message's lanes is the smallest
  // statement of causality a frame can make — *this* followed *that* — and it costs at most one
  // extra lane on ordinary traffic, because consecutive messages almost always share one.
  const before = index > 0 ? (layout.messages[index - 1] as Message) : message;
  const ends = [message.x1, message.x2, before.x1, before.x2];
  const left = Math.min(...ends);
  const right = Math.max(...ends);

  const centre = (left + right) / 2;
  const span = Math.max(
    right - left + layout.lanePitch * 0.9,
    Math.min(layout.bounds.width, layout.lanePitch * TRANSCRIPT.minLanesInShot),
  );

  const last = Math.min(layout.messages.length - 1, index + TRANSCRIPT.lookaheadRows);
  const closing = layout.messages[last] as Message;
  const bottom = closing.band.y + closing.band.height;

  // **History fills the height the width already bought.** The horizontal rule above decides how
  // wide the shot has to be; a 16:9 frame that wide then has a height, and taking only two rows of
  // history into it left the bottom two fifths of every frame empty — measured on the first render
  // of `examples/tap.yaml`, where the content occupied about 45% of the picture. So the shot takes
  // as much past traffic as the room it already has will hold. Nothing is wasted, the causal chain
  // is longer, and there is no second constant deciding how tall a shot should be.
  // Once the shot reaches back to the first message there is nothing above it but the cast, and
  // holding the plates is better than holding the void. This is also why a short protocol never
  // needs the rail: the plates simply never leave. The cast is counted *inside* the room, so
  // reaching the top of the exchange never quietly widens the shot to swallow it.
  const topOf = (row: number): number =>
    row === 0 ? layout.cast.y : (layout.messages[row] as Message).band.y;

  const room = span / aspect;
  let first = index;
  while (first > 0 && index - first < TRANSCRIPT.maxHistoryRows) {
    const forced = index - (first - 1) <= TRANSCRIPT.historyRows;
    if (!forced && bottom - topOf(first - 1) > room) break;
    first -= 1;
  }
  const top = topOf(first);

  // And when there is not enough traffic yet to fill the height — which is every shot in the first
  // few rows of any protocol — the spare room goes *below*. Centring a short subject in a tall
  // frame put a third of the picture above the cast, where nothing will ever be; putting it under
  // the last row instead reads as the space the exchange is about to descend into, which is what
  // it is.
  const height = Math.max(bottom - top, room);

  return union([
    { x: centre - span / 2, y: top, width: span, height },
    // The two lifelines the message actually joins, so a clamp can never push one out.
    { x: Math.min(message.x1, message.x2), y: message.band.y, width: 0, height: 0 },
    { x: Math.max(message.x1, message.x2), y: message.band.y, width: 0, height: 0 },
  ]);
}

/** The establishing shot: the whole cast, and where the first thing is about to happen. */
export function castBounds(layout: ProtocolLayout): Rect {
  const first = layout.messages[0];
  return first === undefined ? layout.cast : union([layout.cast, first.band]);
}

export interface TranscriptPlan {
  readonly track: readonly CameraKey[];
  /** One per step, including the ones that moved nothing. The record of what was decided. */
  readonly shots: readonly CameraShot[];
}

/**
 * The camera plan, derived from the beats and from nothing else.
 *
 * The whole of it is `shotFor` in a loop, which is the finding this composition was built to
 * produce: decision:24's hold policy was measured against a world and turns out to be about
 * *frames* rather than about worlds. Repeated traffic between two lanes holds because the second
 * message is already well inside the shot the first one produced — no rule was written for it, and
 * writing one would have been writing the same rule twice. Attention migrating across the cast
 * recomposes, because it has to. A long run of silent steps scrolls, because each row eventually
 * leaves the frame.
 *
 * The one thing added here that the atlas does not have is the *establishing* shot, and it is
 * added because the two spaces establish differently. A world opens on all of itself because a
 * world is a shape; a protocol is not a shape, it is a cast and a running time, and opening on all
 * of it would mean opening on a picture whose height is a consequence of how much happens.
 */
export function transcriptPlan(
  layout: ProtocolLayout,
  beats: readonly { readonly index: number; readonly from: number }[],
  span: { readonly from: number; readonly until: number },
  aspect: number = 16 / 9,
): TranscriptPlan {
  const opening = fitTo(castBounds(layout), layout.bounds, {
    aspect,
    widest: TRANSCRIPT.widest,
    pad: TRANSCRIPT.shotPad,
  });

  const stops: { frame: number; view: Viewport; travel?: number }[] = [
    { frame: span.from, view: opening },
  ];
  const shots: CameraShot[] = [];
  let current = opening;

  let first = true;
  for (const beat of [...beats].sort((a, b) => a.from - b.from)) {
    const at = Math.max(beat.from, span.from);
    const bounds = stepBounds(layout, beat.index, aspect);
    // **The establishing shot is not a shot the traversal may hold.** It is a title card: it
    // frames the whole cast, so it contains every subsequent subject comfortably and the hold
    // policy would keep it for the entire film — which was exactly what the first render did, and
    // the result was a wide stable diagram that never came in close enough for a message label to
    // be the thing you were looking at. So the first step composes properly, and every step after
    // it is decided against *that* — a working distance, arrived at once, rather than the opening
    // wide never being left.
    const shot = first
      ? {
          view: fitTo(bounds, layout.bounds, {
            aspect,
            widest: TRANSCRIPT.widest,
            pad: TRANSCRIPT.shotPad,
          }),
          kind: "recompose" as const,
        }
      : shotFor(current, bounds, layout.bounds, aspect, {
          pad: TRANSCRIPT.shotPad,
          widest: TRANSCRIPT.widest,
        });
    first = false;
    shots.push({
      frame: at,
      id: `step-${beat.index + 1}`,
      kind: shot.kind,
      view: shot.view,
    });
    if (shot.kind === "hold") continue;

    // The move lands *on* the step rather than starting there. A camera that begins travelling at
    // the moment a message is sent shows the message arriving somewhere the viewer is not looking
    // yet; one that arrives as it is sent has already brought them. The approach is allowed to run
    // under the tail of whatever came before it, which is a move a documentary makes.
    const travel = paceOf(current, shot.view, CAMERA.minTravel, CAMERA.maxTravel);
    const lands = Math.max(
      stops.at(-1)?.frame ?? span.from,
      at - travel,
      span.from + TRANSCRIPT.establish,
    );
    stops.push({ frame: lands, view: shot.view, travel });
    current = shot.view;
  }

  const track: CameraKey[] = stops.map((stop, index) => {
    if (index === 0) return { frame: stop.frame, view: stop.view, travel: 1 };
    const previous = stops[index - 1] as { frame: number; view: Viewport };
    const next = stops[index + 1];
    const gap = next === undefined ? Infinity : Math.max(1, next.frame - stop.frame);
    const suggested =
      stop.travel ?? paceOf(previous.view, stop.view, CAMERA.minTravel, CAMERA.maxTravel);
    return {
      frame: stop.frame,
      view: stop.view,
      travel: Math.max(1, Math.min(suggested, gap)),
    };
  });

  return { track, shots };
}
