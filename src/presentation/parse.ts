import { parse as parseYaml, YAMLParseError } from "yaml";
import { z } from "zod";

import { deriveChange } from "./change.ts";
import { collapseWhitespace, ENTER_MS, wordPattern, type NarrationCue } from "./cue.ts";
import { DURATION_HINT, isDurationLiteral, parseDurationMs } from "./duration.ts";
import { figureProblem, type FigureKind } from "./figure.ts";
import { FORMULA_LINE_HINT, formulaLineOf, formulaLineProblem } from "./formula.ts";
import { ANCHOR_ID, ANCHOR_ID_HINT } from "./identity.ts";
import { type CodeLanguage, CODE_LANGUAGES, isCodeLanguage } from "./language.ts";
import {
  checkInclusion,
  ModuleError,
  readModuleDocument,
  resolveModuleSpec,
} from "./module.ts";
import { bindNarration, modulesOf } from "./nest.ts";
import { protocolCues } from "./beat.ts";
import { resolveProtocol } from "./protocol.ts";
import {
  MAX_SERIES_TOTAL,
  SERIES_GROUP_HINT,
  seriesGroupOf,
  seriesGroupProblem,
  seriesTotal,
} from "./series.ts";
import { childScope, ROOT_SCOPE, type Scope } from "./scope.ts";
import {
  languageOf,
  onceReader,
  quoteSlide,
  repositoryReader,
  repositoryRelative,
  SourceError,
  type RepositoryReader,
} from "./source.ts";
import { type AuthoredMark, markProblem, specimenLines } from "./specimen.ts";
import {
  type ChildResolver,
  type DetailResolver,
  type EntityModule,
  resolveWorld,
  type WorldIssue,
} from "./world.ts";

import {
  bodyElements,
  CHANGE_ELEMENT_ID,
  type AuthoredItem,
  type SlideBody,
} from "./body.ts";
export type {
  AuthoredEntity,
  AuthoredRelation,
  AuthoredWorld,
  EntityModule,
} from "./world.ts";
export type { AuthoredMark } from "./specimen.ts";
export {
  bodyAddresses,
  bodyElements,
  CHANGE_ELEMENT_ID,
  type AuthoredItem,
  type SlideBody,
} from "./body.ts";
export { ENTER_MS, EXIT_MS, spokenText, type NarrationCue } from "./cue.ts";
export {
  stepId,
  type AuthoredActor,
  type AuthoredProtocol,
  type AuthoredStep,
} from "./protocol.ts";
export { MAX_MODULE_DEPTH, ROOT_SCOPE, type Scope } from "./scope.ts";
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

export interface AuthoredSlide {
  /** 1-based, and used in every message the author sees. */
  readonly ordinal: number;
  readonly title: string;
  readonly body: SlideBody;
  /**
   * Ordered narration cues, flattened. A scalar `say` is shorthand for one speech cue.
   *
   * "Flattened" is the whole of what a child module costs downstream: a slide that descends has
   * its callees' cues spliced in where the calls were made, bracketed by the `enter` and `exit`
   * that occupy the descent, and everything after this point sees one serial list exactly as it
   * always did (`./nest.ts`).
   */
  readonly say: readonly NarrationCue[];
  readonly preSayMs: number;
  readonly postSayMs: number;
  readonly minSlideMs: number;
  /**
   * Every file this slide was compiled from besides the presentation itself, canonical and in
   * inclusion order.
   *
   * A module is a *source* dependency, not an invisible input: a deck that descends is not
   * reproducible from its own file, and anything that ever caches, watches, or freezes a
   * compilation needs to be told what it actually read (decision:3).
   */
  readonly modules: readonly string[];
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
function buildSlideSchema(resolution: Resolution) {
  const read = resolution.read;
  return z
    .strictObject({
      title: nonEmptyString,
      bullets: z.array(itemSchema).optional(),
      steps: z.array(itemSchema).optional(),
      code: z.unknown().optional(),
      change: z.unknown().optional(),
      world: z.unknown().optional(),
      protocol: z.unknown().optional(),
      figure: z.unknown().optional(),
      formula: z.unknown().optional(),
      series: z.unknown().optional(),
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
      if (slide.figure !== undefined) {
        const problem = figureProblem(slide.figure);
        if (problem !== undefined) {
          context.addIssue({ code: "custom", path: ["figure"], message: problem });
        }
      }
      if (slide.formula !== undefined) {
        for (const issue of formulaProblems(slide.formula)) {
          context.addIssue({
            code: "custom",
            path: ["formula", ...issue.path],
            message: issue.message,
          });
        }
      }
      if (slide.series !== undefined) {
        for (const issue of seriesProblems(slide.series)) {
          context.addIssue({
            code: "custom",
            path: ["series", ...issue.path],
            message: issue.message,
          });
        }
      }
      if (slide.world !== undefined) {
        for (const issue of resolveWorld(slide.world, ...interiors(resolution)).issues) {
          context.addIssue({
            code: "custom",
            path: ["world", ...issue.path],
            message: issue.message,
          });
        }
      }
      if (slide.protocol !== undefined) {
        for (const issue of resolveProtocol(slide.protocol).issues) {
          context.addIssue({
            code: "custom",
            path: ["protocol", ...issue.path],
            message: issue.message,
          });
        }
      }
    });
}

/**
 * What a body is being resolved *from*.
 *
 * Three facts that used to be one — the reader — and had to grow the moment an interior could
 * arrive in its own file. `chain` is every file currently open, outermost first, beginning with
 * the presentation itself: a `child:` is resolved relative to its last entry, a repeat anywhere
 * in it is a cycle, and its length is the depth. `scope` is where the identities being resolved
 * live, which is what keeps two modules from colliding on a name they both chose innocently.
 */
interface Resolution {
  readonly read: RepositoryReader;
  readonly chain: readonly string[];
  readonly scope: Scope;
}

/**
 * The two ways into an entity, as `resolveWorld` wants them.
 *
 * A tuple rather than two calls at every site, because they are never useful apart: a world that
 * could resolve one spelling of an interior and not the other would accept half a format.
 */
function interiors(
  resolution: Resolution,
): [DetailResolver, { child: ChildResolver; scope: Scope }] {
  return [
    detailResolver(resolution),
    { child: childResolver(resolution), scope: resolution.scope },
  ];
}

const BODY_KEYS = [
  "bullets",
  "steps",
  "code",
  "change",
  "world",
  "protocol",
  "figure",
  "formula",
  "series",
] as const;

/**
 * Every group of a series, and the one thing only the whole list knows.
 *
 * The total is checked here rather than in `./series.ts` because a group is valid on its own
 * terms and a *series* can still be too big — three groups of two hundred is three legal groups
 * and a field nobody can count.
 */
function seriesProblems(
  value: unknown,
): readonly { path: readonly (string | number)[]; message: string }[] {
  if (!Array.isArray(value)) {
    return [{ path: [], message: `must be a list of ${SERIES_GROUP_HINT}` }];
  }
  if (value.length === 0) {
    return [{ path: [], message: "must have at least one group" }];
  }

  const problems: { path: readonly (string | number)[]; message: string }[] = [];
  const declared = new Map<string, number>();
  value.forEach((raw: unknown, index: number) => {
    const problem = seriesGroupProblem(raw);
    if (problem !== undefined) {
      problems.push({ path: [index], message: problem });
      return;
    }
    const { id } = seriesGroupOf(raw);
    if (id === undefined) return;
    const first = declared.get(id);
    if (first === undefined) {
      declared.set(id, index);
    } else {
      problems.push({
        path: [index],
        message: `duplicate id ${JSON.stringify(id)}; group ${first + 1} already uses it`,
      });
    }
  });
  if (problems.length > 0) return problems;

  const total = seriesTotal(value.map(seriesGroupOf));
  if (total > MAX_SERIES_TOTAL) {
    problems.push({
      path: [],
      message: `has ${total} members in total, and cuecraft draws at most ${MAX_SERIES_TOTAL}`,
    });
  }
  return problems;
}

/**
 * Every line of a formula, checked for shape and for whether it will actually set.
 *
 * A duplicate id is raised here rather than beside the bullets, because a formula is the only
 * body whose elements are neither prose nor derived — and the check has to live wherever the
 * lines are, which for an interior is nowhere near the slide.
 */
function formulaProblems(
  value: unknown,
): readonly { path: readonly (string | number)[]; message: string }[] {
  if (!Array.isArray(value)) {
    return [{ path: [], message: `must be a list of ${FORMULA_LINE_HINT}` }];
  }
  if (value.length === 0) {
    return [{ path: [], message: "must have at least one line" }];
  }

  const problems: { path: readonly (string | number)[]; message: string }[] = [];
  const declared = new Map<string, number>();
  value.forEach((raw: unknown, index: number) => {
    const problem = formulaLineProblem(raw);
    if (problem !== undefined) {
      problems.push({ path: [index], message: problem });
      return;
    }
    const { id } = formulaLineOf(raw);
    if (id === undefined) return;
    const first = declared.get(id);
    if (first === undefined) {
      declared.set(id, index);
    } else {
      problems.push({
        path: [index],
        message: `duplicate id ${JSON.stringify(id)}; line ${first + 1} already uses it`,
      });
    }
  });
  return problems;
}

/**
 * What an entity's interior may be: any slide body except another world.
 *
 * The reuse is the point. An interior is validated by the same checks, normalized into the same
 * closed union, and rendered by the same seven compositions as a slide — so `detail` added a key
 * to the format and no new machinery underneath it. Nesting is refused here rather than by the
 * type system, because the error an author needs is a sentence, not a missing overload.
 */
function detailResolver(resolution: Resolution): DetailResolver {
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
              "a world written here cannot contain a world; an inline interior is ordinary " +
              "slide content, narrated by the narration around it. A world that wants to " +
              "contain a world puts it in its own file and names it with `child:`, because " +
              "what makes that safe is the file, not the nesting",
          },
        ],
      };
    }

    return resolveInterior(record, resolution);
  };
}

/**
 * A body inside an entity, whichever spelling brought it.
 *
 * One function rather than two because the *content* rules are identical — one body key, from
 * the same closed set, validated by the same checks. The only thing the two spellings disagree
 * about is whether `world` is in the set, and that disagreement is settled by the callers above
 * before this is reached.
 */
function resolveInterior(
  record: Record<string, unknown>,
  resolution: Resolution,
): { body: SlideBody | undefined; issues: readonly WorldIssue[] } {
  {
    const read = resolution.read;
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
    if (record["series"] !== undefined) {
      for (const issue of seriesProblems(record["series"])) {
        issues.push({ path: ["series", ...issue.path], message: issue.message });
      }
    }
    if (record["formula"] !== undefined) {
      for (const issue of formulaProblems(record["formula"])) {
        issues.push({ path: ["formula", ...issue.path], message: issue.message });
      }
    }
    if (record["figure"] !== undefined) {
      const problem = figureProblem(record["figure"]);
      if (problem !== undefined) issues.push({ path: ["figure"], message: problem });
    }
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
    return {
      body: bodyOf(record as Parameters<typeof bodyOf>[0], resolution),
      issues: [],
    };
  }
}

const DETAIL_HINT = BODY_KEYS.filter((key) => key !== "world").join(", ");

/**
 * `child: ./payment.yaml` — a file becomes an interior and a narration.
 *
 * The order below is the whole of the safety argument, and every step of it fails loudly:
 *
 *     resolve      relative to the file that declared it, refusing anything outside the checkout
 *     check        against the inclusion chain, for a cycle, and against the depth limit
 *     read         through the same injected reader every quoted specimen uses
 *     shape        one body and a `say`, and emphatically not a presentation
 *     resolve      the body, in the child's scope, with the chain one longer
 *     bind         its narration against its own body, splicing any descent of its own
 *
 * The last two are the recursion, and they are the only recursion: a grandchild is resolved by
 * this same function with a chain one longer, so nothing here counts levels or special-cases a
 * depth. `checkInclusion` is what stops it, in one place, with the chain in the message.
 *
 * A module is resolved **eagerly, at parse time**, exactly as a quoted specimen is (idea:10), and
 * for the same reason: a file that has moved, a cycle somebody introduced by accident, and a
 * module that stopped parsing are all failures an author should hear about before a single second
 * of audio is synthesized.
 */
function childResolver(resolution: Resolution): ChildResolver {
  return (spec: unknown, within: Scope, id: string) => {
    const nothing = { body: undefined, module: undefined };
    if (typeof spec !== "string") {
      return {
        ...nothing,
        issues: [
          {
            path: [],
            message: "must be a path to a .yaml module, relative to this file",
          },
        ],
      };
    }

    const from = resolution.chain.at(-1) ?? "";
    let path: string;
    try {
      path = resolveModuleSpec(from, spec);
      checkInclusion(resolution.chain, path);
    } catch (error) {
      if (error instanceof ModuleError) {
        return { ...nothing, issues: [{ path: [], message: error.message }] };
      }
      throw error;
    }

    let text: string;
    try {
      text = resolution.read(path);
    } catch (error) {
      if (error instanceof SourceError) {
        return { ...nothing, issues: [{ path: [], message: error.message }] };
      }
      throw error;
    }

    let document: unknown;
    try {
      document = parseYaml(text);
    } catch (error) {
      if (error instanceof YAMLParseError) {
        return {
          ...nothing,
          issues: [
            {
              path: [],
              message: `module ${JSON.stringify(path)} is not valid YAML: ${error.message}`,
            },
          ],
        };
      }
      throw error;
    }

    let shape: ReturnType<typeof readModuleDocument>;
    try {
      shape = readModuleDocument(document, path, BODY_KEYS);
    } catch (error) {
      if (error instanceof ModuleError) {
        return { ...nothing, issues: [{ path: [], message: error.message }] };
      }
      throw error;
    }

    const scope = childScope(within, id);
    const inside: Resolution = {
      read: resolution.read,
      chain: [...resolution.chain, path],
      scope,
    };

    const resolved =
      shape.key === "world"
        ? worldInterior(shape.body, inside)
        : resolveInterior({ [shape.key]: shape.body }, inside);
    const issues: WorldIssue[] = resolved.issues.map((issue) => ({
      path: issue.path,
      message: `module ${JSON.stringify(path)}: ${issue.message}`,
    }));

    const sayProblems = cueListProblems(shape.say);
    for (const problem of sayProblems) {
      issues.push({
        path: ["say", ...problem.path],
        message: `module ${JSON.stringify(path)}: ${problem.message}`,
      });
    }

    if (resolved.body === undefined || sayProblems.length > 0 || issues.length > 0) {
      return { ...nothing, issues };
    }

    const bound = bindNarration(resolved.body, toCues(shape.say, scope), scope);
    for (const issue of bound.issues) {
      issues.push({
        path: ["say", ...issue.path],
        message: `module ${JSON.stringify(path)}: ${issue.message}`,
      });
    }
    if (issues.length > 0) return { ...nothing, issues };

    return {
      body: resolved.body,
      module: { path, scope, say: bound.cues },
      issues: [],
    };
  };
}

/** A module whose body is a world. The one interior an inline `detail` may not be. */
function worldInterior(
  value: unknown,
  resolution: Resolution,
): { body: SlideBody | undefined; issues: readonly WorldIssue[] } {
  const { world, issues } = resolveWorld(value, ...interiors(resolution));
  if (world === undefined) {
    return {
      body: undefined,
      issues: issues.map((issue) => ({
        path: ["world", ...issue.path],
        message: issue.message,
      })),
    };
  }
  return {
    body: { kind: "world", entities: world.entities, relations: world.relations },
    issues: [],
  };
}

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
    protocol?: unknown;
    figure?: unknown;
    formula?: unknown;
    series?: unknown;
  },
  resolution: Resolution,
): SlideBody {
  const read = resolution.read;
  if (slide.figure !== undefined) {
    return { kind: "figure", figure: slide.figure as FigureKind };
  }
  if (slide.formula !== undefined) {
    return {
      kind: "formula",
      lines: (slide.formula as unknown[]).map(formulaLineOf),
    };
  }
  if (slide.series !== undefined) {
    return {
      kind: "series",
      groups: (slide.series as unknown[]).map(seriesGroupOf),
    };
  }
  if (slide.world !== undefined) {
    const { world } = resolveWorld(slide.world, ...interiors(resolution));
    if (world === undefined)
      throw new Error("world passed validation but did not resolve");
    return { kind: "world", entities: world.entities, relations: world.relations };
  }
  if (slide.protocol !== undefined) {
    const { protocol } = resolveProtocol(slide.protocol);
    if (protocol === undefined)
      throw new Error("protocol passed validation but did not resolve");
    return { kind: "protocol", actors: protocol.actors, steps: protocol.steps };
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
  'narration text, { speech: "..." }, a pause such as { pause: "400ms" }, ' +
  "or { enter: <entity> } to go inside one";

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

  // The one word this round added to the narration language, and it is a verb rather than a
  // noun on purpose: `enter:` is something the narration *does*, at the moment it does it. There
  // is deliberately no `exit:`, because the child's own cue list running out is the return —
  // see `./nest.ts` for why completion is the unwind rule rather than graph terminality.
  if (keys.includes("enter")) {
    if (keys.length !== 1) {
      return "an enter cue takes no other keys; what it says is said by the module it enters";
    }
    const target = record["enter"];
    if (typeof target !== "string" || !ANCHOR_ID.test(target)) {
      return `enter must name an entity, and an entity's identity is ${ANCHOR_ID_HINT}`;
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
    for (const key of ["activates", "fills"] as const) {
      if (record[key] === undefined) continue;
      const id = record[key];
      if (typeof id !== "string" || !ANCHOR_ID.test(id)) {
        return `${key} must be ${ANCHOR_ID_HINT}`;
      }
    }
    // Two different claims about one moment: that the narration *reached* something, and that
    // something *accumulated across* it. A cue that made both would leave the compiler to guess
    // which relationship the sentence was actually about.
    if (record["activates"] !== undefined && record["fills"] !== undefined) {
      return (
        "has both activates and fills; a cue reaches something at a moment or fills " +
        "something across itself, and those are different sentences"
      );
    }
    if (record["pronounce"] !== undefined) {
      return checkPronounce(record["pronounce"], record["speech"]);
    }
    return undefined;
  }

  return `unknown cue ${JSON.stringify(keys.join(", "))}; must be ${CUE_HINT}`;
}

const SPEECH_CUE_KEYS = ["speech", "activates", "fills", "pronounce"];

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

/**
 * Whether a `say` is a narration, checked without a schema around it.
 *
 * Its own function because a module carries a `say` too, and a module is not validated by zod —
 * it arrives as a file the parser opened rather than as a branch of the document schema. Two
 * copies of "what a cue list has to be" would be two things to keep in step, and the one that
 * drifted would be the one nobody was looking at.
 */
function cueListProblems(
  value: unknown,
): readonly { path: readonly (string | number)[]; message: string }[] {
  const problems: { path: readonly (string | number)[]; message: string }[] = [];

  if (value === undefined || value === null) {
    return [{ path: [], message: "is required" }];
  }
  if (typeof value === "string") {
    return value.trim().length === 0 ? [{ path: [], message: "must not be empty" }] : [];
  }
  if (!Array.isArray(value)) {
    return [{ path: [], message: `must be ${CUE_HINT}, or a list of those` }];
  }
  if (value.length === 0) {
    return [{ path: [], message: "must list at least one narration cue" }];
  }

  let spoken = 0;
  value.forEach((cue, index) => {
    // Counted before validation: a cue that tried to be speech and got it wrong is still
    // an attempt to say something, and reporting "only pauses" alongside the real problem
    // would just be a second, misleading error.
    if (typeof cue === "string" || isSpeechCue(cue)) spoken += 1;

    const problem = checkCue(cue);
    if (problem !== undefined) problems.push({ path: [index], message: problem });
  });

  // A descent counts as saying something: a slide whose narration is one `enter:` says nothing
  // itself and everything through what it entered, which is a legitimate — if unusual — thing to
  // write, and refusing it would be refusing delegation.
  if (spoken === 0 && !value.some(isEnterCue)) {
    problems.push({
      path: [],
      message: "must contain something to say, not only pauses",
    });
  }
  return problems;
}

/**
 * Everything about a `say` except whether there had to be one.
 *
 * That last question moved to the entry, because it now depends on a sibling: a protocol's steps
 * carry their own narration (`./protocol.ts`), so an entry-level `say` becomes a *prologue* — the
 * establishing sentence spoken over the cast before anything is sent — and a protocol that needs
 * no prologue writes no `say` at all. Optional for exactly one body rather than optional in
 * general: "a slide with no clock" is still the failure it always was, and the body has to be able
 * to supply one.
 *
 * Absence is the only part deferred, and it is deferred rather than moved wholesale because a
 * field schema runs even when its siblings have failed, and an object's `superRefine` does not.
 * A slide with a bad title and an empty `say` should report both.
 */
const saySchema = z.unknown().superRefine((value, context) => {
  if (value === undefined) return;
  for (const problem of cueListProblems(value)) {
    context.addIssue({
      code: "custom",
      message: problem.message,
      path: [...problem.path],
    });
  }
});

function isSpeechCue(cue: unknown): cue is { speech: string; activates?: string } {
  return typeof cue === "object" && cue !== null && "speech" in cue;
}

function isEnterCue(cue: unknown): cue is { enter: string } {
  return typeof cue === "object" && cue !== null && "enter" in cue;
}

/**
 * Anchors are checked across the whole slide, because that is the only place both ends of
 * the relationship are visible: the identity is declared on a bullet and reached by a cue.
 *
 * A dangling reference is the failure that matters. Silently rendering a slide whose
 * narration was supposed to build it, without building it, is exactly the "silent
 * synchronization loss" a compiler exists to prevent.
 *
 * The check itself moved to `./nest.ts` once a slide could hold more than one narration. What
 * used to be "every id this slide declares" is now "every address this *scope* may reach", and a
 * module's narration is checked against its own body by the same function at the point the module
 * is opened — so a bad `activates:` three files down is reported with the same words as one on
 * the slide, and neither can reach across the boundary between them.
 */
function buildEntrySchema(resolution: Resolution) {
  return z
    .strictObject({
      slide: buildSlideSchema(resolution),
      // Optional to *zod*, required by the check below. Absence is the one thing about a `say`
      // that depends on a sibling, and a field schema cannot see one.
      say: saySchema.optional(),
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

      // The one thing about narration a field schema cannot decide, because it depends on a
      // sibling: a slide has to say something unless its body already does.
      if (entry.say === undefined) {
        if (entry.slide.protocol === undefined) {
          context.addIssue({ code: "custom", path: ["say"], message: "is required" });
        }
        return;
      }

      // Both ends of the relationship, once the body has actually resolved. When it has not,
      // whatever went wrong with it has already been reported against the body itself, and a
      // second complaint about the narration that pointed at it would be noise.
      const body = resolvedBody(entry.slide, resolution);
      if (body === undefined) return;
      if (cueListProblems(entry.say).length > 0) return;

      for (const issue of bindNarration(body, toCues(entry.say, ROOT_SCOPE), ROOT_SCOPE)
        .issues) {
        context.addIssue({
          code: "custom",
          path: ["say", ...issue.path],
          message: issue.message,
        });
      }
    });
}

/** The slide's body if it resolved, and nothing if it did not. Never throws. */
function resolvedBody(
  slide: Parameters<typeof bodyOf>[0],
  resolution: Resolution,
): SlideBody | undefined {
  try {
    return bodyOf(slide, resolution);
  } catch {
    return undefined;
  }
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
function buildDocumentSchema(resolution: Resolution) {
  const entrySchema = buildEntrySchema(resolution);
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
  /**
   * Where this document sits in the repository, for resolving `child:` against.
   *
   * A module is named relative to the file that declares it, which means the parser has to know
   * which file it is reading — and `source` is a label for error messages that may be a path
   * relative to anywhere the CLI happened to be run from. Defaulted from it, overridable by
   * callers that already know, and irrelevant to every deck that never descends.
   */
  readonly origin?: string;
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
  const resolution: Resolution = {
    read,
    chain: [options.origin ?? repositoryRelative(source)],
    scope: ROOT_SCOPE,
  };
  const { documentSchema, allowedKeys } = buildDocumentSchema(resolution);

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
    slides: raw.slides.map((entry, index) => {
      const body = bodyOf(entry.slide, resolution);
      // Flattened here rather than downstream, so that everything after this point sees one
      // ordered list of cues and knows nothing about modules — or about protocols. Validation
      // already ran the same walk and reported anything wrong with it, so this one cannot fail.
      const prologue =
        entry.say === undefined
          ? []
          : bindNarration(body, toCues(entry.say, ROOT_SCOPE), ROOT_SCOPE).cues;
      return {
        ordinal: index + 1,
        title: entry.slide.title.trim(),
        body,
        // A protocol's steps append themselves to whatever the author said first. The prologue
        // goes through `bindNarration` because it names things by hand; the steps do not, because
        // the compiler wrote both ends of that relationship and has nothing to look up.
        say:
          body.kind === "protocol"
            ? [...prologue, ...protocolCues(body, ROOT_SCOPE)]
            : prologue,
        preSayMs: optionalDuration(entry.pre_say) ?? preSayMs,
        postSayMs: optionalDuration(entry.post_say) ?? postSayMs,
        minSlideMs,
        modules: modulesOf(body),
      };
    }),
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
function toCues(value: unknown, scope: Scope): readonly NarrationCue[] {
  if (typeof value === "string") {
    return [{ kind: "speech", scope, text: collapseWhitespace(value) }];
  }
  return (value as unknown[]).map((cue): NarrationCue => {
    if (typeof cue === "string") {
      return { kind: "speech", scope, text: collapseWhitespace(cue) };
    }
    const record = cue as Record<string, unknown>;
    if (typeof record["pause"] === "string") {
      return { kind: "pause", scope, milliseconds: parseDurationMs(record["pause"]) };
    }
    if (typeof record["enter"] === "string") {
      // The scope it opens is filled in by `bindNarration`, which is the only thing that knows
      // whether the entity named here actually has a module behind it.
      return {
        kind: "enter",
        scope,
        milliseconds: ENTER_MS,
        target: record["enter"],
        into: childScope(scope, record["enter"]),
      };
    }

    const pronounce = record["pronounce"] as Record<string, string> | undefined;
    return {
      kind: "speech",
      scope,
      text: collapseWhitespace(record["speech"] as string),
      ...(record["activates"] === undefined
        ? {}
        : { activates: record["activates"] as string }),
      ...(record["fills"] === undefined ? {} : { fills: record["fills"] as string }),
      ...(pronounce === undefined
        ? {}
        : { pronounce: new Map(Object.entries(pronounce)) }),
    };
  });
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
