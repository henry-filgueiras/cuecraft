import { parse as parseYaml, YAMLParseError } from "yaml";
import { z } from "zod";

import { DURATION_HINT, isDurationLiteral, parseDurationMs } from "./duration.ts";

/**
 * The presentation source: YAML in, a validated authored presentation out.
 *
 * This module knows nothing about narration, frames, or Remotion. It answers exactly one
 * question — "is this a presentation, and what does it say?" — and answers it with
 * messages an author can act on without reading the schema.
 *
 * The shape is the one pinned by examples/witnessglass.yaml and decision:2: a title,
 * optional defaults, and a list of slides that each pair a `slide` with a `say`. Validation
 * is strict: an unrecognized key is far more likely to be a typo silently doing nothing
 * than an author's intent, and silence is the worst outcome for a compiler.
 */

export class PresentationError extends Error {
  readonly problems: readonly string[];

  constructor(message: string, problems: readonly string[] = []) {
    super(message);
    this.problems = problems;
  }

  /** The full message, one problem per line, for printing to a terminal. */
  report(): string {
    return [this.message, ...this.problems.map((problem) => `  - ${problem}`)].join("\n");
  }
}

/** Applied when the source says nothing. Archaeology fixes the formula, not the numbers. */
export const DEFAULT_PRE_SAY_MS = 500;
export const DEFAULT_POST_SAY_MS = 900;
export const DEFAULT_MIN_SLIDE_MS = 3000;
export const DEFAULT_SPEED = 1;

/**
 * One step in a slide's narration.
 *
 * `say` used to be a single opaque string, which meant every phrase boundary and every silence
 * was Kokoro's guess. A cue list makes both authorable without inventing markup: there is no
 * inline syntax, nothing embedded in the prose, and exactly two things a cue can be. Emphasis,
 * intonation and rate are deliberately absent because Kokoro cannot honour them (dragon:3), and
 * a control that does nothing is worse than no control.
 */
export type NarrationCue =
  | {
      readonly kind: "speech";
      readonly text: string;
      /**
       * The semantic identity this cue reaches, if any. Not a time and not an animation:
       * the author states that this moment in the narration and some element on the slide
       * are the same idea, and the compiler works out when that happens (decision:14).
       */
      readonly activates?: string;
      /**
       * Per-occurrence spelling substitutions applied before synthesis only. See
       * decision:12 — this repairs one word in one cue, and is not a dictionary.
       */
      readonly pronounce?: ReadonlyMap<string, string>;
    }
  | { readonly kind: "pause"; readonly milliseconds: number };

/** A bullet, which may carry a semantic identity that narration can reach. */
export interface AuthoredBullet {
  readonly text: string;
  readonly id?: string;
}

export interface AuthoredSlide {
  /** 1-based, and used in every message the author sees. */
  readonly ordinal: number;
  readonly title: string;
  readonly bullets: readonly AuthoredBullet[];
  /** Ordered narration cues. A scalar `say` is shorthand for one speech cue. */
  readonly say: readonly NarrationCue[];
  readonly preSayMs: number;
  readonly postSayMs: number;
  readonly minSlideMs: number;
}

export interface Presentation {
  readonly title: string;
  readonly slides: readonly AuthoredSlide[];
  /** Kokoro's entire control surface, deck-wide — see dragon:3. */
  readonly voice: string | undefined;
  readonly speed: number;
  /** Valid source that will not do what it looks like it does. Printed, not thrown. */
  readonly warnings: readonly string[];
}

const nonEmptyString = z
  .string()
  .refine((value) => value.trim().length > 0, { message: "must not be empty" });

// `z.custom` rather than `z.string().refine(...)` so that YAML's `pre_say: 750` — a number,
// and the single most likely timing mistake — gets the hint instead of "expected string".
const durationLiteral = z.custom<string>(
  (value) => typeof value === "string" && isDurationLiteral(value),
  { message: `must be ${DURATION_HINT}` },
);

/**
 * Anchor identities are kebab-case and start with a letter.
 *
 * Narrow on purpose: an identity appears in two places in the source and has to be matched
 * exactly, so the set of things it can be should be small enough to type correctly twice.
 */
export const ANCHOR_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export const ANCHOR_ID_HINT =
  "lower-case letters, digits and hyphens, starting with a letter";

export const BULLET_HINT = 'text, or { id: some-name, text: "..." }';

/**
 * Hand-checked for the same reason cues are: a `z.union` reports its branch failures nested
 * inside one `invalid_union` issue, so a malformed identifier would surface to the author as
 * "Invalid input" with no indication of what was wrong with it.
 */
function checkBullet(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim().length === 0 ? "must not be empty" : undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return `must be ${BULLET_HINT}`;
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter((key) => !BULLET_KEYS.includes(key));
  if (extra.length > 0) {
    return `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${BULLET_KEYS.join(", ")})`;
  }
  if (typeof record["text"] !== "string" || record["text"].trim().length === 0) {
    return "text must not be empty";
  }
  if (record["id"] !== undefined) {
    const id = record["id"];
    if (typeof id !== "string" || !ANCHOR_ID.test(id)) {
      return `id must be ${ANCHOR_ID_HINT}`;
    }
  }
  return undefined;
}

const BULLET_KEYS = ["text", "id"];

const bulletSchema = z.unknown().superRefine((value, context) => {
  const problem = checkBullet(value);
  if (problem !== undefined) context.addIssue({ code: "custom", message: problem });
});

const slideSchema = z.strictObject({
  title: nonEmptyString,
  bullets: z.array(bulletSchema).optional(),
});

/** A validated bullet, in either of its two authored forms. */
function bulletOf(value: unknown): AuthoredBullet {
  if (typeof value === "string") return { text: value.trim() };
  const record = value as { text: string; id?: string };
  return record.id === undefined
    ? { text: record.text.trim() }
    : { text: record.text.trim(), id: record.id };
}

export const CUE_HINT =
  'narration text, { speech: "..." }, or a pause such as { pause: "400ms" }';

/**
 * Why this is one `unknown` with a hand-written check rather than a `z.union`.
 *
 * A union reports failures as one `invalid_union` issue whose branch errors are nested inside
 * it, so the flat issue list the error formatter walks would say "slide 2, say: invalid input"
 * and lose the cue index entirely. Adding issues by hand keeps the path — `slides[1].say.2`
 * becomes "slide 2, narration cue 3" — which is the only part of the message an author can act
 * on.
 */
function checkCue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim().length === 0 ? "must not be empty" : undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return `must be ${CUE_HINT}`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.includes("pause")) {
    if (keys.length !== 1) {
      return "a pause cue takes no other keys";
    }
    const raw = record["pause"];
    if (typeof raw !== "string" || !isDurationLiteral(raw)) {
      return `pause must be ${DURATION_HINT}`;
    }
    if (parseDurationMs(raw) <= 0) {
      return "pause must be longer than zero";
    }
    return undefined;
  }

  if (keys.includes("speech")) {
    const extra = keys.filter((key) => !SPEECH_CUE_KEYS.includes(key));
    if (extra.length > 0) {
      return `unknown key ${JSON.stringify(extra.join(", "))} on a speech cue (allowed: ${SPEECH_CUE_KEYS.join(", ")})`;
    }
    if (typeof record["speech"] !== "string" || record["speech"].trim().length === 0) {
      return "speech must not be empty";
    }
    if (record["activates"] !== undefined) {
      const id = record["activates"];
      if (typeof id !== "string" || !ANCHOR_ID.test(id)) {
        return `activates must be ${ANCHOR_ID_HINT}`;
      }
    }
    if (record["pronounce"] !== undefined) {
      return checkPronounce(record["pronounce"], record["speech"]);
    }
    return undefined;
  }

  return `unknown cue ${JSON.stringify(keys.join(", "))}; must be ${CUE_HINT}`;
}

const SPEECH_CUE_KEYS = ["speech", "activates", "pronounce"];

/**
 * A `pronounce` entry only means anything if the word it names is actually in this cue, so
 * a typo in the key is caught here rather than silently doing nothing.
 */
function checkPronounce(value: unknown, speech: string): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "pronounce must be a map of word to spelling, such as { records: rekords }";
  }
  for (const [word, spelling] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z'-]*$/.test(word)) {
      return `pronounce key ${JSON.stringify(word)} must be a single word`;
    }
    if (typeof spelling !== "string" || spelling.trim().length === 0) {
      return `pronounce.${word} must be the spelling to synthesize instead`;
    }
    if (!wordPattern(word).test(speech)) {
      return `pronounce.${word} does not appear in this cue's speech`;
    }
  }
  return undefined;
}

/** Whole-word, case-insensitive. Substring replacement would corrupt neighbouring words. */
function wordPattern(word: string): RegExp {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
}

const saySchema = z.unknown().superRefine((value, context) => {
  // `z.unknown()` accepts a missing key, so absence has to be caught here rather than by
  // the schema. A slide with no narration has no duration, so it is never valid.
  if (value === undefined || value === null) {
    context.addIssue({ code: "custom", message: "is required" });
    return;
  }

  if (typeof value === "string") {
    if (value.trim().length === 0) {
      context.addIssue({ code: "custom", message: "must not be empty" });
    }
    return;
  }

  if (!Array.isArray(value)) {
    context.addIssue({
      code: "custom",
      message: `must be ${CUE_HINT}, or a list of those`,
    });
    return;
  }

  if (value.length === 0) {
    context.addIssue({ code: "custom", message: "must list at least one narration cue" });
    return;
  }

  let spoken = 0;
  value.forEach((cue, index) => {
    // Counted before validation: a cue that tried to be speech and got it wrong is still
    // an attempt to say something, and reporting "only pauses" alongside the real problem
    // would just be a second, misleading error.
    if (typeof cue === "string" || isSpeechCue(cue)) spoken += 1;

    const problem = checkCue(cue);
    if (problem !== undefined) {
      context.addIssue({ code: "custom", message: problem, path: [index] });
    }
  });

  if (spoken === 0) {
    context.addIssue({
      code: "custom",
      message: "must contain something to say, not only pauses",
    });
  }
});

function isSpeechCue(cue: unknown): cue is { speech: string; activates?: string } {
  return typeof cue === "object" && cue !== null && "speech" in cue;
}

/**
 * Anchors are checked across the whole slide, because that is the only place both ends of
 * the relationship are visible: the identity is declared on a bullet and reached by a cue.
 *
 * A dangling reference is the failure that matters. Silently rendering a slide whose
 * narration was supposed to build it, without building it, is exactly the "silent
 * synchronization loss" a compiler exists to prevent.
 */
const entrySchema = z
  .strictObject({
    slide: slideSchema,
    say: saySchema,
    pre_say: durationLiteral.optional(),
    post_say: durationLiteral.optional(),
  })
  .superRefine((entry, context) => {
    const declared = new Map<string, number>();
    (entry.slide.bullets ?? []).forEach((raw, index) => {
      if (checkBullet(raw) !== undefined) return;
      const { id } = bulletOf(raw);
      if (id === undefined) return;
      const first = declared.get(id);
      if (first === undefined) {
        declared.set(id, index);
      } else {
        context.addIssue({
          code: "custom",
          path: ["slide", "bullets", index],
          message: `duplicate id ${JSON.stringify(id)}; bullet ${first + 1} already uses it`,
        });
      }
    });

    const cues = Array.isArray(entry.say) ? entry.say : [];
    const reached = new Set<string>();
    cues.forEach((cue, index) => {
      if (!isSpeechCue(cue) || cue.activates === undefined) return;
      const id = cue.activates;
      if (!declared.has(id)) {
        const known = [...declared.keys()];
        context.addIssue({
          code: "custom",
          path: ["say", index],
          message:
            `activates ${JSON.stringify(id)}, which no bullet on this slide declares` +
            (known.length === 0
              ? "; this slide has no bullet ids"
              : ` (declared: ${known.join(", ")})`),
        });
        return;
      }
      if (reached.has(id)) {
        context.addIssue({
          code: "custom",
          path: ["say", index],
          message: `activates ${JSON.stringify(id)}, which an earlier cue already reaches`,
        });
      }
      reached.add(id);
    });
  });

const defaultsSchema = z.strictObject({
  pre_say: durationLiteral.optional(),
  post_say: durationLiteral.optional(),
  min_slide_duration: durationLiteral.optional(),
  voice: nonEmptyString.optional(),
  speed: z.number().optional(),
  // Accepted because decision:6 put it in the format, ignored because Kokoro has no input
  // for it (dragon:3). compilePresentation warns rather than letting it look effective.
  instructions: nonEmptyString.optional(),
});

const documentSchema = z.strictObject({
  title: nonEmptyString,
  defaults: defaultsSchema.optional(),
  slides: z.array(entrySchema).min(1, { message: "must list at least one slide" }),
});

/**
 * What each object accepts, keyed by its path with list indices collapsed to `[]`, so an
 * unknown-key error can say what *was* allowed. Read off the schemas rather than restated,
 * because a hand-maintained copy of a schema is a documentation bug waiting to happen.
 */
const ALLOWED_KEYS: Record<string, readonly string[]> = {
  "": Object.keys(documentSchema.shape),
  defaults: Object.keys(defaultsSchema.shape),
  "slides[]": Object.keys(entrySchema.shape),
  "slides[].slide": Object.keys(slideSchema.shape),
};

/**
 * Parse and validate presentation YAML.
 *
 * `source` names the file in error messages and is not read from disk — callers that
 * already have the text, including tests, do not need one to exist.
 */
export function parsePresentation(text: string, source: string): Presentation {
  let document: unknown;
  try {
    document = parseYaml(text);
  } catch (error) {
    if (error instanceof YAMLParseError) {
      throw new PresentationError(`${source} is not valid YAML: ${error.message}`);
    }
    throw error;
  }

  if (document === null || document === undefined) {
    throw new PresentationError(`${source} is empty`);
  }

  const result = documentSchema.safeParse(document);
  if (!result.success) {
    throw new PresentationError(
      `${source} is not a valid presentation:`,
      result.error.issues.map(describeIssue),
    );
  }

  const raw = result.data;
  const defaults = raw.defaults ?? {};
  const preSayMs = optionalDuration(defaults.pre_say) ?? DEFAULT_PRE_SAY_MS;
  const postSayMs = optionalDuration(defaults.post_say) ?? DEFAULT_POST_SAY_MS;
  const minSlideMs =
    optionalDuration(defaults.min_slide_duration) ?? DEFAULT_MIN_SLIDE_MS;

  const warnings: string[] = [];
  if (defaults.instructions !== undefined) {
    warnings.push(
      "defaults.instructions is accepted but has no effect: the local Kokoro provider " +
        "has no delivery-instruction input, only voice and speed " +
        "(archaeology/dragons/0003-*.md).",
    );
  }

  return {
    title: raw.title.trim(),
    voice: defaults.voice?.trim(),
    speed: defaults.speed ?? DEFAULT_SPEED,
    warnings,
    slides: raw.slides.map((entry, index) => ({
      ordinal: index + 1,
      title: entry.slide.title.trim(),
      bullets: (entry.slide.bullets ?? []).map(bulletOf),
      say: toCues(entry.say),
      preSayMs: optionalDuration(entry.pre_say) ?? preSayMs,
      postSayMs: optionalDuration(entry.post_say) ?? postSayMs,
      minSlideMs,
    })),
  };
}

function optionalDuration(value: string | undefined): number | undefined {
  return value === undefined ? undefined : parseDurationMs(value);
}

/**
 * Turn validated `say` into cues.
 *
 * A scalar is shorthand for one speech cue, which is what keeps every deck written before the
 * grammar existed working unchanged. Nothing here can fail: `saySchema` already rejected
 * everything this would have to complain about.
 */
function toCues(value: unknown): readonly NarrationCue[] {
  if (typeof value === "string") {
    return [{ kind: "speech", text: collapseWhitespace(value) }];
  }
  return (value as unknown[]).map((cue): NarrationCue => {
    if (typeof cue === "string") {
      return { kind: "speech", text: collapseWhitespace(cue) };
    }
    const record = cue as Record<string, unknown>;
    if (typeof record["pause"] === "string") {
      return { kind: "pause", milliseconds: parseDurationMs(record["pause"]) };
    }

    const pronounce = record["pronounce"] as Record<string, string> | undefined;
    return {
      kind: "speech",
      text: collapseWhitespace(record["speech"] as string),
      ...(record["activates"] === undefined
        ? {}
        : { activates: record["activates"] as string }),
      ...(pronounce === undefined
        ? {}
        : { pronounce: new Map(Object.entries(pronounce)) }),
    };
  });
}

/**
 * The text actually handed to the synthesizer.
 *
 * Whole-word and case-insensitive, applied only to this cue. The authored text is left
 * alone so that what the source says and what gets spoken stay separately inspectable —
 * a caption or a frozen asset wants the former (decision:12).
 */
export function spokenText(cue: NarrationCue): string {
  if (cue.kind !== "speech" || cue.pronounce === undefined) {
    return cue.kind === "speech" ? cue.text : "";
  }
  let text = cue.text;
  for (const [word, spelling] of cue.pronounce) {
    text = text.replace(wordPattern(word), spelling);
  }
  return text;
}

/**
 * Block scalars carry the author's line breaks, which are a reading convenience rather
 * than an instruction — a newline is not a pause. Authors who want one now write one
 * (dragon:3).
 */
function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const where = describePath(issue.path);
  if (issue.code === "unrecognized_keys") {
    const allowed = ALLOWED_KEYS[normalizePath(issue.path)];
    const named = issue.keys.map((key) => JSON.stringify(key)).join(", ");
    const suffix = allowed === undefined ? "" : ` (allowed: ${allowed.join(", ")})`;
    return `${where}: unknown field ${named}${suffix}`;
  }
  return `${where}: ${humanize(issue.message)}`;
}

/**
 * `["slides", 1, "slide", "title"]` becomes `slide 2, slide.title` — the ordinal an
 * author counts in their editor, plus the field within it.
 */
function describePath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "presentation";
  if (path[0] !== "slides" || typeof path[1] !== "number") {
    return path.map(String).join(".");
  }
  const slide = `slide ${path[1] + 1}`;
  const rest = path.slice(2);
  if (rest.length === 0) return slide;
  // `say.2` means the third cue, and saying so beats making the author count from zero.
  if (rest[0] === "say" && typeof rest[1] === "number") {
    return `${slide}, narration cue ${rest[1] + 1}`;
  }
  return `${slide}, ${rest.map(String).join(".")}`;
}

function normalizePath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((accumulated, segment) => {
    if (typeof segment === "number") return `${accumulated}[]`;
    return accumulated === "" ? String(segment) : `${accumulated}.${String(segment)}`;
  }, "");
}

/** zod says "expected string, received undefined"; an author wants "is required". */
function humanize(message: string): string {
  const missing = /^Invalid input: expected (\w+), received undefined$/.exec(message);
  return missing === null ? message : `is required (expected ${missing[1]})`;
}
