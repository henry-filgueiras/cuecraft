import type { Scope } from "./scope.ts";

/**
 * One step in a narration.
 *
 * `say` used to be a single opaque string, which meant every phrase boundary and every silence
 * was Kokoro's guess. A cue list makes both authorable without inventing markup: there is no
 * inline syntax, nothing embedded in the prose, and exactly one thing a cue can be. Emphasis,
 * intonation and rate are deliberately absent because Kokoro cannot honour them (dragon:3), and
 * a control that does nothing is worse than no control.
 *
 * Its own module rather than a corner of `parse.ts` because a *world entity* now carries a
 * narration — a child module brings its own — and `world.ts` sits below the parser. Parsing is a
 * direction of dependency; the cue vocabulary is not.
 *
 * Two of the four kinds are never written by an author. `enter` is: it is the one word this
 * round added to the language. `exit` is derived, because the thing being tested is whether a
 * child's narration *running out* is the right unwind rule, and a return the author has to type
 * is a return the author can get wrong.
 */
export type NarrationCue =
  | {
      readonly kind: "speech";
      /** Which narration this cue belongs to. `root` on every deck that never descends. */
      readonly scope: Scope;
      readonly text: string;
      /**
       * Who says it, as a declared narrator's name (`./narrator.ts`).
       *
       * Resolved by the parser from where the cue sits — the cue's own `narrator:`, else its
       * slide's, else the deck's — and absent on every deck that never names one, which is what
       * keeps a deck written before this indistinguishable from one that declined the feature.
       *
       * It is a name and not a voice for the reason `address` is not an element index: the author
       * says who, and what that sounds like is resolved elsewhere. It reaches exactly this cue.
       * Nothing about a cue's narrator is inherited by the cue after it, because an identity that
       * accumulated down a list would make a sentence unreadable without reading everything above
       * it — the same objection decision:9 makes to anything downstream changing derived timing.
       */
      readonly narrator?: string;
      /**
       * The semantic identity this cue reaches, as the author wrote it. Not a time and not an
       * animation: the author states that this moment in the narration and some element are the
       * same idea, and the compiler works out when that happens (decision:14).
       */
      readonly activates?: string;
      /**
       * The same identity, resolved to a structural address (`./scope.ts`).
       *
       * Both are kept because they answer different questions. `activates` is what the author
       * typed and what the renderer matches against a node in one world; `address` is what the
       * compiler resolves an element index against, and it is the reason two scopes may both
       * contain something called `check`.
       */
      readonly address?: Scope;
      /**
       * A group of a bounded population that accumulates *across* this cue.
       *
       * The second kind of relationship between narration and content, and it is deliberately
       * not the first one wearing a hat. `activates` is a **point**: decision:14's claim is that
       * this moment in the narration and this element are the same idea, and the compiler works
       * out the frame it happens on. `fills` is an **interval**: the population is not reached
       * at an instant, it comes into being over a sentence, and the sentence's measured length
       * is how long that takes.
       *
       * They are separate fields rather than one field with a mode because they resolve to
       * different compiled records — an `Anchor` is a frame and a `Span` is a range — and a
       * component that forgot to check the mode would silently get the wrong one. A cue may
       * carry at most one of them: they are two different claims about the same moment.
       */
      readonly fills?: string;
      /** `fills`, resolved to a structural address, exactly as `address` resolves `activates`. */
      readonly fillsAddress?: Scope;
      /**
       * A state of this slide's film that the medium is held at while this cue is spoken.
       *
       * The dual of `activates:`, and stating the pair together is the whole of decision:65:
       *
       *     activates:   the narration reaches a representation
       *     during:      the representation reaches a state, and hands over the floor
       *
       * The author says that a sentence and a state of the medium are the same idea, which is
       * decision:14's claim with a different noun on one end. What they do **not** say is a time:
       * the film named the state and measured when it reaches it, and the compiler cuts the film
       * there (`../compile/footage.ts`).
       *
       * Several cues may name one state. That is one rendezvous with an ordered queue, not a
       * freeze and a resume per sentence — see the region rule in `./nest.ts`.
       */
      readonly during?: string;
      /**
       * Per-occurrence spelling substitutions applied before synthesis only. See decision:12 —
       * this repairs one word in one cue, and is not a dictionary.
       */
      readonly pronounce?: ReadonlyMap<string, string>;
    }
  | { readonly kind: "pause"; readonly scope: Scope; readonly milliseconds: number }
  | {
      /**
       * A silence one step of a protocol owns.
       *
       * Never authored, like `exit` and for a related reason: what it is measuring is the absence
       * of narration, and a duration the author types for a step they chose not to narrate would
       * be narration by another means. It behaves on the track exactly as a `pause` does — it is a
       * silence — and differs in carrying the address of the thing the silence is *for*, which is
       * what lets the compiler put a frame on a visual event nobody said anything over.
       *
       * The third silence-with-a-cause in the format, after `enter` and `exit`, and the first that
       * exists because a *body* asked for it rather than because a scope changed. How long it is
       * comes from `./beat.ts`, which is the only place in cuecraft where a duration is derived
       * from text rather than measured from sound.
       */
      readonly kind: "dwell";
      readonly scope: Scope;
      readonly milliseconds: number;
      /** The step this silence belongs to, as a structural address (`./scope.ts`). */
      readonly address: Scope;
    }
  | {
      /**
       * Go inside `target`'s child module, and let its narration take over.
       *
       * Authored as `enter: <entity>`. It occupies real time on the narration track — the
       * descent is a thing that happens, not a cut — and the parent says nothing underneath it.
       */
      readonly kind: "enter";
      readonly scope: Scope;
      readonly milliseconds: number;
      /** The entity being entered, named locally in `scope`. */
      readonly target: string;
      /** The scope its narration runs in. */
      readonly into: Scope;
    }
  | {
      /**
       * Come back out of `into`, into `scope`.
       *
       * Never authored. It is emitted where the child's cue list ends, which is the whole of the
       * unwind rule: completion returns, and nothing about the shape of the child's graph is
       * consulted to decide it.
       */
      readonly kind: "exit";
      readonly scope: Scope;
      readonly milliseconds: number;
      readonly target: string;
      readonly into: Scope;
    }
  | {
      /**
       * Say an earlier sentence again, with the picture it was said over.
       *
       * Authored as `recall: <id>`, where the id is one an earlier cue already wrote as
       * `activates:`. The author states that this moment and an earlier moment are the same idea,
       * exactly as decision:14 has them state that a moment and an element are — and the compiler
       * works out which clip that was, how long it ran, and which frames of which slide go with it.
       * There is no timecode in this format and this does not add one.
       *
       * **Not an `enter`, deliberately.** A descent takes the stream into a *scope*: a new world,
       * a camera moving through a threshold that costs `ENTER_MS`, and new speech synthesized for
       * it. A recall does none of those. Nothing is entered, nothing is synthesized, and the audio
       * that plays is a WAV that already exists on disk. Reusing `NarrationCall` would make the
       * compiled timeline assert three things that are false, so this is its own kind — and the
       * only thing it borrows from a call is the *semantics*: the callee owns the stream, and
       * completion returns.
       *
       * **It carries no duration.** Every other occupant of the track has one by the time it is a
       * cue — authored for a pause, fixed for a threshold, derived for a dwell. A recall's is a
       * measurement already taken of a clip compiled earlier, and a field for it here would be a
       * field somebody could fill in with a different number.
       */
      readonly kind: "recall";
      readonly scope: Scope;
      /** The anchor's identity, as the author wrote it. */
      readonly target: string;
      /**
       * The 1-based ordinal of the slide whose narration declared it.
       *
       * Resolved rather than authored, and kept beside `target` for the reason `address` is kept
       * beside `activates`: one is what the source says and the other is what it resolved to.
       * Absent until `./recall.ts` has run, which is the only thing that may fill it in.
       */
      readonly sourceOrdinal?: number;
    }
  | {
      /**
       * Play the film this slide's program computed, from here.
       *
       * Authored as `play: <output>`, where the output is the one the exhibit's program declares
       * (decision:64). The third verb in this language, after `enter:` and `recall:`, and the
       * second whose duration is **borrowed**: the medium was measured at materialization, and
       * everything about the playback — how long it lasts, what is on screen — is that measurement
       * read again.
       *
       * **Not a scheduler, and not a second clock.** By the time this reaches the compiler it is a
       * leaf occupant of the one serial track with a known length, exactly like a pause. The
       * fields below are what `../compile/footage.ts` filled in, and they are what makes a *slice*
       * of a medium expressible without anything downstream learning the word: a slice is a local
       * media interval, a rate at which it is consumed, and nothing else (decision:63).
       */
      readonly kind: "play";
      readonly scope: Scope;
      /** The output the program declares, as the author wrote it. */
      readonly source: string;
      /**
       * Local media seconds this slice begins at, and the seconds it runs to.
       *
       * Both absent until `../compile/footage.ts` has run, for `recall`'s `sourceOrdinal` reason:
       * one is what the source says and the other is what it resolved to, and the resolution is a
       * measurement that does not exist at parse time.
       *
       * Endpoints rather than a length, because two adjacent slices have to agree about the frame
       * between them to the frame. `to` of one slice is `from` of the next, by construction.
       */
      readonly fromSeconds?: number;
      readonly toSeconds?: number;
      /**
       * Local media seconds consumed per presentation second.
       *
       * One for ordinary playback. Anything else is a time mapping with a different slope, which is
       * `RecalledCanvas`'s expression with a coefficient on it — see decision:63.
       */
      readonly rate?: number;
    }
  | {
      /**
       * Show an interval of the film again, from a state it already passed through.
       *
       * Authored as `replay: <moment>`, inside an aside. It says: *that happened quickly, watch it
       * again* — and it is the fourth verb, the last this round adds, and the one that survives the
       * shortest. **Nothing downstream ever sees a `replay`.** `../compile/footage.ts` turns it
       * into an ordinary slice whose media interval runs from the named state to the state the
       * narration is currently holding at, consumed at a slower rate. That is decision:63's last
       * consequence made real: a replay is a time mapping with a different slope, and the timeline
       * does not learn the word.
       *
       * **There is no rate here and there will not be one.** A key that let a deck set a playback
       * speed would be a projection instruction, which decision:10 exists to refuse, and it would
       * be the first one in this format. How slow a replay is is derived — see `REPLAY_RATE`.
       */
      readonly kind: "replay";
      readonly scope: Scope;
      /** The state to replay from, named as the program declared it. */
      readonly target: string;
    };

/**
 * How long the two thresholds take.
 *
 * Durations rather than frames, because they live on the narration track next to `pause`, and
 * the one rounding rule that turns seconds into frames belongs to `../compile/timeline.ts` and
 * to nothing else.
 *
 * Entry is longer than exit for the reason decision:25 gave: opening something is an arrival and
 * wants to be savoured, closing it is a departure and a slow one reads as reluctance. Both are
 * long enough to hold a camera move and a beat, and neither is authorable — a key that let a deck
 * set them would be a camera instruction wearing a duration's clothes.
 */
export const ENTER_MS = 1900;
export const EXIT_MS = 1700;

/**
 * The text actually handed to the synthesizer.
 *
 * Whole-word and case-insensitive, applied only to this cue. The authored text is left alone so
 * that what the source says and what gets spoken stay separately inspectable — a caption or a
 * frozen asset wants the former (decision:12).
 */
export function spokenText(cue: NarrationCue): string {
  if (cue.kind !== "speech") return "";
  if (cue.pronounce === undefined) return cue.text;
  let text = cue.text;
  for (const [word, spelling] of cue.pronounce) {
    text = text.replace(wordPattern(word), spelling);
  }
  return text;
}

/** Whole-word, case-insensitive. Substring replacement would corrupt neighbouring words. */
export function wordPattern(word: string): RegExp {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
}

/**
 * Block scalars carry the author's line breaks, which are a reading convenience rather than an
 * instruction — a newline is not a pause. Authors who want one now write one (dragon:3).
 */
export function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
