import { z } from "zod";

import { scopeLeaf, ROOT_SCOPE, type Scope } from "../presentation/scope.ts";
import type { CompiledPresentation } from "./compile.ts";
import type { Scene, Timeline } from "./timeline.ts";

/**
 * Where the meaning landed, published beside the film (decision:66).
 *
 * An MP4 has forgotten everything. It is the one artifact cuecraft produces that carries no trace
 * of what it is *of* — scene cuts can be recovered by differencing pixels and speech by
 * transcribing audio, and an *address* cannot be recovered at all, because the address was never
 * in the picture. So an agent asked to inspect a render samples it every few seconds and hopes,
 * which is how a short final slide gets missed by a tool the compiler could simply have told.
 *
 * This is the telling. `symbolTable` reads a finished timeline and emits the semantic addresses of
 * the film with the frames they compiled to:
 *
 *     authored semantic identity          slide:architecture
 *               |
 *               v
 *     compiled temporal coordinates       [252, 717), look at 400
 *
 * ## Why this is `freezeFacts`'s sibling and not part of it
 *
 * Both run at the same boundary — after the timeline is final, before anything is projected — and
 * they differ in exactly one way, which is the reason they are two modules. **Facts are what the
 * compilation derived and the film then shows; symbols are what the compilation derived and the
 * film cannot show.** So `CompilationFacts` rides on `Timeline` into the browser, and this never
 * does: nothing in `../render/` imports this file, and the sidecar is written after `renderMedia`
 * has returned.
 *
 * ## Why it is written out by hand
 *
 * idea:26 named the trap and this module is arranged around avoiding it: if the export were derived
 * from `Timeline`'s shape, every external consumer would pin every internal refactor, and cuecraft
 * would have adopted idea:3's presentation IR without ever deciding to. So there is no spread of an
 * internal record anywhere below, and no field reaches the document without somebody having typed
 * it here. Nothing exported is an element index, a clip index, a scope object, a layout archetype,
 * a workspace path or an offset into an internal array.
 *
 * Adding a kind or a field is free. Changing what an existing field means costs a `version` bump.
 */

/** What the document says it is, so a tool that finds one in an output directory can tell. */
export const SYMBOLS_FORMAT = "cuecraft-symbols";
export const SYMBOLS_VERSION = 1;

/**
 * The kinds of thing that have an address.
 *
 * Every one of these is a place where an identity the *author* wrote survives compilation intact —
 * which is the whole test decision:66 applied. A film's rendezvous moments fail it (dragon:39) and
 * are absent; camera shots, layouts and lane allocations fail a different test, being decisions
 * about how the film looks rather than about what it means.
 *
 * The order is load-bearing twice over: it breaks ties between two symbols that begin on the same
 * frame, outermost first, and it is the order the CLI lists kinds in. One list rather than two, so
 * a kind added later cannot appear in one and not the other.
 */
export const SYMBOL_KINDS = [
  "slide",
  "scope",
  "recall",
  "utterance",
  "anchor",
  "span",
  "beat",
] as const;

export type SymbolKind = (typeof SYMBOL_KINDS)[number];

/**
 * One semantic address, and the frames it compiled to.
 *
 * **Intervals are half-open**: `[fromFrame, toFrame)`, so `toFrame - fromFrame` is the duration,
 * `toFrame` is the first frame the symbol is no longer true, and two adjacent slides share a number
 * instead of being off by one from each other.
 *
 * A symbol that is a *moment* rather than a range — an anchor becoming true, a recall starting — is
 * still an interval, because a consumer with two shapes to handle is a consumer that mishandles
 * one. What the interval means is stated per kind in `symbolTable`.
 */
export interface CuecraftSymbol {
  /** `kind:slide-slug[/address]`. Stable across renders; see `slugFor`. */
  readonly key: string;
  readonly kind: SymbolKind;
  /** What the author wrote: a slide's title, a sentence's text, an identity's own name. */
  readonly label: string;
  /** The key of the slide this lives on. A slide's own key, for a slide. */
  readonly slide: string;
  readonly fromFrame: number;
  /** Exclusive. */
  readonly toFrame: number;
  /** A frame worth looking at. The slide rule below, or `fromFrame` for a moment. */
  readonly snapshotFrame: number;
  /** Derived from the frame above and the film's fps. Never authoritative; never converted back. */
  readonly fromSeconds: number;
  readonly toSeconds: number;
  readonly snapshotSeconds: number;
  /** 1-based playback order. Slides only, and the only ordinal anywhere in the document. */
  readonly ordinal?: number | undefined;
  /**
   * The narration's own window: the slide has fully arrived, and has not begun to leave.
   *
   * Slides only. Published so that a consumer wanting a different frame from `snapshotFrame` has
   * somewhere safe to choose one, rather than guessing how long a transition takes.
   */
  readonly contentFromFrame?: number | undefined;
  readonly contentToFrame?: number | undefined;
  /** Where a recall is quoting from. Recalls only, and the whole of the mapping's origin. */
  readonly sourceFromFrame?: number | undefined;
}

export interface SymbolTable {
  readonly format: typeof SYMBOLS_FORMAT;
  readonly version: typeof SYMBOLS_VERSION;
  /** Stated in the document so nothing about the coordinates has to be known in advance. */
  readonly coordinates: {
    readonly unit: "frame";
    readonly interval: "[fromFrame, toFrame)";
    readonly seconds: "derived";
  };
  readonly presentation: { readonly title: string };
  readonly media: {
    /** A basename, not a path: the sidecar sits beside the film and both should stay movable. */
    readonly file: string;
    readonly fps: number;
    readonly width: number;
    readonly height: number;
    readonly durationFrames: number;
    readonly durationSeconds: number;
  };
  /** In frame order, then by kind, then by key. Deterministic. */
  readonly symbols: readonly CuecraftSymbol[];
}

/**
 * The sidecar's path, derived from the film's.
 *
 * `out/demo.mp4` -> `out/demo.symbols.json`. From the *output* path rather than the source's, so a
 * deck rendered twice under two names produces two symbol tables that each describe the film beside
 * them.
 */
export function symbolsPathFor(output: string): string {
  const cut = output.lastIndexOf(".");
  const slash = Math.max(output.lastIndexOf("/"), output.lastIndexOf("\\"));
  return `${cut > slash + 1 ? output.slice(0, cut) : output}.symbols.json`;
}

/**
 * Read a symbol table back, and refuse anything that is not one.
 *
 * This module owns the format in both directions, which is the point: a consumer that hand-rolled
 * its own reader would be a second, drifting description of the document. It is also the only place
 * that has to know a symbol table might be *stale* — a sidecar beside a film that has since been
 * re-rendered is still valid JSON, and nothing here can tell. What it can do is refuse a document
 * that was never a symbol table, by name, rather than failing later on a missing field.
 *
 * Deliberately tolerant of unknown fields. Adding a kind or a field is free (decision:66), so a
 * newer cuecraft's output must remain readable by an older reader as long as the version matches.
 */
export function parseSymbolTable(text: string, source: string): SymbolTable {
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    throw new SymbolsError(`${source} is not JSON`);
  }
  const parsed = SYMBOL_TABLE.safeParse(document);
  if (!parsed.success) {
    const format = (document as { format?: unknown } | null)?.format;
    throw new SymbolsError(
      typeof format === "string" && format !== SYMBOLS_FORMAT
        ? `${source} declares format ${JSON.stringify(format)}, not ${SYMBOLS_FORMAT}`
        : format === undefined
          ? `${source} is not a ${SYMBOLS_FORMAT} document; it declares no format`
          : `${source} is a damaged ${SYMBOLS_FORMAT} document: ` +
            `${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`,
    );
  }
  return parsed.data;
}

export class SymbolsError extends Error {}

const SYMBOL = z.looseObject({
  key: z.string(),
  kind: z.enum(["slide", "utterance", "anchor", "span", "beat", "recall", "scope"]),
  label: z.string(),
  slide: z.string(),
  fromFrame: z.number().int(),
  toFrame: z.number().int(),
  snapshotFrame: z.number().int(),
  fromSeconds: z.number(),
  toSeconds: z.number(),
  snapshotSeconds: z.number(),
  ordinal: z.number().int().optional(),
  contentFromFrame: z.number().int().optional(),
  contentToFrame: z.number().int().optional(),
  sourceFromFrame: z.number().int().optional(),
});

const SYMBOL_TABLE = z.looseObject({
  format: z.literal(SYMBOLS_FORMAT),
  version: z.literal(SYMBOLS_VERSION),
  coordinates: z.looseObject({
    unit: z.literal("frame"),
    interval: z.literal("[fromFrame, toFrame)"),
    seconds: z.literal("derived"),
  }),
  presentation: z.looseObject({ title: z.string() }),
  media: z.looseObject({
    file: z.string(),
    fps: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    durationFrames: z.number().int(),
    durationSeconds: z.number(),
  }),
  symbols: z.array(SYMBOL),
});

/**
 * A slide's key slug: its title, in `ANCHOR_ID`'s alphabet.
 *
 * The title rather than an ordinal or a hash, because the title is *already* how cuecraft names a
 * slide across files — `change.ts` resolves a quoted region by `{ file, slide: "<the exact title of
 * a slide in it>" }`, in those words. Slide titles are load-bearing identity here, and a retitled
 * slide already breaks references.
 *
 * Lower-cased with runs of anything else collapsed to one hyphen, which lands in the alphabet every
 * other identity in cuecraft uses (`../presentation/identity.ts`) and makes a key greppable,
 * shell-safe, and usable as a filename without escaping.
 */
export function slugFor(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A structural address as a key suffix: `root/payment/check` -> `payment/check`.
 *
 * The address `scope.ts` already resolves against, with its root removed because the slide slug is
 * standing in that position. Keeping the rest of the path is what makes `anchor:outside/payment/
 * check` unambiguous when two modules both contain something called `check`.
 */
function addressSuffix(address: Scope): string {
  return address === ROOT_SCOPE
    ? ROOT_SCOPE
    : address.startsWith(`${ROOT_SCOPE}/`)
      ? address.slice(ROOT_SCOPE.length + 1)
      : address;
}

/** Frames to seconds, for reading. Rounded so the document diffs cleanly; never read back. */
function seconds(frame: number, fps: number): number {
  return Number((frame / fps).toFixed(6));
}

/**
 * Project a finished compilation into the addresses it produced.
 *
 * Pure, and deterministic to the byte: the same compiled presentation and timeline always give the
 * same document, which is what lets a test assert on it and a consumer cache it.
 */
export function symbolTable(
  compiled: CompiledPresentation,
  timeline: Timeline,
  media: { readonly file: string },
): SymbolTable {
  const fps = timeline.fps;
  const claimed = new Set<string>();

  /**
   * The key, made unique.
   *
   * Collisions are genuinely possible — two slides titled "Results", one sentence recalled twice on
   * the same slide — and a deterministic suffix in emission order is better than a hash nobody can
   * read or a compile error over something that is not an authoring mistake.
   */
  const claim = (proposed: string): string => {
    if (!claimed.has(proposed)) {
      claimed.add(proposed);
      return proposed;
    }
    for (let attempt = 2; ; attempt += 1) {
      const candidate = `${proposed}-${attempt}`;
      if (claimed.has(candidate)) continue;
      claimed.add(candidate);
      return candidate;
    }
  };

  const symbols: CuecraftSymbol[] = [];
  const emit = (
    symbol: Omit<
      CuecraftSymbol,
      "key" | "fromSeconds" | "toSeconds" | "snapshotSeconds"
    > & { key: string },
  ): void => {
    symbols.push({
      ...symbol,
      key: claim(symbol.key),
      fromSeconds: seconds(symbol.fromFrame, fps),
      toSeconds: seconds(symbol.toFrame, fps),
      snapshotSeconds: seconds(symbol.snapshotFrame, fps),
    });
  };

  // Slugs are settled for every slide before anything is emitted, so that a slide's own slug is
  // known before the symbols that carry it in their prefix are built. Deduped among themselves
  // rather than against the key space: `slide:` keys cannot collide with any other kind's, so a
  // unique slug is a unique key.
  const slugs = uniqueSlugs(timeline.scenes);

  timeline.scenes.forEach((scene, index) => {
    const slug = slugs[index] as string;
    const slide = `slide:${slug}`;
    const onsets = compiled.slides[index]?.narration.clips ?? [];
    const window = contentWindow(scene);

    // --- the slide itself ---------------------------------------------------------------
    //
    // Required, and the reason the round exists: this is what uniform sampling misses.
    emit({
      key: slide,
      kind: "slide",
      label: scene.title,
      slide,
      ordinal: scene.ordinal,
      fromFrame: scene.from,
      toFrame: scene.from + scene.durationInFrames,
      contentFromFrame: window.from,
      contentToFrame: window.to,
      snapshotFrame: snapshotOf(scene, window),
    });

    // --- what was said ------------------------------------------------------------------
    //
    // The one kind keyed by position, because a sentence has no authored name. 1-based within the
    // slide in frame order, which is the order they are heard in.
    scene.clips.forEach((clip, clipIndex) => {
      emit({
        key: `utterance:${slug}/${clipIndex + 1}`,
        kind: "utterance",
        label: onsets[clipIndex]?.text ?? "",
        slide,
        fromFrame: clip.from,
        toFrame: clip.from + clip.durationInFrames,
        snapshotFrame: clip.from,
      });
    });

    // --- what the narration reached -----------------------------------------------------
    //
    // `timeline.ts` said of `Anchor`: "a later caption, seek or debugger would read it in the other
    // direction without this having to be rebuilt. Nothing today reads it backwards; the point is
    // that it could." This is that reading, and the record needed no change to allow it.
    //
    // The interval runs to the end of the slide because decision:17 makes an activation a transient
    // *and* an accumulation: the transient is 24 frames of renderer envelope, and the element stays
    // established behind it until the slide is gone.
    for (const anchor of scene.anchors) {
      emit({
        key: `anchor:${slug}/${addressSuffix(anchor.address)}`,
        kind: "anchor",
        label: anchor.id,
        slide,
        fromFrame: anchor.frame,
        toFrame: scene.from + scene.durationInFrames,
        snapshotFrame: anchor.frame,
      });
    }

    // --- what filled up over a sentence -------------------------------------------------
    for (const span of scene.spans) {
      emit({
        key: `span:${slug}/${addressSuffix(span.address)}`,
        kind: "span",
        label: span.id,
        slide,
        fromFrame: span.from,
        toFrame: span.from + span.durationInFrames,
        snapshotFrame: span.from,
      });
    }

    // --- which occurrence is current ----------------------------------------------------
    //
    // `step-N` and `take-N` are assigned by the compiler rather than by the author, and they are
    // exported anyway because they are *reserved* forms an author cannot collide with and cannot
    // reorder without reordering the protocol itself. That makes them addresses in the sense that
    // matters, which a clip index is not.
    for (const beat of scene.beats) {
      emit({
        key: `beat:${slug}/${addressSuffix(beat.address)}`,
        kind: "beat",
        label: scopeLeaf(beat.address),
        slide,
        fromFrame: beat.from,
        toFrame: beat.from + beat.durationInFrames,
        snapshotFrame: beat.from,
      });
    }

    // --- where the film quotes itself ---------------------------------------------------
    for (const recall of scene.recalls) {
      emit({
        key: `recall:${slug}/${recall.id}`,
        kind: "recall",
        label: recall.id,
        slide,
        fromFrame: recall.from,
        toFrame: recall.from + recall.durationInFrames,
        snapshotFrame: recall.from,
        sourceFromFrame: recall.sourceFrom,
      });
    }

    // --- where the film descends --------------------------------------------------------
    //
    // One symbol per balanced pair rather than one per threshold, because "when is the film inside
    // payment" is the query, and it is answered by an interval and not by two moments a consumer
    // has to pair up itself. `stackProblem` is the compiler's own assertion that the pairing is
    // sound; the matching here is the same walk, and an unclosed scope runs to the end of its
    // slide rather than being dropped.
    for (const call of scopeIntervals(scene)) {
      emit({
        key: `scope:${slug}/${addressSuffix(call.into)}`,
        kind: "scope",
        label: call.target,
        slide,
        fromFrame: call.from,
        toFrame: call.to,
        snapshotFrame: call.from,
      });
    }
  });

  // Frame order, then kind, then key. Every tie-break is total, so two runs cannot disagree about
  // the order of two symbols that begin on the same frame.
  const rank = (kind: SymbolKind): number => SYMBOL_KINDS.indexOf(kind);
  symbols.sort(
    (a, b) =>
      a.fromFrame - b.fromFrame ||
      rank(a.kind) - rank(b.kind) ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );

  return {
    format: SYMBOLS_FORMAT,
    version: SYMBOLS_VERSION,
    coordinates: { unit: "frame", interval: "[fromFrame, toFrame)", seconds: "derived" },
    presentation: { title: timeline.title },
    media: {
      file: media.file,
      fps,
      width: timeline.width,
      height: timeline.height,
      durationFrames: timeline.totalFrames,
      durationSeconds: seconds(timeline.totalFrames, fps),
    },
    symbols,
  };
}

/**
 * One slug per slide, distinct from each other.
 *
 * A title that slugs to nothing — punctuation, or a script outside the Latin alphabet — falls back
 * to `slide-<ordinal>`, which is the only place an ordinal is ever allowed into a key. Two slides
 * that slug to the same thing take `-2`, `-3` in deck order.
 */
function uniqueSlugs(scenes: readonly Scene[]): readonly string[] {
  const taken = new Set<string>();
  return scenes.map((scene) => {
    const proposed = slugFor(scene.title) || `slide-${scene.ordinal}`;
    if (!taken.has(proposed)) {
      taken.add(proposed);
      return proposed;
    }
    for (let attempt = 2; ; attempt += 1) {
      const candidate = `${proposed}-${attempt}`;
      if (taken.has(candidate)) continue;
      taken.add(candidate);
      return candidate;
    }
  });
}

/**
 * The narration's own window: arrived, and not yet leaving.
 *
 * Both ends are consequences of things already true rather than constants chosen here. Every
 * entry transition is capped to fit inside `pre_say` — `Presentation.tsx` takes
 * `fadeIn = min(fadeIn, before - appearAt)` — so nothing scene-level is still moving once narration
 * starts. And `fadeOut` lives entirely inside `post_say`, so nothing has begun to leave before
 * narration ends.
 *
 * Clamped to at least one frame wide, so that a fabricated timeline with no narration at all still
 * yields an interval a snapshot can sit inside rather than an empty one it cannot.
 */
function contentWindow(scene: Scene): { readonly from: number; readonly to: number } {
  const end = scene.from + scene.durationInFrames;
  const from = Math.min(scene.narrationFrom, end - 1);
  return {
    from,
    to: Math.min(
      end,
      Math.max(from + 1, scene.narrationFrom + scene.narrationDurationInFrames),
    ),
  };
}

/**
 * The frame worth looking at, for a slide.
 *
 * **The last frame of the slide's last sentence.** Three properties make it a safe place to look,
 * and each is a consequence of something already true rather than a constant chosen here:
 *
 * - **The slide has fully arrived.** Every entry transition is capped to fit inside `pre_say`, and
 *   the sentence is downstream of that (see `contentWindow`).
 * - **Everything the narration was going to establish is established.** Reveals are driven by
 *   narration reaching elements (decision:14, idea:6), so nothing further will appear.
 * - **The slide has not begun to leave.** `fadeOut` lives entirely inside `post_say`, after the
 *   narration ends, and this is inside the narration.
 *
 * ## Why the end of the sentence rather than its start
 *
 * The first rule this was written with was the *onset* — the frame the last sentence becomes
 * audible, which is where decision:13 puts an anchor. It is wrong, and looking at the frames it
 * chose is how that was found: on a `series` slide, `fills:` accumulates a population **across** the
 * sentence (decision:33, `Span`), so the onset is the moment before any of it exists. The extracted
 * snapshot of a slide about counting sixty-four things showed sixteen of them and a gauge reading
 * zero, which is a true frame of the film and a useless picture of the slide.
 *
 * The end of the sentence has no such case: an anchor lit at the onset is still established, a span
 * has finished filling, a beat is still the current one, and the sentence's own subtitle is still on
 * screen because a cue runs to its clip's end. It is the frame with the most of the slide in it.
 *
 * ## What it does not claim
 *
 * That the frame is well-composed, that the camera is in a wide shot, or that no element-level
 * entrance is in flight. On a deck that descends, the camera is wherever the last sentence put it.
 * The honest statement is the narrow one — **this is what the slide looks like when it has finished
 * saying what it had to say** — and `contentFromFrame`/`contentToFrame` are published so a consumer
 * wanting a different point does not have to guess where one is safe.
 */
function snapshotOf(
  scene: Scene,
  window: { readonly from: number; readonly to: number },
): number {
  const clip = scene.clips.at(-1);
  const chosen = clip === undefined ? window.from : clip.from + clip.durationInFrames - 1;
  return Math.min(Math.max(chosen, window.from), window.to - 1);
}

/**
 * Every scope the film descends into, as one interval per balanced pair.
 *
 * The same walk `stackProblem` makes, kept here rather than shared with it because the two want
 * different things from it: that one is an assertion that the flattening preserved the tree and
 * reports the first place it did not, and this one has to produce an interval for every descent
 * even on a scene where the assertion would fail. A scope that never returned runs to the end of
 * its slide, which is what the picture does.
 */
function scopeIntervals(
  scene: Scene,
): readonly { into: Scope; target: string; from: number; to: number }[] {
  const open: { into: Scope; target: string; from: number }[] = [];
  const closed: { into: Scope; target: string; from: number; to: number }[] = [];
  for (const call of [...scene.calls].sort((a, b) => a.frame - b.frame)) {
    if (call.kind === "enter") {
      open.push({ into: call.into, target: call.target, from: call.frame });
      continue;
    }
    const index = open.findLastIndex((entry) => entry.into === call.into);
    if (index === -1) continue;
    const [entered] = open.splice(index, 1);
    if (entered !== undefined) {
      closed.push({ ...entered, to: call.frame + call.durationInFrames });
    }
  }
  for (const entered of open) {
    closed.push({ ...entered, to: scene.from + scene.durationInFrames });
  }
  return closed.sort((a, b) => a.from - b.from);
}
