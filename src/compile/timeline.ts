import { bodyAddresses, type SlideBody } from "../presentation/body.ts";
import { takeId } from "../presentation/machine.ts";
import { stepId } from "../presentation/protocol.ts";
import { childScope, ROOT_SCOPE, type Scope } from "../presentation/scope.ts";
import { chooseLayout, type LayoutArchetype } from "../render/layout.ts";
import type { TypographyId } from "../render/typography.ts";
import { subtitleTrack, type SubtitleCue } from "../render/subtitle.ts";
import type { CompiledPresentation } from "./compile.ts";
import { freezeFacts, type CompilationFacts } from "./facts.ts";

/**
 * The rendering boundary: the only place in cuecraft where a duration becomes frames.
 *
 * dragon:1 asks for exactly one rounding rule, in one place, because a rule applied twice
 * differently is how audio drifts against slides over a long deck. The rule is here and
 * it is one line: **a duration occupies every frame it touches, and never fewer**.
 *
 * Rounding up rather than to nearest costs at most a frame of padding per component and
 * buys a guarantee that is otherwise fiddly to argue: narration is always fully contained
 * by its scene, and the next slide can never begin over the tail of the previous one.
 * Because every scene length is an integer computed independently, scene starts are exact
 * prefix sums — there is no accumulating fractional error to drift.
 *
 * The same reasoning applies within a slide's narration. Clip positions accumulate in whole
 * frames rather than being converted from seconds independently, because `ceil(a) + ceil(b)`
 * can exceed `ceil(a + b)` — which would let one clip start a frame before the previous one
 * finished.
 *
 * This also carries the chosen layout. Selection is deterministic and derived from content
 * (see `../render/layout.ts`), so resolving it here keeps the React components free of
 * decisions and lets the CLI report what each slide was given without launching a browser.
 */

export const DEFAULT_FPS = 30;
export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;

/**
 * The compiled call stack of one scene: what is said, where, and when it descends.
 *
 * One merged sequence rather than two lists, because the property worth asserting is an ordering
 * across both of them — that the child's narration lands *between* the enter and the exit, and
 * that the parent's next word lands after. Two lists can each be right while the interleaving is
 * wrong, and the interleaving is the whole claim.
 *
 *     narrate  root
 *     enter    root -> root/payment            (payment)
 *     narrate  root/payment
 *     enter    root/payment -> .../check       (check)
 *     narrate  root/payment/check
 *     exit     .../check -> root/payment
 *     narrate  root/payment
 *     exit     root/payment -> root
 *     narrate  root
 */
export type StackEvent =
  | {
      readonly kind: "narrate";
      readonly scope: Scope;
      readonly frame: number;
      readonly durationInFrames: number;
      /** The address this utterance reaches, if it reaches one. */
      readonly activates?: Scope;
    }
  | {
      readonly kind: "enter" | "exit";
      readonly scope: Scope;
      readonly into: Scope;
      readonly target: string;
      readonly frame: number;
      readonly durationInFrames: number;
    };

/**
 * The replay happening on a frame, or nothing.
 *
 * Derived rather than stored. A renderer needs to know "is the film quoting itself right now" on
 * every frame it draws, and the temptation is to precompute that into the timeline — a flag, an
 * index, a per-frame lookup table. All of those would be *renderer state on a compiled artifact*,
 * which is a second source of truth for something the first one already says: a `Recall` has a frame
 * and a duration, and whether a frame is inside it is arithmetic.
 *
 * Linear over a deck's handful of recalls, for the reason `subtitleAt` is linear over its cues: this
 * runs once per frame, and a scan anybody can check against the interval rule is worth more than the
 * microseconds.
 */
export function recallAt(
  scenes: readonly Scene[],
  frame: number,
): { readonly scene: Scene; readonly recall: Recall } | undefined {
  for (const scene of scenes) {
    for (const recall of scene.recalls) {
      if (frame >= recall.from && frame < recall.from + recall.durationInFrames) {
        return { scene, recall };
      }
    }
  }
  return undefined;
}

export function narrativeStack(scene: Scene): readonly StackEvent[] {
  const byClip = new Map(
    scene.anchors.map((anchor) => [anchor.clipIndex, anchor.address]),
  );
  const spoken: StackEvent[] = scene.clips.map((clip, index) => {
    const activates = byClip.get(index);
    return {
      kind: "narrate",
      scope: clip.scope,
      frame: clip.from,
      durationInFrames: clip.durationInFrames,
      ...(activates === undefined ? {} : { activates }),
    };
  });
  const moved: StackEvent[] = scene.calls.map((call) => ({
    kind: call.kind,
    scope: call.scope,
    into: call.into,
    target: call.target,
    frame: call.frame,
    durationInFrames: call.durationInFrames,
  }));

  // Stable: a transition and the utterance that follows it never share a frame, but if rounding
  // ever made them, the transition is what happened first.
  return [...moved, ...spoken].sort((a, b) =>
    a.frame === b.frame ? rank(a) - rank(b) : a.frame - b.frame,
  );
}

function rank(event: StackEvent): number {
  return event.kind === "narrate" ? 1 : 0;
}

/**
 * Whether a scene's descents nest.
 *
 * Not a defensive check against authors — the parser cannot emit an unbalanced sequence, because
 * an exit is only ever written where the callee's cue list ended. It is a check against *this
 * compiler*, and it is the assertion the round is really making: that flattening a tree of
 * narrations into one serial stream preserved the tree.
 */
export function stackProblem(scene: Scene): string | undefined {
  const open: string[] = [];
  for (const event of narrativeStack(scene)) {
    if (event.kind === "narrate") {
      const expected = open.at(-1) ?? ROOT_SCOPE;
      if (event.scope !== expected) {
        return `narration in ${event.scope} at frame ${event.frame}, but the stack is in ${expected}`;
      }
      continue;
    }
    if (event.kind === "enter") {
      if ((open.at(-1) ?? ROOT_SCOPE) !== event.scope) {
        return `enter from ${event.scope} at frame ${event.frame}, but the stack is in ${open.at(-1) ?? ROOT_SCOPE}`;
      }
      open.push(event.into);
      continue;
    }
    if (open.pop() !== event.into) {
      return `exit from ${event.into} at frame ${event.frame} does not close the open scope`;
    }
  }
  return open.length === 0 ? undefined : `scope ${open.join(", ")} never returned`;
}

/**
 * Where the clip a recall replays actually landed.
 *
 * `Clip.from` and never `Anchor.frame` — see `Recall` for why the difference is nine frames of
 * somebody's first word. Read out of a scene that is already built, which is available because a
 * recall only ever reaches backwards and slides are laid out in order.
 *
 * Both failures are compiler bugs rather than authoring errors: the parser resolved this reference
 * against the whole deck and the compiler already found the clip once, to borrow its duration.
 */
function sourceFrameOf(
  scenes: readonly Scene[],
  recall: { sourceOrdinal: number; sourceClipIndex: number; id: string },
  ordinal: number,
): number {
  const source = scenes.find((scene) => scene.ordinal === recall.sourceOrdinal);
  const clip = source?.clips[recall.sourceClipIndex];
  if (clip === undefined) {
    throw new Error(
      `slide ${ordinal}: recalls ${JSON.stringify(recall.id)} from slide ` +
        `${recall.sourceOrdinal}, which has not been laid out`,
    );
  }
  return clip.from;
}

/** The one rounding rule. Nothing else in cuecraft may convert seconds to frames. */
export function framesFor(seconds: number, fps: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError(`cannot convert ${seconds}s to frames`);
  }
  if (!Number.isInteger(fps) || fps <= 0) {
    throw new RangeError(`fps must be a positive integer, got ${fps}`);
  }
  return Math.ceil(seconds * fps);
}

export interface Clip {
  /** Public-directory-relative path to this clip's audio. */
  readonly src: string;
  /** Absolute frame at which the clip starts. */
  readonly from: number;
  readonly durationInFrames: number;
  /** Which narration this clip belongs to. `root` on every deck that never descends. */
  readonly scope: Scope;
}

/**
 * One scope transition, in frames.
 *
 * The compiled form of an `enter:` and of the return that its callee's silence produced. Both are
 * *scheduled* rather than derived: they have a frame, they have a duration, and the camera is
 * told about them rather than inferring them from which cue reached what. That distinction is the
 * whole reason this type exists — the derived rule decision:25 shipped opens a portal on the
 * first cue that reaches inside an entity, which is exactly right for an interior narrated from
 * outside and exactly wrong for one that narrates itself.
 */
export interface Call {
  readonly kind: "enter" | "exit";
  /** The scope making the call, or being returned to. */
  readonly scope: Scope;
  /** The scope being entered, or left. */
  readonly into: Scope;
  /** The entity, named locally in `scope`. */
  readonly target: string;
  /** Absolute frame at which the transition begins. */
  readonly frame: number;
  readonly durationInFrames: number;
}

/**
 * A resolved link between a *stretch* of narration and a population that accumulates across it.
 *
 * The interval sibling of `Anchor`, and separate from it on purpose. An anchor is a frame: this
 * moment and this element are the same idea (decision:14). A span is a range: this element comes
 * into being while this sentence is spoken. Collapsing them into one record with a duration that
 * is usually zero would make every consumer decide which kind it was holding, and the one that
 * forgot would be silently wrong rather than loudly broken.
 *
 * **Where the range comes from is the whole point.** It begins at the clip's first audible sample
 * — decision:13's rule, the same one an anchor uses, because a population that started filling
 * during Kokoro's leading silence would be visibly ahead of the voice. It ends with the clip.
 * Trailing silence is *not* subtracted, because nothing measures it: `leadingSilence` in
 * `../tts/kokoro.ts` is the only onset the synthesizer reports, and subtracting a guess would be
 * inventing a measurement. The consequence is that the field finishes a beat before the last word
 * rather than after it, which is the side to err on — the viewer sees a completed population while
 * the sentence lands.
 */
export interface Span {
  /** The identity as the author wrote it, local to whichever scope reached it. */
  readonly id: string;
  readonly address: Scope;
  /** Index into `bodyElements(Scene.body)` — the group, not any of its members. */
  readonly elementIndex: number;
  /** Index into `Scene.clips`. */
  readonly clipIndex: number;
  /** Absolute frame at which accumulation begins: the clip's first audible sample. */
  readonly from: number;
  /** How long it takes. Measured, never authored, and never zero. */
  readonly durationInFrames: number;
}

/**
 * When one step of a protocol happens, and how long it owns the stage.
 *
 * The third temporal record, after `Anchor` (a frame) and `Span` (a range), and it exists because
 * a step can get its frame in either of two ways: from the anchor of the sentence spoken over it,
 * or from the dwell that stood in for the sentence nobody wrote. Merging the two here rather than
 * in the composition keeps the rounding rule in the one module that owns it, and hands the
 * renderer a single list in step order with no branch for how each entry was arrived at.
 *
 * **The duration is the interesting field.** An anchor's transient is a fixed envelope because the
 * thing it is marking is an arrival; a step is not an arrival, it is *the current step*, and it
 * stays current until the next one starts however long that takes. So a beat runs to its
 * successor, and the last runs to the end of the narration — which is what lets a sentence four
 * times longer than its own transition read as a held shot rather than as a flare that burned out
 * with five seconds still to say.
 */
export interface Beat {
  /** Index into the body's ordered occurrences — a protocol's steps, or a scenario's takes. */
  readonly index: number;
  readonly address: Scope;
  /** Absolute frame at which the transition begins. */
  readonly from: number;
  /** To the next beat, or to the end of the narration. Never zero. */
  readonly durationInFrames: number;
  /** Index into `Scene.clips`, when something was said over this step. */
  readonly clipIndex?: number;
}

/**
 * An earlier clip, placed a second time, with the frames of the slide it was first said over.
 *
 * The compiled form of `recall:`, and it is a record on the timeline rather than an effect the
 * renderer works out for the reason `Call` is: the replay is **scheduled**. It has a frame, it has
 * a duration that came from a measurement, and it names the source interval outright. A renderer
 * that inferred any of those could infer them differently, and a picture that disagrees with the
 * sound by a frame is exactly the silent synchronization loss decision:9 exists to make impossible.
 *
 * ## The mapping, in one line
 *
 *     sourceFrame = sourceFrom + (frame - from)
 *
 * `sourceFrom` is the source **clip's** first frame — `Clip.from`, not `Anchor.frame`. Those differ
 * by the measured leading silence, and the difference matters in both directions: an anchor is
 * where the *sound* starts, which is the right place to light an element up (decision:13), and a
 * clip is where the *utterance* starts, which is the right place to begin playing it. Starting the
 * replay at the anchor would drop about nine frames off the front of every recalled sentence and
 * make the picture arrive late against its own audio.
 *
 * `durationInFrames` is the source clip's own, so the mapping never walks off the end of the clip
 * it is replaying: both come from `framesFor` over the same measured seconds.
 */
export interface Recall {
  /** The identity the author wrote in both places. */
  readonly id: string;
  /** 1-based ordinal of the scene being replayed. */
  readonly sourceOrdinal: number;
  /** Index into that scene's `clips`. */
  readonly sourceClipIndex: number;
  /** The same audio the source clip carries. Placed again; never synthesized again. */
  readonly src: string;
  /** Absolute frame the replay begins. */
  readonly from: number;
  readonly durationInFrames: number;
  /** Absolute frame the source clip begins on — the origin of the mapping above. */
  readonly sourceFrom: number;
}

/**
 * A resolved link between a moment in the narration and an element on the slide.
 *
 * Deliberately a record of the *relationship* rather than a field on the element saying when
 * to light up. Both endpoints stay addressable, so the same structure answers "when does
 * this element become established?" and "which narration reaches this element?" — and a later
 * caption, seek or debugger would read it in the other direction without this having to be
 * rebuilt (decision:14). Nothing today reads it backwards; the point is that it could.
 */
export interface Anchor {
  /** The identity as the author wrote it, local to whichever scope reached it. */
  readonly id: string;
  /**
   * The same identity as a structural address (`../presentation/scope.ts`).
   *
   * What resolution actually matches on, and the reason two modules may both contain something
   * called `check` without one of them silently lighting up the other's.
   */
  readonly address: Scope;
  /** Index into `bodyElements(Scene.body)` — a list item, or a mark on a code specimen. */
  readonly elementIndex: number;
  /** Index into `Scene.clips`. */
  readonly clipIndex: number;
  /**
   * Absolute frame at which the relationship activates: the clip's start plus its measured
   * leading silence, so the visual lands with the first spoken sound rather than with the
   * clip boundary about nine frames earlier.
   */
  readonly frame: number;
}

export interface Scene {
  readonly ordinal: number;
  readonly title: string;
  /** Carried through verbatim: the renderer needs what the content *means*, not a flattening. */
  readonly body: SlideBody;
  readonly layout: LayoutArchetype;
  /** Empty on a slide that names no identities, which is most of them. */
  readonly anchors: readonly Anchor[];
  /** Every descent and return, in frame order. Empty on every deck that never descends. */
  readonly calls: readonly Call[];
  /** Every population accumulating over a sentence. Empty on almost every deck. */
  readonly spans: readonly Span[];
  /**
   * Every occurrence a body carries in its own order — a protocol's steps, a scenario's takes.
   * Empty unless the body is one of those.
   */
  readonly beats: readonly Beat[];
  /** Every earlier utterance said again, in frame order. Empty on every deck that never recalls. */
  readonly recalls: readonly Recall[];
  /** Absolute frame at which the slide appears. */
  readonly from: number;
  readonly durationInFrames: number;
  /** Absolute frame at which narration starts: `from + pre_say`. */
  readonly narrationFrom: number;
  /** Speech plus authored pauses, end to end. */
  readonly narrationDurationInFrames: number;
  readonly clips: readonly Clip[];
}

export interface Timeline {
  readonly title: string;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly totalFrames: number;
  readonly scenes: readonly Scene[];
  /**
   * What the compilation derived, frozen, for a presentation that wants to show it.
   *
   * Computed last, from scenes that are already final, and read-only from here on — see
   * `./facts.ts` for why that ordering is the whole of the acyclicity argument.
   */
  readonly facts: CompilationFacts;
  /**
   * The narration as text, on the frames it was already placed on. Empty unless the deck asked.
   *
   * Derived at the same point and for the same reason the facts are: everything above is settled,
   * so a subtitle cannot be anything but a reading of it. It is not a second timeline and there is
   * no second clock — see `../render/subtitle.ts`.
   */
  readonly subtitles: readonly SubtitleCue[];
  /**
   * Which typography profile every composition in this film is set in.
   *
   * On the timeline rather than beside it, and that placement is the whole of the concurrency
   * argument. The timeline is the one immutable value a render is handed — it crosses into the
   * browser as an input prop, it is what `calculateMetadata` sizes the composition from, and it is
   * already the carrier for the two other things the renderer must not decide for itself. A profile
   * that lived in a module-level variable instead would be shared by every render in the process,
   * and a batch that rendered a dyslexia deck beside a default one would have to hope they did not
   * interleave.
   *
   * It is resolved *before* this function returns, which is what puts it in front of every fitter:
   * `chooseLayout` runs here, and everything that measures a line runs downstream of here. A late
   * CSS swap would leave the arithmetic set in one face and the pixels in another.
   *
   * An identity rather than a family, so nothing in the compiled artifact names a typeface.
   */
  readonly typography: TypographyId;
}

export interface TimelineOptions {
  readonly fps?: number;
  readonly width?: number;
  readonly height?: number;
}

/**
 * Lay the compiled presentation onto a frame timeline.
 *
 * Pure: given the same compiled presentation it always produces the same timeline, which
 * is what makes visual iteration free of synthesis.
 */
export function buildTimeline(
  compiled: CompiledPresentation,
  options: TimelineOptions = {},
): Timeline {
  const fps = options.fps ?? DEFAULT_FPS;
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

  let from = 0;
  // A loop rather than a `map`, because one occupant of the track reaches backwards: a recall needs
  // the absolute frame of a clip on an earlier *scene*, and a scene that has not been built yet has
  // no such frame. Slides are laid out in order anyway; this makes the order load-bearing and says
  // so, which is safer than a `map` whose callback quietly depended on an array being filled in.
  const scenes: Scene[] = [];
  for (const slide of compiled.slides) {
    const preSayFrames = framesFor(slide.preSayMs / 1000, fps);
    const postSayFrames = framesFor(slide.postSayMs / 1000, fps);
    const minimumFrames = framesFor(slide.minSlideMs / 1000, fps);
    const narrationFrom = from + preSayFrames;

    // Walk the narration in frames. Each thing on the track is pushed to at least where its
    // measured offset lands, and never before the previous thing has finished.
    //
    // **Clips and descents walk together, on one cursor.** They are two kinds of occupant of one
    // serial track, and converting each list from seconds independently is exactly the drift this
    // module exists to prevent: `ceil(a) + ceil(b)` can exceed `ceil(a + b)`, so a descent placed
    // from its own offset can land a frame or two before the speech in front of it has finished.
    // The result is a threshold that begins under the last word of the sentence announcing it —
    // subtle, wrong, and invisible until somebody looks at the compiled stack.
    //
    // Merging by offset recovers the cue order exactly, because every occupant begins where the
    // last one ended and no two can share a start.
    const track = [
      ...slide.narration.clips.map((clip, index) => ({
        at: clip.offsetSeconds,
        seconds: clip.durationSeconds,
        clip,
        index,
      })),
      ...slide.narration.calls.map((call) => ({
        at: call.offsetSeconds,
        seconds: call.durationSeconds,
        call,
      })),
      // A dwell walks the same cursor for the same reason a descent does. It is a silence with a
      // position, and a position derived independently from seconds would drift against the clip
      // in front of it by exactly the frame `ceil(a) + ceil(b) > ceil(a + b)` costs.
      ...slide.narration.dwells.map((dwell) => ({
        at: dwell.offsetSeconds,
        seconds: dwell.durationSeconds,
        dwell,
      })),
      // A recall walks the same cursor as everything else, which is the whole claim of the feature
      // in one line: a replayed sentence is an occupant of the one serialized narrative track, not
      // a second stream running beside it. Its seconds were measured for another slide, and the
      // one rounding rule turns them into frames here exactly as it does for a clip.
      ...slide.narration.recalls.map((recall) => ({
        at: recall.offsetSeconds,
        seconds: recall.durationSeconds,
        recall,
      })),
    ].sort((a, b) => a.at - b.at);

    let cursor = 0;
    const clips: Clip[] = [];
    const calls: Call[] = [];
    const recalls: Recall[] = [];
    const placedDwells = new Map<Scope, number>();
    for (const entry of track) {
      cursor = Math.max(cursor, framesFor(entry.at, fps));
      const durationInFrames = framesFor(entry.seconds, fps);
      if ("clip" in entry) {
        clips[entry.index] = {
          src: entry.clip.src,
          from: narrationFrom + cursor,
          durationInFrames,
          scope: entry.clip.scope,
        };
      } else if ("dwell" in entry) {
        placedDwells.set(entry.dwell.address, narrationFrom + cursor);
      } else if ("recall" in entry) {
        recalls.push({
          id: entry.recall.id,
          sourceOrdinal: entry.recall.sourceOrdinal,
          sourceClipIndex: entry.recall.sourceClipIndex,
          src: entry.recall.src,
          from: narrationFrom + cursor,
          // Identical to the source clip's, because `framesFor` is a function of the seconds and
          // these are the same seconds. That is what keeps the mapping inside the clip it replays.
          durationInFrames,
          sourceFrom: sourceFrameOf(scenes, entry.recall, slide.ordinal),
        });
      } else {
        calls.push({
          kind: entry.call.kind,
          scope: entry.call.scope,
          into: entry.call.into,
          target: entry.call.target,
          frame: narrationFrom + cursor,
          durationInFrames,
        });
      }
      cursor += durationInFrames;
    }

    // Both ends of every relationship, resolved to a frame. Validation already guaranteed
    // that each `activates` names an element the cue's own scope can reach, so a miss here is a
    // compiler bug rather than an authoring error, and dropping it silently is not an option.
    //
    // Resolution goes through `bodyAddresses`, which walks in `bodyElements` order and names
    // what it visits — so this is identical whether the identity was declared on a bullet, a
    // step, a mark on a code specimen, or an entity three modules down, and two modules that
    // both chose the name `check` resolve to two different elements rather than twice to the
    // first one.
    const addresses = bodyAddresses(slide.body, ROOT_SCOPE);
    const anchors: Anchor[] = [];
    slide.narration.clips.forEach((clip, clipIndex) => {
      if (clip.activates === undefined || clip.address === undefined) return;
      const address = clip.address;
      const elementIndex = addresses.findIndex((entry) => entry.address === address);
      if (elementIndex === -1) {
        throw new Error(
          `slide ${slide.ordinal}: narration activates "${address}" but nothing on the slide declares it`,
        );
      }
      const placed = clips[clipIndex];
      if (placed === undefined) return;
      anchors.push({
        id: clip.activates,
        address,
        elementIndex,
        clipIndex,
        frame: placed.from + framesFor(clip.leadingSilenceSeconds, fps),
      });
    });

    // Populations, resolved exactly as anchors are — same addresses, same clips, same rounding.
    // A span carries a range where an anchor carries a frame, and nothing else about them differs.
    const spans: Span[] = [];
    slide.narration.clips.forEach((clip, clipIndex) => {
      if (clip.fills === undefined || clip.fillsAddress === undefined) return;
      const address = clip.fillsAddress;
      const elementIndex = addresses.findIndex((entry) => entry.address === address);
      if (elementIndex === -1) {
        throw new Error(
          `slide ${slide.ordinal}: narration fills "${address}" but nothing on the slide declares it`,
        );
      }
      const placed = clips[clipIndex];
      if (placed === undefined) return;
      const onset = framesFor(clip.leadingSilenceSeconds, fps);
      spans.push({
        id: clip.fills,
        address,
        elementIndex,
        clipIndex,
        from: placed.from + onset,
        // Never zero: a population that filled in no frames would be a cut, and the shortest
        // clip Kokoro produces is still a couple of seconds of audible sound.
        durationInFrames: Math.max(1, placed.durationInFrames - onset),
      });
    });

    // The track runs to whichever is later: the last clip's end, or a trailing pause.
    const narrationDurationInFrames = Math.max(
      cursor,
      framesFor(slide.narration.durationSeconds, fps),
    );

    // Every occurrence, in written order, however it came by its frame. A narrated one was already
    // resolved above as an ordinary anchor; a silent one has a placed dwell. Neither branch knows
    // anything the other does not, which is the point: the composition consumes one list.
    //
    // Two bodies produce beats now, and they produce them through *one* path. What differs is only
    // which addresses to look up, which is one expression rather than a second loop — the merge,
    // the "never zero" rule, the run to the next beat and the throw are stated once and neither
    // body can drift from the other.
    const beats: Beat[] = [];
    const occurrences: readonly Scope[] =
      slide.body.kind === "protocol"
        ? slide.body.steps.map((_, index) => childScope(ROOT_SCOPE, stepId(index)))
        : slide.body.kind === "machine"
          ? slide.body.scenario.map((_, index) => childScope(ROOT_SCOPE, takeId(index)))
          : [];
    if (occurrences.length > 0) {
      const narrationUntil = narrationFrom + narrationDurationInFrames;
      const byAddress = new Map(
        anchors.map((anchor) => [anchor.address, anchor] as const),
      );
      const starts = occurrences.map((address, index) => {
        const anchor = byAddress.get(address);
        const from = anchor?.frame ?? placedDwells.get(address);
        return { index, address, from, clipIndex: anchor?.clipIndex };
      });
      starts.forEach((start, position) => {
        if (start.from === undefined) {
          throw new Error(
            `slide ${slide.ordinal}: occurrence ${position + 1} was never placed on the narration track`,
          );
        }
        const next = starts.slice(position + 1).find((entry) => entry.from !== undefined);
        beats.push({
          index: start.index,
          address: start.address,
          from: start.from,
          // Never zero: a step that owned the stage for no frames would be a cut, and the
          // shortest thing that can start one is a dwell with a floor on it.
          durationInFrames: Math.max(1, (next?.from ?? narrationUntil) - start.from),
          ...(start.clipIndex === undefined ? {} : { clipIndex: start.clipIndex }),
        });
      });
    }

    const durationInFrames = Math.max(
      minimumFrames,
      preSayFrames + narrationDurationInFrames + postSayFrames,
    );

    const scene: Scene = {
      ordinal: slide.ordinal,
      title: slide.title,
      body: slide.body,
      layout: chooseLayout(slide),
      anchors,
      calls,
      spans,
      beats,
      recalls,
      from,
      durationInFrames,
      narrationFrom,
      narrationDurationInFrames,
      clips,
    };

    from += durationInFrames;
    scenes.push(scene);
  }

  // The last statement, deliberately: everything above is settled, and nothing below may write
  // to what it produced. This is the freeze boundary (`./facts.ts`).
  //
  // The subtitle track is derived here and not earlier for exactly that reason. It needs both
  // halves of every utterance — what was said and by whom, from `compiled`; where it landed, from
  // `scenes` — and it must not be able to influence either. Placing it in this statement makes
  // that structural rather than a rule somebody has to remember.
  return {
    title: compiled.title,
    fps,
    width,
    height,
    totalFrames: from,
    scenes,
    facts: freezeFacts(compiled, scenes, fps, from),
    subtitles: subtitleTrack(compiled, scenes),
    typography: compiled.typography,
  };
}
