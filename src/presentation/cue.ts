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
       * Per-occurrence spelling substitutions applied before synthesis only. See decision:12 —
       * this repairs one word in one cue, and is not a dictionary.
       */
      readonly pronounce?: ReadonlyMap<string, string>;
    }
  | { readonly kind: "pause"; readonly scope: Scope; readonly milliseconds: number }
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
