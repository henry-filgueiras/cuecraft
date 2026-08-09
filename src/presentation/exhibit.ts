/**
 * An exhibit: content cuecraft did not draw, and could not have.
 *
 * The eleventh body, and the first whose content cuecraft does not understand. Every other body is
 * something the compiler can read — a list has a length, a specimen has lines, a world has a
 * topology — and that understanding is what lets decision:10 pick the composition, the size and the
 * colour with the author naming none of them. An exhibit is a rectangle of pixels produced by a
 * program in another language, and there is nothing in it to read.
 *
 * That would be a hole in the thesis if the pixels could come from anywhere. They cannot:
 *
 *     exhibit:
 *       run: examples/revenue/quarterly-revenue.R
 *       with:
 *         transactions: examples/revenue/transactions.csv
 *
 * **There is deliberately no `image:` key.** A deck cannot name a PNG in the checkout and show it.
 * The only way to get pixels onto a cuecraft frame is to say what computes them, from what — and
 * the computation happens on every render. This is the same stance decision:18 takes for source:
 * a copy that has drifted looks completely authoritative while asserting something false, and the
 * cure is to quote rather than copy. An exhibit quotes a *computation*.
 *
 * What that buys, stated as the property worth testing: **deleting the generated image changes
 * nothing, and editing the input data changes the film.** A checked-in chart has neither.
 *
 * What is still authored is a program path and some input paths. What is derived is everything
 * else — where the picture goes, how large, on what ground, in which colours, and when. The R
 * program is *handed* the box and the palette rather than choosing them (`../compute/r.ts`), which
 * is decision:42 applied across a process boundary.
 */

/** One input the program may read, named so the program can find it without ordering. */
export interface AuthoredExhibitInput {
  /** How the R program refers to it: `CUECRAFT_INPUT_TRANSACTIONS`. */
  readonly name: string;
  /** Repository-relative, checked the way a quoted specimen's path is. */
  readonly file: string;
}

/**
 * Somewhere in the picture the deck can talk about, once the program has said where it is.
 *
 * Fractions of the drawn image, top-left origin — see `../compute/r.ts`. The composition positions
 * these as percentages inside a wrapper carrying the picture's own aspect ratio, which is why there
 * is no arithmetic anywhere and why a region survives the picture being fitted into a room the
 * program was never told about.
 */
export interface ExhibitRegion {
  readonly name: string;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** What every materialized exhibit carries, whatever the program handed back. */
interface ExhibitResourceCommon {
  /** Which output the program declared. Carried so a diagnostic can name it. */
  readonly name: string;
  readonly bytes: number;
}

/**
 * What materialization put where, once the program has actually run.
 *
 * Three shapes, and **the deck chooses none of them**. A slide says `run:` and `with:`; what comes
 * back decides whether it is a picture, a drawing or a table, and therefore which composition draws
 * it. That is decision:10's rule reaching one step further out than it ever has: composition is
 * chosen from the shape of the content, and here the content's shape is not known until a
 * subprocess has finished.
 *
 * The three differ in exactly one respect that matters — **how much of the artifact cuecraft can
 * see** — and they are ordered by it:
 *
 *     picture   nothing. A rectangle, plus rectangles the program said things were in.
 *     drawing   the names the program wrote into it, and no geometry.
 *     table     all of it. The first exhibit cuecraft lays out itself.
 */
export type ExhibitResource =
  | (ExhibitResourceCommon & {
      readonly kind: "picture";
      /** Relative to the render workspace's public directory, for `staticFile()`. */
      readonly src: string;
      readonly width: number;
      readonly height: number;
      /** In the order the slide declared them, which is the order anchors resolve against. */
      readonly regions: readonly ExhibitRegion[];
    })
  | (ExhibitResourceCommon & {
      readonly kind: "drawing";
      /**
       * The markup itself, carried in the timeline rather than fetched from `public/`.
       *
       * `staticFile()` and `<Img>` put an SVG in secure static mode, where cuecraft's own stylesheet
       * cannot reach a single element in it — which is the whole point of this format (idea:24). The
       * alternative to inlining is reading the file at render time behind `delayRender`, which makes
       * every still asynchronous to buy nothing: a specimen already carries a whole quoted source
       * file through the timeline, and a cairo SVG is the same order of size.
       */
      readonly markup: string;
      readonly width: number;
      readonly height: number;
      /**
       * What narration can reach, in the order the slide declared it — so an anchor's element
       * index means the same thing here as it does for every other body.
       */
      readonly elements: readonly string[];
      /**
       * Every name in the file, which is usually many more.
       *
       * The two lists are different questions and the first rendered frame is what taught the
       * difference. `elements` is *addressable*: four bars this deck talks about. `tagged` is
       * *drawn*: all sixteen. Receding only the addressable ones left the twelve nobody had
       * mentioned at full brightness beside the one being emphasized, so the frame said "these
       * thirteen matter" — which is the opposite of what the sentence said.
       */
      readonly tagged: readonly string[];
    })
  | (ExhibitResourceCommon & {
      readonly kind: "table";
      readonly table: ExhibitTable;
    });

/**
 * A table a program computed, with the identities narration can address it by.
 *
 * Derived at materialization from the CSV and the deck's `key:`, so that nothing downstream ever
 * re-derives an identity from a cell — two places that agree about a slug are one edit away from
 * disagreeing about it.
 */
export interface ExhibitTable {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  /** Which column identifies a row. An index into `columns`, resolved from the deck's `key:`. */
  readonly keyColumn: number;
  /** `row-<key>` per row, in row order. Parallel to `rows`. */
  readonly rowIds: readonly string[];
  /** `column-<header>` per column, in column order. Parallel to `columns`. */
  readonly columnIds: readonly string[];
}

export const EXHIBIT_KEYS = ["run", "with", "shows", "key"] as const;

export const EXHIBIT_HINT =
  "{ run: <path to an .R program>, with: { <name>: <path to an input> }, " +
  "shows: [<identity the program will declare>], key: <column that identifies a row> }";

/** What cuecraft can run. One entry, and the extension is how a deck says which. */
export const EXHIBIT_PROGRAM_EXTENSIONS = [".R", ".r"] as const;

/**
 * An input name, and the reason it is narrow.
 *
 * It becomes an environment variable on the far side (`CUECRAFT_INPUT_TRANSACTIONS`), so it has to
 * survive uppercasing and a shell. An identifier with hyphens is the largest set that does, and
 * anything wider would be a name that means one thing in the YAML and another in the program.
 */
const INPUT_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

export interface AuthoredExhibit {
  /** Repository-relative path of the R program. */
  readonly program: string;
  /**
   * The program's source, read at parse time.
   *
   * Eagerly, exactly as a quoted specimen is (idea:10): a program that has moved should fail the
   * deck before a second of narration is synthesized, not after. It is also what lets the runner
   * be handed source over stdin rather than a path — the file is read once, by the parser, through
   * the same reader every other repository access uses.
   */
  readonly source: string;
  readonly inputs: readonly AuthoredExhibitInput[];
  /**
   * The identities the picture will have, declared by the slide rather than discovered.
   *
   * Forced by an ordering rather than chosen (decision:57): `activates:` resolves against
   * `bodyElements` at parse time, and an exhibit's elements do not exist until a subprocess has
   * finished. The alternative was deferring anchor resolution for one body kind, which is a special
   * case cut deep into the parser.
   *
   * It is not a second copy of something cuecraft could know, because cuecraft cannot know it yet —
   * and materialization refuses a mismatch in **either** direction, so the deck and the program
   * cannot drift apart. Empty on an exhibit nobody talks into, which is every one shipped before
   * this existed.
   */
  readonly shows: readonly string[];
  /**
   * Which column of a computed table identifies a row, when the program hands one back.
   *
   * The one piece of vocabulary this round adds, and it is deliberately a *name* rather than a
   * mechanism. It does not select rows, filter them, order them or compute anything; it says which
   * column the deck intends to address rows by, which is the same statement `shows:` makes one
   * level down. Guessing it was the alternative — "the first column is the key" is true of every
   * pivot R will ever write — and a guess that is right most of the time produces identities that
   * silently change meaning when a program's output gains a column.
   *
   * Authored rather than declared by the program, for decision:57's reason: reading the YAML should
   * tell you what the slide can be asked about without running R. Absent on every exhibit that
   * hands back a picture, and refused at materialization if the CSV has no such column.
   */
  readonly key?: string;
}

/**
 * Turning a cell or a header into something `activates:` can name.
 *
 * Lowercased, non-alphanumerics collapsed to hyphens, and prefixed by what it is. The prefix is
 * doing real work: `row-west` and `column-west` are different objects on the same table, and a
 * scheme without it would make a key column named after a header ambiguous.
 *
 * Deliberately lossy and deliberately checked. Two rows whose keys slug to the same identity are a
 * refusal at materialization rather than a silently merged pair, because the alternative is
 * narration reaching one row and lighting another.
 */
export function rowId(key: string): string | undefined {
  const stem = slug(key);
  return stem === "" ? undefined : `row-${stem}`;
}

export function columnId(header: string): string | undefined {
  const stem = slug(header);
  return stem === "" ? undefined : `column-${stem}`;
}

/**
 * A cell reduced to the part of it that can be a name.
 *
 * Empty when nothing survived — a key cell of `—` or `2024/Q1 (est.)` reduced to punctuation — and
 * that emptiness is a refusal rather than a fallback, because a row that cannot be named is a row
 * narration would appear to be able to reach and could not.
 */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ExhibitIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

/** Reads a repository-relative file, or throws. The parser's injected reader. */
export type ExhibitReader = (file: string) => string;

/**
 * Validate an authored exhibit and fetch the program it names.
 *
 * Hand-checked rather than expressed as a `z.union`, for the reason every other body here is: a
 * union reports its branch failures nested three deep, and an author who wrote `runs:` should be
 * told the two keys rather than shown a tree.
 */
export function resolveExhibit(
  value: unknown,
  read: ExhibitReader,
): { exhibit?: AuthoredExhibit; issues: readonly ExhibitIssue[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { issues: [{ path: [], message: `must be ${EXHIBIT_HINT}` }] };
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter(
    (key) => !(EXHIBIT_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return {
      issues: [
        {
          path: [],
          message:
            `unknown key ${JSON.stringify(extra.join(", "))} ` +
            `(allowed: ${EXHIBIT_KEYS.join(", ")})`,
        },
      ],
    };
  }

  const issues: ExhibitIssue[] = [];
  const program = record["run"];
  if (typeof program !== "string" || program.trim() === "") {
    issues.push({ path: ["run"], message: "must name an .R program in the repository" });
  } else if (!EXHIBIT_PROGRAM_EXTENSIONS.some((suffix) => program.endsWith(suffix))) {
    issues.push({
      path: ["run"],
      message:
        `${JSON.stringify(program)} is not an R program; cuecraft runs ` +
        `${EXHIBIT_PROGRAM_EXTENSIONS.join(", ")} files and nothing else`,
    });
  }

  const inputs: AuthoredExhibitInput[] = [];
  const declared = record["with"];
  if (declared !== undefined) {
    if (typeof declared !== "object" || declared === null || Array.isArray(declared)) {
      issues.push({ path: ["with"], message: "must be a mapping of name to file" });
    } else {
      for (const [name, file] of Object.entries(declared as Record<string, unknown>)) {
        if (!INPUT_NAME.test(name)) {
          issues.push({
            path: ["with", name],
            message:
              `${JSON.stringify(name)} is not a usable input name; a name starts with a letter ` +
              "and continues with letters, digits, hyphens or underscores",
          });
          continue;
        }
        const problem = pathProblem(file);
        if (problem !== undefined) {
          issues.push({ path: ["with", name], message: problem });
          continue;
        }
        inputs.push({ name, file: file as string });
      }
    }
  }

  const shows: string[] = [];
  const declaredNames = record["shows"];
  if (declaredNames !== undefined) {
    if (!Array.isArray(declaredNames)) {
      issues.push({
        path: ["shows"],
        message: "must be a list of identities the program will declare",
      });
    } else if (declaredNames.length === 0) {
      issues.push({
        path: ["shows"],
        message: "must name at least one identity, or be left out entirely",
      });
    } else {
      declaredNames.forEach((name: unknown, index: number) => {
        if (typeof name !== "string" || !INPUT_NAME.test(name)) {
          issues.push({
            path: ["shows", index],
            message:
              `${JSON.stringify(name)} is not a usable identity; a name starts with a letter and ` +
              "continues with letters, digits, hyphens or underscores",
          });
          return;
        }
        if (shows.includes(name)) {
          issues.push({
            path: ["shows", index],
            message: `duplicate identity ${JSON.stringify(name)}`,
          });
          return;
        }
        shows.push(name);
      });
    }
  }

  let key: string | undefined;
  const declaredKey = record["key"];
  if (declaredKey !== undefined) {
    if (typeof declaredKey !== "string" || declaredKey.trim() === "") {
      issues.push({
        path: ["key"],
        message: "must name a column of the table the program will write",
      });
    } else {
      key = declaredKey.trim();
    }
  }

  if (issues.length > 0) return { issues };

  // Read last, so a deck with two mistakes reports both rather than failing on the filesystem
  // before the cheap checks have run.
  let source: string;
  try {
    source = read(program as string);
  } catch (error) {
    return { issues: [{ path: ["run"], message: (error as Error).message }] };
  }
  if (source.trim() === "") {
    return {
      issues: [{ path: ["run"], message: `${JSON.stringify(program)} is empty` }],
    };
  }

  return {
    exhibit: {
      program: program as string,
      source,
      inputs,
      shows,
      ...(key === undefined ? {} : { key }),
    },
    issues: [],
  };
}

/**
 * Whether a declared input path is one a presentation may name.
 *
 * Syntactic only, and deliberately so: the containment arithmetic that actually decides is
 * `resolveRepositoryPath`, which realpaths both ends and runs when the file is opened. This is the
 * cheap half, run at parse time so that `../../../etc/passwd` is refused against the slide that
 * wrote it rather than against a directory it never reached.
 */
export function pathProblem(file: unknown): string | undefined {
  if (typeof file !== "string" || file.trim() === "") {
    return "must name a file in the repository";
  }
  if (file.startsWith("/") || /^[A-Za-z]:[\\/]/.test(file)) {
    return `${JSON.stringify(file)} is absolute; an input is a path relative to the repository root`;
  }
  if (file.split(/[\\/]/).includes("..")) {
    return `${JSON.stringify(file)} leaves the repository; an input must be inside the checkout`;
  }
  return undefined;
}
