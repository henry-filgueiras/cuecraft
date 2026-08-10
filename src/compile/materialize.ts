import { readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import type {
  ExhibitMoment,
  ExhibitRegion,
  ExhibitResource,
} from "../presentation/exhibit.ts";
import { columnId, rowId } from "../presentation/exhibit.ts";
import type { AuthoredSlide, Presentation } from "../presentation/parse.ts";
import { resolveRepositoryPath, SourceError } from "../presentation/source.ts";
import { repositoryRoot } from "../repository.ts";
import { COLORS, EXHIBIT } from "../render/theme.ts";
import { DEFAULT_FPS } from "./timeline.ts";
import { lowerFootage } from "./footage.ts";
import {
  RError,
  runR,
  type RFrame,
  type ROutput,
  type RRequest,
  type RResult,
} from "../compute/r.ts";

/**
 * Running every exhibit a deck declares, before anything is spoken.
 *
 * A stage of its own rather than a corner of `./compile.ts`, and the ordering is the argument for
 * it. dragon:1 forces synthesis before timing because timing needs measured audio. Nothing forces
 * *this* before synthesis — an exhibit's picture has no bearing on how long a sentence takes — so
 * the ordering was chosen, and it was chosen because **a broken R program should not cost a minute
 * of Kokoro**. A typo in an `aggregate()` call is found in about a second, and finding it after
 * eleven slides of narration have been synthesized is finding it in the wrong order.
 *
 * What comes out is a `Presentation` with the same shape and one field filled in per exhibit. It is
 * the only place in the format where a body is *completed* rather than read, and the reason it is
 * safe is that the field it fills cannot be authored: `./exhibit.ts` has no key for it. There is no
 * path by which a deck reaches a picture it did not compute here.
 *
 * Deliberately not a cache. A future one would have to hash the program, every declared input, the
 * R version and whatever packages that R has installed — and get invalidation right across all four
 * — which is a build-system problem this round has not earned. A deck that runs one `aggregate()`
 * pays about a second for the honesty.
 */

export class MaterializeError extends Error {
  /** Which slide asked for it, so the message names something the author wrote. */
  readonly ordinal: number;

  constructor(ordinal: number, message: string) {
    super(message);
    this.ordinal = ordinal;
  }

  report(): string {
    return `slide ${this.ordinal}: ${this.message}`;
  }
}

/** What a materialization produced, for the CLI to report and a test to assert against. */
export interface MaterializedExhibit {
  readonly ordinal: number;
  readonly program: string;
  readonly resource: ExhibitResource;
  readonly elapsedSeconds: number;
}

export interface MaterializeOptions {
  /** The presentation's disposable render state. Results land under its `public/`. */
  readonly workspace: string;
  /** The checkout an exhibit's inputs must live inside. */
  readonly root?: string;
  /** The runner. Injected so the stage can be tested without R installed. */
  readonly run?: (request: RRequest) => Promise<RResult>;
  readonly onExhibit?: (exhibit: MaterializedExhibit) => void;
}

export interface Materialization {
  readonly presentation: Presentation;
  readonly exhibits: readonly MaterializedExhibit[];
}

/** Where a computed image lives inside the public directory, relative to it. */
export const EXHIBIT_DIR = "exhibits";

/**
 * The box, and the palette, that every exhibit is drawn into.
 *
 * One frame for every program in every deck, because it is a property of the *composition* and not
 * of the content — the room under a heading is the same room whatever is put in it. An author who
 * wants a different one is asking for a coordinate, which is the thing decision:10 exists to refuse.
 */
export function exhibitFrame(): RFrame {
  return {
    width: EXHIBIT.width * EXHIBIT.scale,
    height: EXHIBIT.height * EXHIBIT.scale,
    pointSize: EXHIBIT.pointSize * EXHIBIT.scale,
    fps: DEFAULT_FPS,
    background: COLORS.ink,
    foreground: COLORS.paper,
    muted: COLORS.muted,
    accent: COLORS.accent,
  };
}

/**
 * A stable directory name for one slide's exhibit.
 *
 * The ordinal leads, so two slides running the same program do not collide and the directories sort
 * the way the deck reads. The program's own name follows, so a human looking at the workspace can
 * tell which run produced what without opening anything.
 */
export function exhibitSlug(ordinal: number, program: string): string {
  const stem = basename(program, extname(program)).replace(/[^A-Za-z0-9._-]+/g, "-");
  return `slide-${String(ordinal).padStart(2, "0")}-${stem === "" ? "exhibit" : stem}`;
}

export async function materializePresentation(
  presentation: Presentation,
  options: MaterializeOptions,
): Promise<Materialization> {
  const run = options.run ?? runR;
  const root = options.root ?? repositoryRoot();
  const exhibitsRoot = join(options.workspace, "public", EXHIBIT_DIR);

  const exhibits: MaterializedExhibit[] = [];
  const slides: AuthoredSlide[] = [];

  for (const slide of presentation.slides) {
    if (slide.body.kind !== "exhibit") {
      slides.push(slide);
      continue;
    }
    const body = slide.body;
    const slug = exhibitSlug(slide.ordinal, body.program);

    const inputs = [];
    for (const input of body.inputs) {
      let path: string;
      try {
        path = resolveRepositoryPath(root, input.file);
      } catch (error) {
        throw new MaterializeError(
          slide.ordinal,
          error instanceof SourceError
            ? `input ${JSON.stringify(input.name)}: ${error.message}`
            : String(error),
        );
      }
      try {
        const info = await stat(path);
        if (!info.isFile()) {
          throw new MaterializeError(
            slide.ordinal,
            `input ${JSON.stringify(input.name)}: ${JSON.stringify(input.file)} is not a file`,
          );
        }
      } catch (error) {
        if (error instanceof MaterializeError) throw error;
        throw new MaterializeError(
          slide.ordinal,
          `input ${JSON.stringify(input.name)}: ${JSON.stringify(input.file)} ` +
            "does not exist in the repository",
        );
      }
      inputs.push({ name: input.name, path });
    }

    let result: RResult;
    try {
      result = await run({
        source: body.source,
        label: body.program,
        outputDir: join(exhibitsRoot, slug),
        inputs,
        frame: exhibitFrame(),
      });
    } catch (error) {
      if (error instanceof RError) {
        throw new MaterializeError(slide.ordinal, error.report());
      }
      throw error;
    }

    // Exactly one, and the refusal is deliberate rather than provisional. A composition places one
    // picture; a program that declared three has not said which of them the slide is about, and
    // there is no key an author could add to say so without that key being a layout instruction.
    const [output] = result.outputs;
    if (output === undefined) {
      throw new MaterializeError(
        slide.ordinal,
        `${body.program} ran successfully and declared no output; an exhibit needs one ` +
          "(see the output protocol in src/compute/r.ts)",
      );
    }
    if (result.outputs.length > 1) {
      throw new MaterializeError(
        slide.ordinal,
        `${body.program} declared ${result.outputs.length} outputs ` +
          `(${result.outputs.map((entry) => entry.name).join(", ")}); a slide shows one picture, ` +
          "so an exhibit's program must declare exactly one",
      );
    }

    const resource = await resourceFor(
      slide.ordinal,
      body,
      output,
      result.regions,
      result.moments,
      slug,
    );

    const materialized: MaterializedExhibit = {
      ordinal: slide.ordinal,
      program: body.program,
      resource,
      elapsedSeconds: result.elapsedSeconds,
    };
    exhibits.push(materialized);
    options.onExhibit?.(materialized);

    // The one place a *narration* is rewritten by something a program computed, and the reason it
    // is here rather than in the parser is that the numbers it needs are measurements
    // (`./footage.ts`). A slide whose exhibit is still comes back unchanged.
    const completed: AuthoredSlide = { ...slide, body: { ...body, resource } };
    const lowered = lowerFootage(completed);
    if (lowered.cues === undefined) {
      throw new MaterializeError(
        slide.ordinal,
        lowered.problem ?? "the film could not be placed",
      );
    }
    slides.push({ ...completed, say: lowered.cues });
  }

  return { presentation: { ...presentation, slides }, exhibits };
}

/**
 * How large a table cuecraft will draw, and why the numbers are what they are.
 *
 * `MAX_SERIES_TOTAL`'s reasoning with different nouns: the ceiling is where the promise breaks, not
 * where the arithmetic does. A table's promise is that a viewer can *read* a row and that narration
 * can walk to one, and both of those fail long before memory does.
 *
 * Two hundred rows is far past what a film can actually visit — the showcase's narration reaches
 * four — and is set where it is so that "the row is offscreen and the exhibit goes and gets it" is
 * demonstrably true rather than a special case of a short list.
 *
 * Eight columns is a measurement rather than a preference. The content box is about 1650px, so an
 * eighth of it is 206px, and at the size a table is set for a room that is around twelve characters
 * — which is where a column stops holding a value and starts holding the beginning of one.
 */
export const MAX_TABLE_ROWS = 200;
export const MAX_TABLE_COLUMNS = 8;

/**
 * How much film cuecraft will play, and why there is a number at all.
 *
 * The same argument as the two above with a clock in it. A temporal exhibit is the first thing a
 * program can hand back that **spends the presentation's own time**, and a viewer's patience for
 * uninterrupted motion under a heading runs out long before any resource does. Two and a half
 * minutes is far past the k-means demonstration's nine seconds and is set where it is so that
 * "cuecraft holds up evidence" stays true of the shape of the film: past this, the narration is an
 * accompaniment to a video rather than a presentation showing one.
 */
export const MAX_FOOTAGE_SECONDS = 150;

/**
 * What the program handed back, turned into the thing a composition draws.
 *
 * The whole of the three-way branch lives here rather than at the call site, because what differs
 * between the kinds is not how they are placed but **what cuecraft is allowed to claim it knows**,
 * and that is one argument stated three times.
 */
async function resourceFor(
  ordinal: number,
  body: Extract<AuthoredSlide["body"], { kind: "exhibit" }>,
  output: ROutput,
  regions: readonly ExhibitRegion[],
  moments: readonly ExhibitMoment[],
  slug: string,
): Promise<ExhibitResource> {
  const refuse = (message: string): never => {
    throw new MaterializeError(ordinal, message);
  };

  // Before the branch rather than inside three arms of it: a moment is a state a *film* reaches,
  // so declaring one beside a chart is a program that has confused two of its own outputs, and
  // saying so once beats saying nothing on two of the three paths.
  if (output.type !== "video" && moments.length > 0) {
    return refuse(
      `${body.program} declared ${moments.length} moment(s) beside a ${output.type}; ` +
        "a moment is a state a film reaches, and a still reaches none",
    );
  }

  if (output.type === "png") {
    const drawn = new Map(regions.map((region) => [region.name, region]));
    agree(ordinal, body, [...drawn.keys()], "the picture shows", { both: true });
    return {
      kind: "picture",
      src: `${EXHIBIT_DIR}/${slug}/${output.file}`,
      name: output.name,
      // In the slide's order, not the program's, because that is the order `bodyElements`
      // published and therefore the order every anchor index already means.
      regions: body.shows.map((name) => drawn.get(name) as ExhibitRegion),
      width: output.width,
      height: output.height,
      bytes: output.bytes,
    };
  }

  if (output.type === "video") {
    // Two refusals a still never needed, and both are decision:64.
    //
    // A sound track is refused rather than muted. `<OffthreadVideo muted>` would have made this
    // invisible, which is exactly the objection: a program that wrote audio believed the sound
    // mattered, and discarding it silently is cuecraft deciding it did not.
    if (output.hasAudio) {
      return refuse(
        `${body.program} handed back a film with a sound track, and cuecraft has one producer ` +
          "of sound. Encode it silent — ffmpeg's `-an` — and let the narration speak over it",
      );
    }
    // A ceiling for `MAX_TABLE_ROWS`' reason: where the promise breaks, not where the arithmetic
    // does. A medium is evidence a presentation *holds up*, and past a couple of minutes of
    // uninterrupted playback the film is a video with a slide around it.
    if (output.durationSeconds > MAX_FOOTAGE_SECONDS) {
      return refuse(
        `${body.program} handed back ${output.durationSeconds.toFixed(1)}s of film, and cuecraft ` +
          `plays at most ${MAX_FOOTAGE_SECONDS}s. Past that the narration is an accompaniment to ` +
          "a video rather than a presentation holding one up",
      );
    }
    if (body.shows.length > 0) {
      return refuse(
        `this slide shows ${body.shows.map(quote).join(", ")}, and ${body.program} handed back a ` +
          "film; a film declares no parts narration can point at",
      );
    }
    if (body.key !== undefined) {
      return refuse(
        `this slide names a key column and ${body.program} handed back a film, not a table`,
      );
    }
    // The one check a moment cannot get anywhere else. `../compute/r.ts` refuses a time that is
    // not a number and a time before the start; only here is the film's own length known, and a
    // moment past the end is a state the deck could subscribe to and the film would never reach.
    const overrun = moments.filter((moment) => moment.seconds > output.durationSeconds);
    if (overrun.length > 0) {
      return refuse(
        `${body.program} declared ${overrun.map((moment) => quote(moment.name)).join(", ")} ` +
          `after the end of a ${output.durationSeconds.toFixed(2)}s film`,
      );
    }
    return {
      kind: "footage",
      src: `${EXHIBIT_DIR}/${slug}/${output.file}`,
      name: output.name,
      width: output.width,
      height: output.height,
      durationSeconds: output.durationSeconds,
      moments: [...moments],
      bytes: output.bytes,
    };
  }

  if (output.type === "svg") {
    agree(ordinal, body, output.elements, "the drawing names");
    return {
      kind: "drawing",
      name: output.name,
      markup: await readFile(output.path, "utf8"),
      width: output.width,
      height: output.height,
      elements: [...body.shows],
      tagged: output.elements,
      bytes: output.bytes,
    };
  }

  const { columns, rows } = output.table;
  if (rows.length > MAX_TABLE_ROWS) {
    return refuse(
      `${body.program} wrote ${rows.length} rows and cuecraft draws at most ${MAX_TABLE_ROWS}; ` +
        "beyond that a table stops being something narration could walk through, which is the " +
        "whole of what a table exhibit is for",
    );
  }
  if (columns.length > MAX_TABLE_COLUMNS) {
    return refuse(
      `${body.program} wrote ${columns.length} columns and cuecraft draws at most ` +
        `${MAX_TABLE_COLUMNS}; past that a column is too narrow to hold a value at the size a ` +
        "slide is set for",
    );
  }

  if (body.key === undefined) {
    return refuse(
      `${body.program} handed back a table, and this slide does not say which column identifies ` +
        `a row. Add \`key: <column>\` to the exhibit; the columns are ${columns.map(quote).join(", ")}`,
    );
  }
  const keyColumn = columns.indexOf(body.key);
  if (keyColumn < 0) {
    return refuse(
      `this slide's key is ${quote(body.key)} and ${body.program} wrote no such column; ` +
        `the columns are ${columns.map(quote).join(", ")}`,
    );
  }

  const rowIds: string[] = [];
  const seen = new Map<string, number>();
  for (const [index, row] of rows.entries()) {
    const cell = row[keyColumn] ?? "";
    const id = rowId(cell);
    if (id === undefined) {
      return refuse(
        `row ${index + 1} has ${quote(cell)} in the key column ${quote(body.key)}, and nothing ` +
          "in it can be a name; every row of a table exhibit has to be addressable",
      );
    }
    const first = seen.get(id);
    if (first !== undefined) {
      return refuse(
        `rows ${first + 1} and ${index + 1} both address as ${quote(id)}; a key column has to ` +
          "identify a row, and two rows that answer to one name would light the wrong one",
      );
    }
    seen.set(id, index);
    rowIds.push(id);
  }

  const columnIds: string[] = [];
  for (const header of columns) {
    const id = columnId(header);
    if (id === undefined) {
      return refuse(
        `the column named ${quote(header)} has nothing in it that can be a name; every column ` +
          "of a table exhibit has to be addressable",
      );
    }
    columnIds.push(id);
  }

  // One direction only, and the asymmetry is the point. A picture's regions and a drawing's names
  // are things the *program chose to declare*, so one the deck never asked for is drift between two
  // statements that are supposed to agree. A table's identities are **derived from the data**: a
  // hundred rows produce a hundred names, the set changes when the CSV does, and a deck cannot be
  // asked to enumerate them. So a name the deck shows must exist, and a name it does not show is
  // simply a row nobody talks about.
  const available = [...rowIds, ...columnIds];
  const missing = body.shows.filter((name) => !available.includes(name));
  if (missing.length > 0) {
    return refuse(
      `this slide shows ${missing.map(quote).join(", ")}, which is not in the table ` +
        `${body.program} wrote. Rows address as ${rowIds.slice(0, 4).map(quote).join(", ")}` +
        `${rowIds.length > 4 ? ` (and ${rowIds.length - 4} more)` : ""}; ` +
        `columns address as ${columnIds.map(quote).join(", ")}`,
    );
  }

  return {
    kind: "table",
    name: output.name,
    bytes: output.bytes,
    table: { columns, rows, keyColumn, rowIds, columnIds },
  };
}

/**
 * decision:57's bargain, checked against what the program actually produced.
 *
 * The slide declares which identities its artifact will have because anchors resolve before R runs;
 * the program declares which it drew. One direction always holds: **a name the deck shows and the
 * program did not produce is a highlight over nothing**, and that is the check that catches a typo,
 * a rename, and a program whose output has quietly changed shape.
 *
 * The other direction — a name the program produced and the deck never mentions — holds only for a
 * PNG's regions, and the showcase is what taught the difference. A `#cuecraft region` line is
 * *hand-written per panel*: there are four of them because somebody decided a panel was worth being
 * able to talk about, so a fifth appearing means the two statements have drifted. A drawing's tags
 * and a table's rows are **generated per object**: sixteen bars produce sixteen names and
 * twenty-four rows produce twenty-four, and a deck that talks about four of them is a deck, not a
 * mismatch. Requiring it to enumerate the rest would make `shows:` a transcription of the data.
 *
 * So the rule is: *scarce and authored* is checked both ways, *generated from content* is checked
 * one way. That distinction is a real one and it is the shape of decision:57 rather than a
 * weakening of it — the half that stops a highlight landing on nothing is untouched.
 */
function agree(
  ordinal: number,
  body: Extract<AuthoredSlide["body"], { kind: "exhibit" }>,
  declared: readonly string[],
  what: string,
  options: { readonly both?: boolean } = {},
): void {
  const missing = body.shows.filter((name) => !declared.includes(name));
  const unasked =
    options.both === true ? declared.filter((name) => !body.shows.includes(name)) : [];
  if (missing.length === 0 && unasked.length === 0) return;

  throw new MaterializeError(
    ordinal,
    `${body.program} and this slide disagree about what ${what}` +
      (missing.length === 0
        ? ""
        : `; the slide shows ${missing.map(quote).join(", ")}, which the program did not draw`) +
      (unasked.length === 0
        ? ""
        : `; the program drew ${unasked.map(quote).join(", ")}, which the slide does not show`),
  );
}

/** Quoting a name in a diagnostic, so a message reads as a list rather than as prose. */
function quote(name: string): string {
  return JSON.stringify(name);
}

/** Whether a deck has anything to materialize at all, so the stage can stay silent when it does not. */
export function hasExhibits(presentation: Presentation): boolean {
  return presentation.slides.some((slide) => slide.body.kind === "exhibit");
}
