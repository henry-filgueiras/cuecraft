import type { CompiledPresentation } from "../compile/compile.ts";
import type { Scene } from "../compile/timeline.ts";
import { SPEAKER_COLORS } from "./theme.ts";

/**
 * The narration, projected as text, on the clock it was already on.
 *
 * There is no scheduler here and there must never be one. By the time this module runs, every
 * utterance has been synthesized, measured, and placed at an absolute frame for a measured
 * number of frames; "which sentence is on screen now" is therefore not a timing question at all
 * but a *lookup* in a list that is already final. That is the whole architecture:
 *
 *     authored narration -> synthesis -> measured clips -> compiled timeline -> subtitle
 *
 * and never the other way. A subtitle reads the timeline; it never participates in deriving it.
 * decision:9 said nothing downstream may change derived timing, and this is one layer further
 * out than anything that rule has been applied to before.
 *
 * ## Whole utterances, and why not words
 *
 * A cue is shown complete, from the frame its clip begins to the frame the next one does. It is
 * not revealed word by word, because cuecraft does not know when a word is said. The arithmetic
 * that looks like it does —
 *
 *     word duration = clip duration / word count
 *
 * — is a lie with a plausible shape: speech is not uniform across words, punctuation, pauses or
 * phonemes, and a highlight that lands on the wrong word thirty times a second is worse than no
 * highlight. Real word times need a forced aligner over the transcript and the WAV, which is a
 * different round with a different dependency; see idea:19 for the seam it would use.
 *
 * decision:13 measures the *onset* of a clip rather than assuming it, for exactly this reason.
 * Guessing inside the clip would be the same mistake at a smaller scale.
 *
 * ## Where a subtitle stops
 *
 * At the next utterance of the same scene, and otherwise at the end of that scene's narration.
 * Two consequences, both deliberate:
 *
 * - **An authored `pause:` is bridged.** A subtitle that blinked out for the 600ms between two
 *   sentences would draw attention to the gap rather than to either sentence.
 * - **A subtitle never outlives its slide.** It stops where narration stops, which is where
 *   `post_say` begins and the composition starts to leave, so nothing is ever read over a slide
 *   that is fading or over the one after it.
 *
 * Nothing is shown during `pre_say`, before anything has been said. A film opens on its title.
 */

/** Who said it, as the deck named them — never as the provider realised them. */
export interface SubtitleSpeaker {
  /**
   * The declared narrator's id, exactly as written in `narrators:`.
   *
   * A *name*, not a voice: `SpeechClip` carries both and only one of them is a fact about the
   * film. A deck that never named a cast has no speaker here at all, and nothing in this module
   * can reach `af_heart` to invent one — a provider tensor name is not a character.
   */
  readonly name: string;
  /** From `SPEAKER_COLORS`, by order of first appearance. Never the sole carrier of identity. */
  readonly color: string;
}

export interface SubtitleCue {
  /** 1-based deck-wide, in the order they are heard — the same numbering `ClipFact` uses. */
  readonly ordinal: number;
  /**
   * The sentence as the author wrote it, whole.
   *
   * The author's text rather than `spokenText`'s: a per-occurrence respelling is an instruction
   * to the synthesizer about how to pronounce a word, not a claim that the word is spelled that
   * way (decision:12). Never shortened, at any size, in any state — decision:28.
   */
  readonly text: string;
  /** Absent on every cue of every deck that names no cast, and on some cues of one that does. */
  readonly speaker?: SubtitleSpeaker;
  /** Exactly the frame the compiler placed this clip at. Not recomputed, not adjusted. */
  readonly from: number;
  /** The next utterance of this scene, or the end of this scene's narration. */
  readonly until: number;
}

/**
 * Whether this deck's film ever changes speaker.
 *
 * decision:37's stance, applied to a label instead of to a protocol's reply notation: a derived
 * notation is withheld rather than applied sometimes. A deck with one narrator gains nothing from
 * being told, on every sentence, that the one narrator is speaking — the label would be noise
 * with a colour on it. A deck with two gains the whole point of the feature.
 *
 * So the label is deck-wide and all-or-nothing, and what decides it is the *film* rather than the
 * cast: a deck may declare four narrators and use one, and what a viewer needs to keep track of is
 * how many they will actually hear.
 */
function labelled(named: readonly (string | undefined)[]): boolean {
  return new Set(named.filter((name) => name !== undefined)).size >= 2;
}

/**
 * A colour per narrator, by order of first appearance.
 *
 * First appearance rather than declaration order, because it needs no plumbing and gives the
 * better answer anyway: whoever opens the film gets the deck's own accent, and a deck's opening
 * narrator is the one `defaults.narrator` almost always names. Deterministic, so two renders of
 * an unedited deck agree.
 *
 * The palette is short and cuecraft's own (`SPEAKER_COLORS`). Past its length it repeats, and that
 * is a documented limit rather than a bug: colour is never the sole carrier of identity here, so a
 * fifth narrator sharing the first one's colour still has their name above every line they speak.
 */
function speakerColors(named: readonly (string | undefined)[]): Map<string, string> {
  const colors = new Map<string, string>();
  for (const name of named) {
    if (name === undefined || colors.has(name)) continue;
    const color = SPEAKER_COLORS[colors.size % SPEAKER_COLORS.length];
    if (color !== undefined) colors.set(name, color);
  }
  return colors;
}

/**
 * The whole deck's subtitles, in playback order.
 *
 * Takes the compiled presentation for *what was said and by whom*, and the finished scenes for
 * *where it landed* — the two halves of a `SpeechClip` after the timeline has placed it. Called
 * from the last statement of `buildTimeline`, beside `freezeFacts`, for the reason given there:
 * everything above is settled, and nothing below may write to what it produced.
 *
 * Returns an empty track when the deck did not ask for subtitles, so that "off" is not a branch
 * anybody downstream has to remember.
 */
export function subtitleTrack(
  compiled: CompiledPresentation,
  scenes: readonly Scene[],
): readonly SubtitleCue[] {
  if (!compiled.subtitles) return [];

  const spokenBy = compiled.slides.flatMap((slide) =>
    slide.narration.clips.map((clip) => clip.narrator),
  );
  const withSpeakers = labelled(spokenBy);
  const colors = speakerColors(spokenBy);

  const cues: SubtitleCue[] = [];
  scenes.forEach((scene, index) => {
    const spoken = compiled.slides[index]?.narration.clips ?? [];
    const narrationUntil = scene.narrationFrom + scene.narrationDurationInFrames;
    scene.clips.forEach((placed, clipIndex) => {
      const source = spoken[clipIndex];
      if (source === undefined) return;
      const name = source.narrator;
      const color = name === undefined ? undefined : colors.get(name);
      cues.push({
        ordinal: cues.length + 1,
        text: source.text,
        from: placed.from,
        // To the next utterance of this slide, or to the end of what this slide says. Never
        // shorter than a frame: a cue nobody could see would be a cut.
        until: Math.max(
          placed.from + 1,
          scene.clips[clipIndex + 1]?.from ?? narrationUntil,
        ),
        ...(withSpeakers && name !== undefined && color !== undefined
          ? { speaker: { name, color } }
          : {}),
      });
    });
  });
  return cues;
}

/**
 * The cue on screen at a frame, or nothing.
 *
 * "Nothing" rather than "the most recent one" — which is where this parts company with
 * `clipAt` in `../compile/facts.ts`, and the difference is what each is for. A figure's marker
 * is an *instrument* and must not vanish in a silence; a subtitle is *the sentence being spoken*
 * and there is no honest thing for it to say when nobody is speaking.
 *
 * Linear rather than binary: a deck's whole narration is tens of cues, this runs once per frame,
 * and a scan that anybody can check against the interval rule is worth more than the microseconds.
 */
export function subtitleAt(
  cues: readonly SubtitleCue[],
  frame: number,
): SubtitleCue | undefined {
  for (const cue of cues) {
    if (cue.from > frame) return undefined;
    if (frame < cue.until) return cue;
  }
  return undefined;
}
