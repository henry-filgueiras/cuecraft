import { stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import type { ExhibitResource } from "../presentation/exhibit.ts";
import type { AuthoredSlide, Presentation } from "../presentation/parse.ts";
import { resolveRepositoryPath, SourceError } from "../presentation/source.ts";
import { repositoryRoot } from "../repository.ts";
import { COLORS, EXHIBIT } from "../render/theme.ts";
import { RError, runR, type RFrame, type RRequest, type RResult } from "../compute/r.ts";

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

    const resource: ExhibitResource = {
      src: `${EXHIBIT_DIR}/${slug}/${output.file}`,
      name: output.name,
      width: output.width,
      height: output.height,
      bytes: output.bytes,
    };

    const materialized: MaterializedExhibit = {
      ordinal: slide.ordinal,
      program: body.program,
      resource,
      elapsedSeconds: result.elapsedSeconds,
    };
    exhibits.push(materialized);
    options.onExhibit?.(materialized);

    slides.push({ ...slide, body: { ...body, resource } });
  }

  return { presentation: { ...presentation, slides }, exhibits };
}

/** Whether a deck has anything to materialize at all, so the stage can stay silent when it does not. */
export function hasExhibits(presentation: Presentation): boolean {
  return presentation.slides.some((slide) => slide.body.kind === "exhibit");
}
