import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import type { ExhibitResource } from "../presentation/exhibit.ts";
import type {
  AuthoredSlide,
  Narrator,
  Presentation,
  Scope,
} from "../presentation/parse.ts";
import { ROOT_SCOPE, spokenText } from "../presentation/parse.ts";
import type { TypographyId } from "../render/typography.ts";

/**
 * The compilation boundary: authored intent plus measured narration.
 *
 * This is deliberately not the presentation IR parked in idea:3. It is the smallest thing
 * that falls out of needing narration measured before a frame can exist (dragon:1): the
 * authored slide, the audio that was actually produced for it, and the derived scene
 * length. It carries no frames, no pixels, and no React — those belong downstream, so that
 * iterating on visual design never re-synthesizes anything.
 */

/** One synthesized fragment of a slide's narration. */
export interface SpeechClip {
  /** 1-based position among this slide's speech cues. */
  readonly ordinal: number;
  readonly text: string;
  /** Absolute path to the WAV on disk. */
  readonly path: string;
  /** Path relative to the render workspace's public directory, for `staticFile()`. */
  readonly src: string;
  /** Seconds from the start of the slide's narration to the start of this clip. */
  readonly offsetSeconds: number;
  /** Measured from the returned samples, never estimated. */
  readonly durationSeconds: number;
  /**
   * Seconds from the clip's start to its first audible sample. Kokoro puts about 310ms of
   * silence in front of every utterance; a visual event aligned to the clip rather than to
   * the sound would land that much early (decision:13).
   */
  readonly leadingSilenceSeconds: number;
  /** The semantic identity this clip reaches, if the authored cue named one. */
  readonly activates?: string;
  /** The same identity as a structural address, which is what resolution uses. */
  readonly address?: Scope;
  /** A population group that accumulates across this clip, as a structural address. */
  readonly fills?: string;
  readonly fillsAddress?: Scope;
  /** Which narration this clip belongs to. `root` on every deck that never descends. */
  readonly scope: Scope;
  /**
   * Who spoke it, as a declared narrator's name, and absent when the deck never named one.
   *
   * Recorded beside the voice for the reason `activates` is recorded beside `address`: one is what
   * the source says and the other is what it resolved to, and only the first survives a change of
   * provider.
   */
  readonly narrator?: string;
  /** The voice and rate this clip was actually synthesized at, as the seam reported them. */
  readonly voice: string;
  readonly speed: number;
}

/**
 * A scope transition on the narration track.
 *
 * Kept beside the clips rather than folded into them because it is the same kind of thing: a
 * measured position on one serial track. Entry and exit are silences with a *cause* — the reason
 * the parent stops talking is that something else is about to — and giving them a position here
 * is what makes "the parent must not continue underneath the child" a fact about the timeline
 * rather than a hope about the renderer.
 */
export interface NarrationCall {
  readonly kind: "enter" | "exit";
  /** The scope making the call, or being returned to. */
  readonly scope: Scope;
  /** The scope being entered, or left. */
  readonly into: Scope;
  /** The entity, named locally in `scope`. */
  readonly target: string;
  readonly offsetSeconds: number;
  readonly durationSeconds: number;
}

/**
 * An earlier clip, placed a second time.
 *
 * The fourth kind of occupant of the one serial track, and the first whose duration was neither
 * authored, fixed, nor derived: it is **borrowed**. The clip it names was synthesized and measured
 * when the slide that first said it was compiled, and everything about the replay — how long it
 * lasts, what is heard, which frames of which slide go with it — is that measurement read again.
 *
 * Nothing is synthesized for one. That is not an optimization and must not be mistaken for
 * decision:3's content-addressed cache, which is still parked (idea:8): a cache would notice that
 * two *different* cues happen to say the same words. This is one cue naming another, by identity,
 * in the source.
 *
 * `src` is copied rather than looked up downstream so that the record is complete on its own — the
 * timeline places audio from it without having to reach back into another slide's clip list, and
 * the compiled output says plainly which file gets played twice.
 */
export interface NarrationRecall {
  /** The anchor's identity, as the author wrote it in both places. */
  readonly id: string;
  /** 1-based ordinal of the slide being replayed. */
  readonly sourceOrdinal: number;
  /** Index into that slide's `narration.clips`. */
  readonly sourceClipIndex: number;
  /** The same `src` that slide's clip carries. The same file, placed again. */
  readonly src: string;
  readonly scope: Scope;
  readonly offsetSeconds: number;
  /**
   * The source clip's complete measured duration — including its leading silence.
   *
   * The whole clip, because the whole clip is what was heard the first time. Trimming the onset
   * would make the replay a *different* utterance from the one being quoted, and decision:13's
   * measurement exists to place things against the sound, not to cut it off.
   */
  readonly durationSeconds: number;
}

/**
 * One slice of a film, placed on the narration track.
 *
 * The fifth kind of occupant, and the second whose duration is **borrowed** rather than authored,
 * fixed, derived or measured here (decision:64). The film was measured out of its own container at
 * materialization; `../compile/footage.ts` cut it into slices; this places them. Nothing in this
 * file knows how long a film is, and nothing in it may decide.
 *
 * `fromSeconds` and `toSeconds` are **local media time** and travel unconverted all the way to the
 * timeline, which is the whole of the local/global separation decision:63 found already present in
 * cuecraft. `offsetSeconds` is presentation time and is the only thing here on the deck's clock.
 *
 * `rate` is how much media time one second of presentation time consumes. It is 1 for ordinary
 * playback, and the field exists because a slice's two clocks are already two clocks — giving the
 * mapping a slope costs a multiplication and buys the freeze and the replay for nothing.
 */
export interface NarrationPlayback {
  /** The output the program declared, as the author wrote it. Carried for diagnostics. */
  readonly source: string;
  /** The same `src` the materialized resource carries: public-directory relative. */
  readonly src: string;
  readonly scope: Scope;
  readonly offsetSeconds: number;
  /** Presentation seconds: `(to - from) / rate`. What the cursor advances by. */
  readonly durationSeconds: number;
  /** Local media seconds. Absolute within the film, and never on the deck's clock. */
  readonly fromSeconds: number;
  readonly toSeconds: number;
  readonly rate: number;
  /**
   * The whole film's measured length, carried so the timeline can work out its last frame.
   *
   * Not redundant with `toSeconds`, and the difference is a real hazard rather than pedantry. An
   * MP4 states its duration in its own timescale, so a 244-frame film at 30fps reports 8.134s
   * where the frames account for 8.1333s — and `framesFor` rounding *up* would then ask the film
   * for a frame it does not have. See `Playback.sourceLast`.
   */
  readonly mediaSeconds: number;
}

/**
 * A silence a protocol step owns, positioned on the same track as everything else.
 *
 * Beside the clips and the calls rather than folded into either, for the reason `NarrationCall`
 * gives: these are all occupants of one serial track, and what this layer computes is *when*. A
 * dwell is the only occupant whose duration was derived rather than measured — see
 * `../presentation/beat.ts` — and keeping it a separate record is what makes that visible in the
 * compiled output instead of indistinguishable from a synthesized clip.
 */
export interface NarrationDwell {
  /** The step this silence belongs to, as a structural address. */
  readonly address: Scope;
  readonly scope: Scope;
  readonly offsetSeconds: number;
  readonly durationSeconds: number;
}

/**
 * A slide's narration as a track rather than a file.
 *
 * Speech cues become separate clips and pauses become the space between them. Nothing is
 * mixed or concatenated here — the clips are placed on Remotion's timeline, which already
 * owns that (decision:5). The only thing this layer computes is *when*.
 */
export interface Narration {
  readonly clips: readonly SpeechClip[];
  /** Every descent and return, in order. Empty on every deck that never descends. */
  readonly calls: readonly NarrationCall[];
  /** Every unnarrated protocol step's silence, in order. Empty on every deck without one. */
  readonly dwells: readonly NarrationDwell[];
  /** Every earlier clip said again, in order. Empty on every deck that never recalls. */
  readonly recalls: readonly NarrationRecall[];
  /** Every slice of film played, in order. Empty on every deck without a temporal exhibit. */
  readonly playbacks: readonly NarrationPlayback[];
  /** Speech plus authored pauses, end to end. */
  readonly durationSeconds: number;
  /**
   * What this slide opens in. The clips are authoritative — a slide may change narrator partway
   * through, and each clip carries the voice it was actually synthesized at.
   */
  readonly voice: string;
  readonly speed: number;
}

export interface CompiledSlide extends AuthoredSlide {
  readonly narration: Narration;
  /** `max(minimum, pre_say + narration + post_say)`, in milliseconds. */
  readonly sceneMs: number;
}

export interface CompiledPresentation {
  readonly title: string;
  readonly slides: readonly CompiledSlide[];
  /** Handed to Remotion as its public directory; every `src` above is relative to it. */
  readonly publicDir: string;
  /**
   * Whether the deck asked for its narration on screen as well as in the air.
   *
   * Carried the way `title` is — forward, unread — because it is authored intent that only the
   * renderer acts on. Nothing in this file branches on it, and that is the point: a subtitle is
   * derived from the clips below *after* they exist, so it cannot reach anything that decides how
   * long they are or where they go (`../render/subtitle.ts`).
   */
  readonly subtitles: boolean;
  /**
   * The typography profile the presentation resolved to, carried forward for the same reason
   * `subtitles` is: authored intent that only the renderer acts on, and that nothing in this file
   * may branch on. It is an identity (`../render/typography.ts`), never a font family.
   */
  readonly typography: TypographyId;
}

/**
 * The narration seam, narrowed to what compilation needs.
 *
 * decision:8 was explicit that `synthesize()` is not the provider interface from
 * decision:4. This is not that interface either — it is the one function signature the
 * compiler depends on, which is what lets the whole pipeline be tested without a 325 MB
 * model load.
 */
export interface SynthesizeNarration {
  (request: { text: string; output: string; voice?: string; speed?: number }): Promise<{
    durationSeconds: number;
    leadingSilenceSeconds: number;
    voice: string;
    speed: number;
  }>;
}

export interface CompileOptions {
  /** Disposable directory for this presentation's narration and bundle. */
  readonly workspace: string;
  readonly synthesize: SynthesizeNarration;
  readonly onProgress?: (slide: AuthoredSlide, narration: Narration) => void;
}

/**
 * The narrator a cue named, resolved against the deck's cast.
 *
 * A cue that names nobody speaks in the deck's own voice, which is every cue in every deck written
 * before a cast existed. A cue that names somebody the deck does not declare cannot come out of the
 * parser — it is rejected there, with the cast listed — so reaching this is a caller that built a
 * `Presentation` by hand and got it wrong, and saying so beats silently synthesizing the wrong
 * voice.
 */
function narratorFor(
  named: string | undefined,
  presentation: Presentation,
): Narrator | undefined {
  if (named === undefined) return undefined;
  const narrator = presentation.narrators.get(named);
  if (narrator === undefined) {
    throw new Error(
      `narration names narrator ${JSON.stringify(named)}, which this presentation does not declare`,
    );
  }
  return narrator;
}

/**
 * The clip a recall names, in a slide that has already been compiled.
 *
 * Every failure below is a caller that built a `Presentation` by hand, or a compiler bug: the
 * parser resolves each recall against the whole deck and refuses a missing, ambiguous, forward or
 * same-slide target before anything reaches here (`../presentation/recall.ts`). Saying so beats
 * silently placing a second of nothing where a sentence was supposed to be.
 *
 * The clip is found by the identity the author wrote rather than by a stored index, because the
 * identity is the thing the source actually says and an index would be a second encoding of the
 * same fact that could disagree with it.
 */
function recalled(
  compiled: readonly CompiledSlide[],
  target: string,
  sourceOrdinal: number | undefined,
  ordinal: number,
): { ordinal: number; clipIndex: number; clip: SpeechClip } {
  if (sourceOrdinal === undefined) {
    throw new Error(
      `slide ${ordinal}: narration recalls ${JSON.stringify(target)}, which was never resolved ` +
        "to a slide",
    );
  }
  const source = compiled.find((slide) => slide.ordinal === sourceOrdinal);
  if (source === undefined) {
    throw new Error(
      `slide ${ordinal}: narration recalls ${JSON.stringify(target)} from slide ${sourceOrdinal}, ` +
        "which has not been compiled; a recall only reaches backwards",
    );
  }
  const clipIndex = source.narration.clips.findIndex(
    (clip) => clip.scope === ROOT_SCOPE && clip.activates === target,
  );
  const clip = source.narration.clips[clipIndex];
  if (clip === undefined) {
    throw new Error(
      `slide ${ordinal}: narration recalls ${JSON.stringify(target)}, which slide ${sourceOrdinal} ` +
        "does not activate",
    );
  }
  return { ordinal: sourceOrdinal, clipIndex, clip };
}

/**
 * The film a `play:` names, on a slide that has already been materialized.
 *
 * Every failure below is a caller that built a `Presentation` by hand, or a compiler bug:
 * `bindNarration` refuses a `play:` on a slide with no exhibit, and `../compile/footage.ts` refuses
 * a name the program did not declare and a film nobody plays. Saying so beats silently placing a
 * few seconds of nothing where an animation was supposed to be.
 */
function footage(
  slide: AuthoredSlide,
  source: string,
): Extract<ExhibitResource, { kind: "footage" }> {
  const resource = slide.body.kind === "exhibit" ? slide.body.resource : undefined;
  if (resource?.kind !== "footage") {
    throw new Error(
      `slide ${slide.ordinal}: narration plays ${JSON.stringify(source)}, and this slide has no ` +
        "materialized film",
    );
  }
  return resource;
}

/** `max(minimum slide duration, pre_say + narration + post_say)` — decision:1. */
export function deriveSceneMs(input: {
  minSlideMs: number;
  preSayMs: number;
  narrationMs: number;
  postSayMs: number;
}): number {
  return Math.max(input.minSlideMs, input.preSayMs + input.narrationMs + input.postSayMs);
}

export function narrationFileName(slide: { ordinal: number }, clip: number): string {
  return `slide-${String(slide.ordinal).padStart(2, "0")}-${String(clip).padStart(2, "0")}.wav`;
}

/**
 * Synthesize every slide's narration and derive its scene length.
 *
 * Sequential on purpose: one Kokoro graph is resident per process (decision:8) and this
 * round is not optimizing throughput. Each speech cue is synthesized exactly once per
 * invocation — the content-addressed cache of decision:3 is still deliberately absent.
 */
export async function compilePresentation(
  presentation: Presentation,
  options: CompileOptions,
): Promise<CompiledPresentation> {
  const publicDir = join(options.workspace, "public");
  const narrationDir = join(publicDir, "narration");

  // Stale audio from a previous render of an edited deck is worse than a slow render:
  // without the cache's content addressing there is nothing to tell the two apart.
  await rm(narrationDir, { recursive: true, force: true });
  await mkdir(narrationDir, { recursive: true });

  const slides: CompiledSlide[] = [];
  for (const slide of presentation.slides) {
    const clips: SpeechClip[] = [];
    const calls: NarrationCall[] = [];
    const dwells: NarrationDwell[] = [];
    const recalls: NarrationRecall[] = [];
    const playbacks: NarrationPlayback[] = [];
    let offsetSeconds = 0;

    for (const cue of slide.say) {
      if (cue.kind === "pause") {
        offsetSeconds += cue.milliseconds / 1000;
        continue;
      }

      // The one occupant of the track that costs nothing to produce. Slides are compiled in order
      // and a recall only ever reaches backwards (`../presentation/recall.ts`), so the clip it
      // names is already synthesized, already measured, and sitting in `slides` — which is exactly
      // why the resolution rule is backwards-only rather than merely conventional.
      if (cue.kind === "recall") {
        const source = recalled(slides, cue.target, cue.sourceOrdinal, slide.ordinal);
        recalls.push({
          id: cue.target,
          sourceOrdinal: source.ordinal,
          sourceClipIndex: source.clipIndex,
          src: source.clip.src,
          scope: cue.scope,
          offsetSeconds,
          durationSeconds: source.clip.durationSeconds,
        });
        offsetSeconds += source.clip.durationSeconds;
        continue;
      }

      // The other occupant that costs nothing to produce, and the one this round added. Everything
      // about it was settled before a syllable was synthesized: `../compile/footage.ts` measured
      // the film and cut it, and what is left here is arithmetic on two numbers it wrote down.
      if (cue.kind === "play") {
        const source = footage(slide, cue.source);
        const rate = cue.rate ?? 1;
        const durationSeconds = ((cue.toSeconds ?? 0) - (cue.fromSeconds ?? 0)) / rate;
        playbacks.push({
          source: cue.source,
          src: source.src,
          scope: cue.scope,
          offsetSeconds,
          durationSeconds,
          fromSeconds: cue.fromSeconds ?? 0,
          toSeconds: cue.toSeconds ?? 0,
          rate,
          mediaSeconds: source.durationSeconds,
        });
        offsetSeconds += durationSeconds;
        continue;
      }

      // A silence with a cause, exactly as a descent is: it occupies the track like a pause and
      // gets a position, because something visual has to be timed against it. Nothing is
      // synthesized — that is the whole of what makes this step a silent one.
      if (cue.kind === "dwell") {
        dwells.push({
          address: cue.address,
          scope: cue.scope,
          offsetSeconds,
          durationSeconds: cue.milliseconds / 1000,
        });
        offsetSeconds += cue.milliseconds / 1000;
        continue;
      }

      // A descent occupies the track exactly as a pause does, and that is the point rather than
      // an economy: the silence the camera moves through is *on the same clock* as everything
      // else, so nothing has to be arranged afterwards for the parent to stop talking while the
      // child speaks. Serial, by construction.
      if (cue.kind === "enter" || cue.kind === "exit") {
        calls.push({
          kind: cue.kind,
          scope: cue.scope,
          into: cue.into,
          target: cue.target,
          offsetSeconds,
          durationSeconds: cue.milliseconds / 1000,
        });
        offsetSeconds += cue.milliseconds / 1000;
        continue;
      }

      // Unreachable from `cuecraft render`: `../presentation/nest.ts` refuses a `replay:` outside
      // an aside, and `./footage.ts` turns every one inside an aside into an ordinary slice before
      // this stage runs. A survivor here is a compiler bug, and synthesizing it as speech would
      // put a sentence saying "replay" into the film.
      if (cue.kind === "replay") {
        throw new Error(
          `slide ${slide.ordinal}: a replay of ${JSON.stringify(cue.target)} reached synthesis; ` +
            "every replay should have been lowered into a slice at materialization",
        );
      }

      // Who says it, and therefore which voice this one call gets. The whole of what a narrator
      // changes: one argument to one synthesis call, chosen per cue. Nothing below this line
      // knows a narrator exists — the clip is placed by its measured length exactly as every
      // clip always has been, which is the invariant the feature was built to keep.
      const narrator = narratorFor(cue.narrator, presentation);
      const voiceFor = narrator?.voice ?? presentation.voice;

      const fileName = narrationFileName(slide, clips.length + 1);
      const spoken = await options.synthesize({
        // What is synthesized, which may differ from what the source says by exactly the
        // per-occurrence spellings the author supplied (decision:12).
        text: spokenText(cue),
        output: join(narrationDir, fileName),
        ...(voiceFor === undefined ? {} : { voice: voiceFor }),
        speed: narrator?.speed ?? presentation.speed,
      });

      clips.push({
        ordinal: clips.length + 1,
        text: cue.text,
        path: join(narrationDir, fileName),
        src: `narration/${fileName}`,
        offsetSeconds,
        durationSeconds: spoken.durationSeconds,
        leadingSilenceSeconds: spoken.leadingSilenceSeconds,
        scope: cue.scope,
        voice: spoken.voice,
        speed: spoken.speed,
        ...(cue.narrator === undefined ? {} : { narrator: cue.narrator }),
        ...(cue.activates === undefined ? {} : { activates: cue.activates }),
        ...(cue.address === undefined ? {} : { address: cue.address }),
        ...(cue.fills === undefined ? {} : { fills: cue.fills }),
        ...(cue.fillsAddress === undefined ? {} : { fillsAddress: cue.fillsAddress }),
      });
      offsetSeconds += spoken.durationSeconds;
    }

    // A trailing pause counts: an author who asks for silence before the slide turns should
    // get it, and `post_say` is a deck-wide default rather than a per-slide instrument.
    const narration: Narration = {
      clips,
      calls,
      dwells,
      recalls,
      playbacks,
      durationSeconds: offsetSeconds,
      voice: clips[0]?.voice ?? presentation.voice ?? "",
      speed: clips[0]?.speed ?? presentation.speed,
    };

    options.onProgress?.(slide, narration);

    slides.push({
      ...slide,
      narration,
      sceneMs: deriveSceneMs({
        minSlideMs: slide.minSlideMs,
        preSayMs: slide.preSayMs,
        narrationMs: narration.durationSeconds * 1000,
        postSayMs: slide.postSayMs,
      }),
    });
  }

  return {
    title: presentation.title,
    slides,
    publicDir,
    subtitles: presentation.subtitles,
    typography: presentation.typography,
  };
}
