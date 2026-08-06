import { parse as parseYaml, YAMLParseError } from "yaml";
import { z } from "zod";

import { DURATION_HINT, isDurationLiteral, parseDurationMs } from "./duration.ts";
import { type AuthoredMark, markProblem, specimenLines } from "./specimen.ts";

export type { AuthoredMark } from "./specimen.ts";

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

/** One item of a list, which may carry a semantic identity that narration can reach. */
export interface AuthoredItem {
  readonly text: string;
  readonly id?: string;
}

/** The only language cuecraft can set as a specimen. Widening this is a decision, not a knob. */
export const CODE_LANGUAGES = ["yaml"] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

/**
 * What a slide's content *is*.
 *
 * decision:10 chose composition from the shape of the content — how many items, how long they
 * are. Shape turned out to be a weak proxy for meaning exactly where idea:5 predicted it would
 * be. `bullets` and `steps` are the same data and make different claims: "these are points"
 * against "these are stages of one transformation", and a compiler's pipeline is not an
 * enumerated list. `code` is not points at all — its whitespace is the content.
 *
 * So the role is now the first input to composition, and shape decides only within a role. The
 * union is deliberately closed and deliberately small: three bodies plus the absence of one.
 * Every entry exists because the self-demo could not say what it meant without it, and none was
 * added because it would be nice to have.
 *
 * Still nothing geometric. A body says what the content means; it never says how big, how many
 * columns, or where.
 */
export type SlideBody =
  | { readonly kind: "none" }
  | { readonly kind: "bullets"; readonly items: readonly AuthoredItem[] }
  | { readonly kind: "steps"; readonly items: readonly AuthoredItem[] }
  | {
      readonly kind: "code";
      readonly language: CodeLanguage;
      /** Verbatim, including indentation. See `./specimen.ts`. */
      readonly source: string;
      readonly marks: readonly AuthoredMark[];
    };

/**
 * The elements of a body that narration can reach, in the order the renderer lays them out.
 *
 * One function rather than three branches scattered through the compiler: an anchor resolves to
 * an index into *this* list whatever the body is, so adding a fourth role would not touch
 * timing, validation, or the anchor representation.
 */
export function bodyElements(body: SlideBody): readonly { readonly id?: string }[] {
  switch (body.kind) {
    case "none":
      return [];
    case "code":
      return body.marks;
    default:
      return body.items;
  }
}

export interface AuthoredSlide {
  /** 1-based, and used in every message the author sees. */
  readonly ordinal: number;
  readonly title: string;
  readonly body: SlideBody;
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

export const ITEM_HINT = 'text, or { id: some-name, text: "..." }';

/**
 * Hand-checked for the same reason cues are: a `z.union` reports its branch failures nested
 * inside one `invalid_union` issue, so a malformed identifier would surface to the author as
 * "Invalid input" with no indication of what was wrong with it.
 */
function checkItem(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim().length === 0 ? "must not be empty" : undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return `must be ${ITEM_HINT}`;
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter((key) => !ITEM_KEYS.includes(key));
  if (extra.length > 0) {
    return `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${ITEM_KEYS.join(", ")})`;
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

const ITEM_KEYS = ["text", "id"];

const itemSchema = z.unknown().superRefine((value, context) => {
  const problem = checkItem(value);
  if (problem !== undefined) context.addIssue({ code: "custom", message: problem });
});

const MARK_KEYS = ["id", "line"];

export const MARK_HINT = '{ id: some-name, line: "the line it opens" }';

/**
 * A mark, checked for everything except whether it actually resolves.
 *
 * Resolution needs the source, which lives one level up, so it happens in the code block's own
 * check. Splitting it this way keeps the two failures distinguishable in the report: "this mark
 * is malformed" and "this mark points at nothing" are different mistakes with different fixes.
 */
function checkMark(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return `must be ${MARK_HINT}`;
  }
  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter((key) => !MARK_KEYS.includes(key));
  if (extra.length > 0) {
    return `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${MARK_KEYS.join(", ")})`;
  }
  const id = record["id"];
  if (typeof id !== "string" || !ANCHOR_ID.test(id)) {
    return `id must be ${ANCHOR_ID_HINT}`;
  }
  if (typeof record["line"] !== "string" || record["line"].trim().length === 0) {
    return "line must be a piece of the line this mark opens";
  }
  return undefined;
}

const markSchema = z.unknown().superRefine((value, context) => {
  const problem = checkMark(value);
  if (problem !== undefined) context.addIssue({ code: "custom", message: problem });
});

/**
 * A code specimen: what language it is, what it says, and which parts narration can reach.
 *
 * `language` is checked here rather than by `z.enum` so the message can say why the list is one
 * entry long. cuecraft bundles one grammar; a deck that asks for another would otherwise render
 * unhighlighted and look like a styling bug rather than an unsupported language.
 */
const codeSchema = z
  .strictObject({
    language: z.unknown(),
    source: nonEmptyString,
    marks: z.array(markSchema).optional(),
  })
  .superRefine((code, context) => {
    if (typeof code.language !== "string" || !isCodeLanguage(code.language)) {
      context.addIssue({
        code: "custom",
        path: ["language"],
        message:
          `must be one of ${CODE_LANGUAGES.join(", ")}; cuecraft bundles one grammar and ` +
          "would otherwise set your code unhighlighted",
      });
    }

    const lines = specimenLines(code.source);
    if (lines.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["source"],
        message: "must not be blank",
      });
      return;
    }

    const declared = new Map<string, number>();
    (code.marks ?? []).forEach((raw, index) => {
      if (checkMark(raw) !== undefined) return;
      const mark = raw as AuthoredMark;

      const first = declared.get(mark.id);
      if (first === undefined) {
        declared.set(mark.id, index);
      } else {
        context.addIssue({
          code: "custom",
          path: ["marks", index],
          message: `duplicate id ${JSON.stringify(mark.id)}; mark ${first + 1} already uses it`,
        });
      }

      const problem = markProblem(lines, mark);
      if (problem !== undefined) {
        context.addIssue({ code: "custom", path: ["marks", index], message: problem });
      }
    });
  });

function isCodeLanguage(value: string): value is CodeLanguage {
  return (CODE_LANGUAGES as readonly string[]).includes(value);
}

/**
 * A slide carries a title and at most one body.
 *
 * "At most one" rather than "exactly one": a slide that is a single sentence has no body and
 * becomes a statement, which is the composition three of the canonical deck's slides want.
 *
 * The three body keys are mutually exclusive because they are three answers to the same
 * question. A slide holding both `bullets` and `steps` has not said what its content means, and
 * guessing which one wins is the kind of silence a compiler exists to prevent.
 */
const slideSchema = z
  .strictObject({
    title: nonEmptyString,
    bullets: z.array(itemSchema).optional(),
    steps: z.array(itemSchema).optional(),
    code: codeSchema.optional(),
  })
  .superRefine((slide, context) => {
    const present = BODY_KEYS.filter((key) => slide[key] !== undefined);
    if (present.length > 1) {
      context.addIssue({
        code: "custom",
        message:
          `has ${present.map((key) => JSON.stringify(key)).join(" and ")}; a slide's content ` +
          "is one of those, because each says something different about what it means",
      });
    }
  });

const BODY_KEYS = ["bullets", "steps", "code"] as const;

/** A validated item, in either of its two authored forms. */
function itemOf(value: unknown): AuthoredItem {
  if (typeof value === "string") return { text: value.trim() };
  const record = value as { text: string; id?: string };
  return record.id === undefined
    ? { text: record.text.trim() }
    : { text: record.text.trim(), id: record.id };
}

/**
 * A validated slide's content, normalized into the closed union.
 *
 * An empty `bullets: []` is `none` rather than an empty list, so that "this slide has no body"
 * has exactly one representation downstream and no archetype has to handle a body with nothing
 * in it.
 */
function bodyOf(slide: {
  bullets?: unknown[] | undefined;
  steps?: unknown[] | undefined;
  code?: { language: unknown; source: string; marks?: unknown[] | undefined } | undefined;
}): SlideBody {
  if (slide.code !== undefined) {
    return {
      kind: "code",
      language: slide.code.language as CodeLanguage,
      source: slide.code.source,
      marks: (slide.code.marks ?? []).map((raw) => raw as AuthoredMark),
    };
  }
  if (slide.steps !== undefined && slide.steps.length > 0) {
    return { kind: "steps", items: slide.steps.map(itemOf) };
  }
  if (slide.bullets !== undefined && slide.bullets.length > 0) {
    return { kind: "bullets", items: slide.bullets.map(itemOf) };
  }
  return { kind: "none" };
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
    // Every identity this slide declares, whichever body declared it. Duplicate marks are
    // reported by the code block's own check, so only list duplicates are raised here.
    const declared = new Map<string, number>();
    for (const key of ["bullets", "steps"] as const) {
      (entry.slide[key] ?? []).forEach((raw, index) => {
        if (checkItem(raw) !== undefined) return;
        const { id } = itemOf(raw);
        if (id === undefined) return;
        const first = declared.get(id);
        if (first === undefined) {
          declared.set(id, index);
        } else {
          context.addIssue({
            code: "custom",
            path: ["slide", key, index],
            message: `duplicate id ${JSON.stringify(id)}; item ${first + 1} already uses it`,
          });
        }
      });
    }
    (entry.slide.code?.marks ?? []).forEach((raw, index) => {
      if (checkMark(raw) !== undefined) return;
      const { id } = raw as AuthoredMark;
      if (!declared.has(id)) declared.set(id, index);
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
            `activates ${JSON.stringify(id)}, which nothing on this slide declares` +
            (known.length === 0
              ? "; this slide declares no ids"
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
  "slides[].slide.code": Object.keys(codeSchema.shape),
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
      body: bodyOf(entry.slide),
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
