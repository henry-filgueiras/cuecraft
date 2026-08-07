import { parse as parseYaml, YAMLParseError } from "yaml";
import { z } from "zod";

import { deriveChange } from "./change.ts";
import { DURATION_HINT, isDurationLiteral, parseDurationMs } from "./duration.ts";
import { ANCHOR_ID, ANCHOR_ID_HINT } from "./identity.ts";
import { type CodeLanguage, CODE_LANGUAGES, isCodeLanguage } from "./language.ts";
import {
  languageOf,
  onceReader,
  quoteSlide,
  repositoryReader,
  SourceError,
  type RepositoryReader,
} from "./source.ts";
import { type AuthoredMark, markProblem, specimenLines } from "./specimen.ts";
import { type DetailResolver, resolveWorld, type WorldIssue } from "./world.ts";

import {
  bodyElements,
  CHANGE_ELEMENT_ID,
  type AuthoredItem,
  type SlideBody,
} from "./body.ts";
export type { AuthoredEntity, AuthoredRelation, AuthoredWorld } from "./world.ts";
export type { AuthoredMark } from "./specimen.ts";
export {
  bodyElements,
  CHANGE_ELEMENT_ID,
  type AuthoredItem,
  type SlideBody,
} from "./body.ts";
export { CODE_LANGUAGES, type CodeLanguage } from "./language.ts";

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

export { ANCHOR_ID, ANCHOR_ID_HINT } from "./identity.ts";

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
 * Where the source of a specimen comes from.
 *
 * Two forms, and exactly one of them per specimen:
 *
 *     { language: yaml, source: "..." }              written here
 *     { file: examples/x.yaml, slide: "Title" }      quoted from the repository
 *
 * The quoted form exists because a copy of something that already exists in the repository is
 * a lie waiting to happen (idea:10). `language` is absent from it deliberately: the extension
 * says what the file is, and a specimen that could claim otherwise would be a second place for
 * the truth to live.
 */
const INLINE_SPECIMEN_KEYS = ["language", "source"] as const;
const QUOTED_SPECIMEN_KEYS = ["file", "slide", "opens"] as const;

export const SPECIMEN_HINT =
  '{ language: yaml, source: "..." } or ' +
  '{ file: <a path in this repository>, slide: "<the title of a slide in it>" }';

export interface ResolvedSpecimen {
  readonly language: CodeLanguage;
  readonly source: string;
  /** The construct selector this specimen used, if it quoted one. Kept only to compare the
   *  two states of a change: see `resolveChangeBody`. */
  readonly opens?: string;
}

interface SpecimenIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

/**
 * Validate a specimen and fetch whatever source it names.
 *
 * Resolution happens during parsing rather than during rendering, so a file that has moved, a
 * slide that has been retitled, and a mark that no longer matches anything are all the same
 * loud failure the format already produces for a malformed key — reported against the slide,
 * before a single second of audio is synthesized.
 */
function resolveSpecimen(
  value: unknown,
  read: RepositoryReader,
  extraKeys: readonly string[] = [],
): { specimen?: ResolvedSpecimen; issues: readonly SpecimenIssue[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { issues: [{ path: [], message: `must be ${SPECIMEN_HINT}` }] };
  }

  const record = value as Record<string, unknown>;
  const allowed = [...INLINE_SPECIMEN_KEYS, ...QUOTED_SPECIMEN_KEYS, ...extraKeys];
  const extra = Object.keys(record).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    return {
      issues: [
        {
          path: [],
          message: `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${allowed.join(", ")})`,
        },
      ],
    };
  }

  const written = record["source"] !== undefined;
  const quoted = record["file"] !== undefined;

  if (written && quoted) {
    return {
      issues: [
        {
          path: [],
          message:
            'has both "source" and "file"; a specimen is either written here or quoted from ' +
            "the repository, and a copy that can disagree with the file is the failure quoting exists to prevent",
        },
      ],
    };
  }
  if (!written && !quoted) {
    return { issues: [{ path: [], message: `must be ${SPECIMEN_HINT}` }] };
  }

  if (written) {
    for (const key of ["slide", "opens"] as const) {
      if (record[key] !== undefined) {
        return {
          issues: [
            {
              path: [key],
              message:
                "selects a region of a file; a specimen written here is already the region you " +
                "meant to show, so there is nothing left to select",
            },
          ],
        };
      }
    }
    const language = record["language"];
    if (typeof language !== "string" || !isCodeLanguage(language)) {
      return {
        issues: [
          {
            path: ["language"],
            message:
              `must be one of ${CODE_LANGUAGES.join(", ")}; cuecraft bundles one grammar and ` +
              "would otherwise set your code unhighlighted",
          },
        ],
      };
    }
    const source = record["source"];
    if (typeof source !== "string" || specimenLines(source).length === 0) {
      return { issues: [{ path: ["source"], message: "must not be blank" }] };
    }
    return { specimen: { language, source }, issues: [] };
  }

  if (record["language"] !== undefined) {
    return {
      issues: [
        {
          path: ["language"],
          message:
            "is derived from the quoted file's extension and must not be set; cuecraft reads " +
            "the file, so the file decides what it is",
        },
      ],
    };
  }
  const file = record["file"];
  if (typeof file !== "string" || file.trim().length === 0) {
    return {
      issues: [{ path: ["file"], message: "must be a path inside this repository" }],
    };
  }
  const slide = record["slide"];
  if (typeof slide !== "string" || slide.trim().length === 0) {
    return {
      issues: [
        {
          path: ["slide"],
          message:
            "must be the exact title of a slide in that file; that is how a region is named",
        },
      ],
    };
  }

  const opens = record["opens"];
  if (opens !== undefined && (typeof opens !== "string" || opens.trim().length === 0)) {
    return {
      issues: [
        {
          path: ["opens"],
          message:
            "must be part of the line that opens the construct you want shown, such as " +
            '"say:" — the same way a mark names a line',
        },
      ],
    };
  }

  try {
    const language = languageOf(file);
    const source = quoteSlide(read(file), {
      file,
      slide,
      ...(opens === undefined ? {} : { opens }),
    });
    return {
      specimen: { language, source, ...(opens === undefined ? {} : { opens }) },
      issues: [],
    };
  } catch (error) {
    if (error instanceof SourceError) {
      return { issues: [{ path: [], message: error.message }] };
    }
    throw error;
  }
}

/** A code specimen: its source, and which parts of it narration can reach. */
function resolveCode(
  value: unknown,
  read: RepositoryReader,
): { body?: Extract<SlideBody, { kind: "code" }>; issues: readonly SpecimenIssue[] } {
  const { specimen, issues } = resolveSpecimen(value, read, ["marks"]);
  if (specimen === undefined) return { issues };

  const rawMarks = (value as { marks?: unknown }).marks;
  if (rawMarks !== undefined && !Array.isArray(rawMarks)) {
    return { issues: [{ path: ["marks"], message: `must be a list of ${MARK_HINT}` }] };
  }

  const lines = specimenLines(specimen.source);
  const problems: SpecimenIssue[] = [];
  const declared = new Map<string, number>();
  const marks: AuthoredMark[] = [];

  (rawMarks ?? []).forEach((raw: unknown, index: number) => {
    const malformed = checkMark(raw);
    if (malformed !== undefined) {
      problems.push({ path: ["marks", index], message: malformed });
      return;
    }
    const mark = raw as AuthoredMark;

    const first = declared.get(mark.id);
    if (first === undefined) {
      declared.set(mark.id, index);
    } else {
      problems.push({
        path: ["marks", index],
        message: `duplicate id ${JSON.stringify(mark.id)}; mark ${first + 1} already uses it`,
      });
    }

    // For a quoted specimen this is the drift detector: a mark names a line by what it says,
    // so a file that stopped saying it fails here instead of emphasising the wrong region.
    const unresolvable = markProblem(lines, mark);
    if (unresolvable !== undefined) {
      problems.push({ path: ["marks", index], message: unresolvable });
      return;
    }
    marks.push(mark);
  });

  if (problems.length > 0) return { issues: problems };
  return {
    body: {
      kind: "code",
      language: specimen.language,
      source: specimen.source,
      marks,
    },
    issues: [],
  };
}

const CHANGE_KEYS = ["before", "after"] as const;

/**
 * A change: two truthful source states, and nothing about what differs between them.
 *
 * The author says what is being compared; the compiler works out what changed (`./change.ts`).
 * Two identical states are rejected rather than rendered, because a change scene that shows no
 * change is a slide making a claim its own content contradicts.
 */
function resolveChangeBody(
  value: unknown,
  read: RepositoryReader,
): { body?: Extract<SlideBody, { kind: "change" }>; issues: readonly SpecimenIssue[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      issues: [
        { path: [], message: `must be { before: <specimen>, after: <specimen> }` },
      ],
    };
  }
  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter(
    (key) => !(CHANGE_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return {
      issues: [
        {
          path: [],
          message:
            `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${CHANGE_KEYS.join(", ")}); ` +
            "which lines differ is derived, not authored",
        },
      ],
    };
  }

  const issues: SpecimenIssue[] = [];
  const sides = CHANGE_KEYS.map((side) => {
    if (record[side] === undefined) {
      issues.push({ path: [side], message: "is required" });
      return undefined;
    }
    const resolved = resolveSpecimen(record[side], read);
    for (const issue of resolved.issues) {
      issues.push({ path: [side, ...issue.path], message: issue.message });
    }
    return resolved.specimen;
  });

  if (issues.length > 0) return { issues };
  const [before, after] = sides;
  if (before === undefined || after === undefined) return { issues };

  if (before.language !== after.language) {
    return {
      issues: [
        {
          path: [],
          message: `compares ${before.language} with ${after.language}; both states must be the same language`,
        },
      ],
    };
  }

  // Where both states select a construct, they must select it the same way. cuecraft does not
  // try to work out that `say:` in one revision corresponds to `narration:` in another — that
  // is arbitrary code correspondence, and it is not a problem a presentation tool should be
  // solving. A stable selector is the narrow, checkable version of the same guarantee.
  if (
    before.opens !== undefined &&
    after.opens !== undefined &&
    before.opens !== after.opens
  ) {
    return {
      issues: [
        {
          path: [],
          message:
            `selects ${JSON.stringify(before.opens)} before and ${JSON.stringify(after.opens)} ` +
            "after; both states must name the same construct, or the diff is between two " +
            "different things and means nothing",
        },
      ],
    };
  }

  const derived = deriveChange(before.source, after.source);
  if (derived.changedRows.length === 0) {
    return {
      issues: [
        {
          path: [],
          message:
            "before and after are the same source; there is no change to show, and a slide " +
            "that says something changed had better be able to point at it",
        },
      ],
    };
  }
  // Nothing in common is the signature of a mis-selection: two regions that share not one line
  // are a replacement rather than a change, and rendering them as a diff would claim a
  // correspondence that is not there. This is the check that catches containment which is
  // inconsistent between the two states in the way that actually misleads.
  if (derived.changedRows.length === derived.rows.length) {
    return {
      issues: [
        {
          path: [],
          message:
            "before and after have no line in common; that is a replacement rather than a " +
            "change, and usually means the two states are not showing the same construct",
        },
      ],
    };
  }

  return {
    body: {
      kind: "change",
      language: before.language,
      before: before.source,
      after: after.source,
    },
    issues: [],
  };
}

/**
 * A slide carries a title and at most one body.
 *
 * "At most one" rather than "exactly one": a slide that is a single sentence has no body and
 * becomes a statement, which is the composition three of the canonical deck's slides want.
 *
 * The four body keys are mutually exclusive because they are four answers to the same
 * question. A slide holding both `bullets` and `steps` has not said what its content means, and
 * guessing which one wins is the kind of silence a compiler exists to prevent.
 *
 * `code` and `change` are `z.unknown()` here and checked by hand below, because validating them
 * means *reading the repository* — a specimen may quote a file rather than carry a copy of one
 * — and the reader is supplied per parse rather than baked into a module-level schema.
 */
function buildSlideSchema(read: RepositoryReader) {
  return z
    .strictObject({
      title: nonEmptyString,
      bullets: z.array(itemSchema).optional(),
      steps: z.array(itemSchema).optional(),
      code: z.unknown().optional(),
      change: z.unknown().optional(),
      world: z.unknown().optional(),
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
        return;
      }

      if (slide.code !== undefined) {
        for (const issue of resolveCode(slide.code, read).issues) {
          context.addIssue({
            code: "custom",
            path: ["code", ...issue.path],
            message: issue.message,
          });
        }
      }
      if (slide.change !== undefined) {
        for (const issue of resolveChangeBody(slide.change, read).issues) {
          context.addIssue({
            code: "custom",
            path: ["change", ...issue.path],
            message: issue.message,
          });
        }
      }
      if (slide.world !== undefined) {
        for (const issue of resolveWorld(slide.world, detailResolver(read)).issues) {
          context.addIssue({
            code: "custom",
            path: ["world", ...issue.path],
            message: issue.message,
          });
        }
      }
    });
}

const BODY_KEYS = ["bullets", "steps", "code", "change", "world"] as const;

/**
 * What an entity's interior may be: any slide body except another world.
 *
 * The reuse is the point. An interior is validated by the same checks, normalized into the same
 * closed union, and rendered by the same seven compositions as a slide — so `detail` added a key
 * to the format and no new machinery underneath it. Nesting is refused here rather than by the
 * type system, because the error an author needs is a sentence, not a missing overload.
 */
function detailResolver(read: RepositoryReader): DetailResolver {
  return (value: unknown) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        body: undefined,
        issues: [{ path: [], message: `must be ${DETAIL_HINT}` }],
      };
    }
    const record = value as Record<string, unknown>;
    if (record["world"] !== undefined) {
      return {
        body: undefined,
        issues: [
          {
            path: ["world"],
            message:
              "a world cannot contain a world; an entity's interior is ordinary slide content",
          },
        ],
      };
    }

    const present = BODY_KEYS.filter((key) => record[key] !== undefined);
    if (present.length === 0) {
      return {
        body: undefined,
        issues: [{ path: [], message: `must be ${DETAIL_HINT}` }],
      };
    }
    if (present.length > 1) {
      return {
        body: undefined,
        issues: [
          {
            path: [],
            message:
              `has ${present.map((key) => JSON.stringify(key)).join(" and ")}; an interior's ` +
              "content is one of those, because each says something different about what it means",
          },
        ],
      };
    }
    const extra = Object.keys(record).filter(
      (key) => !(BODY_KEYS as readonly string[]).includes(key),
    );
    if (extra.length > 0) {
      return {
        body: undefined,
        issues: [
          {
            path: [],
            message: `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${DETAIL_HINT})`,
          },
        ],
      };
    }

    const issues: WorldIssue[] = [];
    if (record["code"] !== undefined) {
      for (const issue of resolveCode(record["code"], read).issues) {
        issues.push({ path: ["code", ...issue.path], message: issue.message });
      }
    }
    if (record["change"] !== undefined) {
      for (const issue of resolveChangeBody(record["change"], read).issues) {
        issues.push({ path: ["change", ...issue.path], message: issue.message });
      }
    }
    for (const key of ["bullets", "steps"] as const) {
      const items = record[key];
      if (items === undefined) continue;
      if (!Array.isArray(items)) {
        issues.push({ path: [key], message: `must be a list of ${ITEM_HINT}` });
        continue;
      }
      items.forEach((raw: unknown, index: number) => {
        const problem = checkItem(raw);
        if (problem !== undefined) issues.push({ path: [key, index], message: problem });
      });
    }
    if (issues.length > 0) return { body: undefined, issues };
    return { body: bodyOf(record as Parameters<typeof bodyOf>[0], read), issues: [] };
  };
}

const DETAIL_HINT = BODY_KEYS.filter((key) => key !== "world").join(", ");

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
 *
 * `code` and `change` go back through the same resolver validation used, which reads through
 * the memoized reader — so a quoted file is read once per parse and every region of it comes
 * from one state of that file rather than from two reads that could disagree.
 */
function bodyOf(
  slide: {
    bullets?: unknown[] | undefined;
    steps?: unknown[] | undefined;
    code?: unknown;
    change?: unknown;
    world?: unknown;
  },
  read: RepositoryReader,
): SlideBody {
  if (slide.world !== undefined) {
    const { world } = resolveWorld(slide.world, detailResolver(read));
    if (world === undefined)
      throw new Error("world passed validation but did not resolve");
    return { kind: "world", entities: world.entities, relations: world.relations };
  }
  if (slide.code !== undefined) {
    const { body } = resolveCode(slide.code, read);
    if (body === undefined)
      throw new Error("code specimen passed validation but did not resolve");
    return body;
  }
  if (slide.change !== undefined) {
    const { body } = resolveChangeBody(slide.change, read);
    if (body === undefined)
      throw new Error("change passed validation but did not resolve");
    return body;
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
function buildEntrySchema(read: RepositoryReader) {
  return z
    .strictObject({
      slide: buildSlideSchema(read),
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
      const marks = (entry.slide.code as { marks?: unknown } | undefined)?.marks;
      (Array.isArray(marks) ? marks : []).forEach((raw: unknown, index: number) => {
        if (checkMark(raw) !== undefined) return;
        const { id } = raw as AuthoredMark;
        if (!declared.has(id)) declared.set(id, index);
      });
      // A world's identities are its entity keys, and unlike a bullet's `id` they are not
      // optional — `resolveWorld` has already rejected any that are misspelled or duplicated,
      // so anything that survived it can be declared here as it stands.
      if (entry.slide.world !== undefined) {
        const { world } = resolveWorld(entry.slide.world, detailResolver(read));
        // Entities first, then what is inside them — the same order `bodyElements` publishes, so
        // the "declared:" list an author is shown reads in the order the compiler resolves.
        for (const entity of world?.entities ?? []) {
          if (!declared.has(entity.id)) declared.set(entity.id, 0);
        }
        for (const entity of world?.entities ?? []) {
          if (entity.detail === undefined) continue;
          for (const element of bodyElements(entity.detail)) {
            if (element.id !== undefined && !declared.has(element.id)) {
              declared.set(element.id, 0);
            }
          }
        }
      }
      // The one identity nobody typed. A change knows which region of itself is the change, so
      // it declares that region and narration reaches it by name like any other element — the
      // author supplies the semantic structure and the compiler supplies the endpoint.
      if (entry.slide.change !== undefined) declared.set(CHANGE_ELEMENT_ID, 0);

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
}

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

/**
 * The whole schema, built around one repository reader.
 *
 * Built per parse rather than at module scope because validating a specimen may mean *reading
 * a file*, and the thing that does the reading is an argument — which is what keeps every test
 * in this repository free of the disk.
 */
function buildDocumentSchema(read: RepositoryReader) {
  const entrySchema = buildEntrySchema(read);
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
  const allowedKeys: Record<string, readonly string[]> = {
    "": Object.keys(documentSchema.shape),
    defaults: Object.keys(defaultsSchema.shape),
    "slides[]": Object.keys(entrySchema.shape),
    "slides[].slide": Object.keys(entrySchema.shape.slide.shape),
  };

  return { documentSchema, allowedKeys };
}

export interface ParseOptions {
  /**
   * How a quoted specimen reaches a file. Defaults to the repository, with traversal refused
   * (`./source.ts`); tests pass a map so that parsing stays deterministic and offline.
   */
  readonly read?: RepositoryReader;
}

/**
 * Parse and validate presentation YAML.
 *
 * `source` names the file in error messages and is not read from disk — callers that
 * already have the text, including tests, do not need one to exist.
 *
 * A deck that quotes files is not pure: parsing now reads the repository. That is the
 * "truthful extraction" step of the compilation model, and it happens here rather than at
 * render time so that a file that has moved fails before anything is synthesized.
 */
export function parsePresentation(
  text: string,
  source: string,
  options: ParseOptions = {},
): Presentation {
  const read = onceReader(options.read ?? repositoryReader());
  const { documentSchema, allowedKeys } = buildDocumentSchema(read);

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
      result.error.issues.map((issue) => describeIssue(issue, allowedKeys)),
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
      body: bodyOf(entry.slide, read),
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

function describeIssue(
  issue: z.core.$ZodIssue,
  allowedKeys: Record<string, readonly string[]>,
): string {
  const where = describePath(issue.path);
  if (issue.code === "unrecognized_keys") {
    const allowed = allowedKeys[normalizePath(issue.path)];
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
