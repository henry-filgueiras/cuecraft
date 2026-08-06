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

export interface AuthoredSlide {
  /** 1-based, and used in every message the author sees. */
  readonly ordinal: number;
  readonly title: string;
  readonly bullets: readonly string[];
  /** Narration prose, whitespace-collapsed. Plain text; cuecraft has no markup. */
  readonly say: string;
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

const slideSchema = z.strictObject({
  title: nonEmptyString,
  bullets: z.array(nonEmptyString).optional(),
});

const entrySchema = z.strictObject({
  slide: slideSchema,
  say: nonEmptyString,
  pre_say: durationLiteral.optional(),
  post_say: durationLiteral.optional(),
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
      bullets: (entry.slide.bullets ?? []).map((bullet) => bullet.trim()),
      say: collapseWhitespace(entry.say),
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
 * Block scalars carry the author's line breaks, which are a reading convenience rather
 * than an instruction — Kokoro has no pause primitive to give them meaning (dragon:3).
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
  return rest.length === 0 ? slide : `${slide}, ${rest.map(String).join(".")}`;
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
