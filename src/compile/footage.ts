import type { NarrationCue } from "../presentation/cue.ts";
import type { ExhibitResource } from "../presentation/exhibit.ts";
import type { AuthoredSlide } from "../presentation/parse.ts";

/**
 * Turning a film and the narration around it into ordinary leaf occupants of one serial track.
 *
 * This is the module decision:63 was written to make possible, and its whole job is to make sure
 * nothing downstream of it ever learns that a temporal medium exists. What comes in is a slide
 * whose narration says `play: kmeans`. What goes out is a cue list in which that is a **slice**:
 * a local media interval, a rate at which it is consumed, and a length in seconds that the
 * compiler advances its cursor by exactly as it advances it for a pause.
 *
 *     play: kmeans                ->   slice[0.0 .. 9.4] @ 1
 *
 * That is the entire lowering today, and it is deliberately the shape that generalizes rather than
 * the shape that is shortest. idea:27's design is the same function with more split points:
 *
 *     play: kmeans, narration subscribed to iteration-2 @ 3.7s
 *
 *       ->   slice[0.0 .. 3.7] @ 1   <the aside's own cues>   slice[3.7 .. 9.4] @ 1
 *
 * — five leaf occupants, no scheduler, no second clock, and nothing between here and `framesFor`
 * that knows the difference between those two cases.
 *
 * ## Why the split points are seconds and the endpoints are absolute
 *
 * Endpoints rather than lengths, because two adjacent slices have to agree about the frame between
 * them **to the frame**. `to` of one slice is `from` of the next by construction here, so
 * `../compile/timeline.ts` converting both through `framesFor` cannot produce a gap or a repeat at
 * the boundary however the arithmetic rounds. Lengths would leave the two ends free to round apart.
 *
 * Seconds rather than frames, because frames do not exist yet. `fps` is an option of the timeline
 * and not a property of the compilation, and a module that quantized here would be a second place
 * that turns time into frames — which decision:9 has exactly one of.
 *
 * ## Why this runs at materialization and not at parse
 *
 * idea:27 predicted the *structure* would lower in `bindNarration` beside `enter:`, and it does
 * not, for a reason that only shows up once there is a real medium: a slice's endpoints are a
 * **measurement of a file that does not exist at parse time**. What `bindNarration` can check, and
 * does, is the half that is a fact about the source — that the slide has a program at all, and that
 * nothing plays one film twice. What is left needs the film, so it happens where the film is.
 */

/** What the lowering produced, or why the deck and the program disagree about the film. */
export interface Lowering {
  readonly cues?: readonly NarrationCue[];
  readonly problem?: string;
}

/**
 * Rewrite one slide's narration so that every `play:` in it is a slice with a measured length.
 *
 * Total over every slide, and a no-op on almost all of them: a slide with no exhibit, or an exhibit
 * that handed back a still nobody plays, comes back exactly as it went in. The two disagreements it
 * can find are the two directions of decision:57's bargain applied to a clock — a deck that plays a
 * film the program did not make, and a program that made a film the deck never plays.
 */
export function lowerFootage(slide: AuthoredSlide): Lowering {
  const plays = slide.say.filter((cue) => cue.kind === "play");
  const body = slide.body;
  const resource: ExhibitResource | undefined =
    body.kind === "exhibit" ? body.resource : undefined;

  if (resource?.kind !== "footage") {
    if (plays.length === 0) return { cues: slide.say };
    const played = plays[0]?.kind === "play" ? plays[0].source : "";
    return {
      problem:
        `this slide's narration plays ${quote(played)}, and ` +
        `${body.kind === "exhibit" ? body.program : "this slide"} handed back ` +
        `${describe(resource)}; only a film can be played`,
    };
  }

  // The other direction, and it is checked because the failure is silent rather than loud. A film
  // nobody plays would be materialized, encoded, and then drawn as a still first frame under a
  // heading — a slide that looks very nearly right and never moves.
  if (plays.length === 0) {
    return {
      problem:
        `${body.kind === "exhibit" ? body.program : "this slide's program"} handed back a film ` +
        `and no cue plays it; add \`play: ${resource.name}\` to this slide's narration, or have ` +
        "the program draw a still",
    };
  }

  const cues: NarrationCue[] = [];
  for (const cue of slide.say) {
    if (cue.kind !== "play") {
      cues.push(cue);
      continue;
    }
    if (cue.source !== resource.name) {
      return {
        problem:
          `this slide's narration plays ${quote(cue.source)}, and its program declared ` +
          `${quote(resource.name)}`,
      };
    }
    cues.push(...slices(cue, resource.durationSeconds));
  }
  return { cues };
}

/**
 * The medium, cut at every point the narration asked it to stop.
 *
 * One slice today, because nothing subscribes to anything yet. The signature is the interesting
 * part: what a future round adds is entries to `at`, and everything else — the endpoints, the
 * rate, the fact that the last slice runs to the end of the film — is already stated once.
 */
function slices(
  cue: Extract<NarrationCue, { kind: "play" }>,
  durationSeconds: number,
): readonly NarrationCue[] {
  const cuts: readonly number[] = [];
  const bounds = [0, ...cuts, durationSeconds];
  const out: NarrationCue[] = [];
  for (let index = 0; index + 1 < bounds.length; index += 1) {
    out.push({
      kind: "play",
      scope: cue.scope,
      source: cue.source,
      fromSeconds: bounds[index] as number,
      toSeconds: bounds[index + 1] as number,
      rate: 1,
    });
  }
  return out;
}

function describe(resource: ExhibitResource | undefined): string {
  switch (resource?.kind) {
    case "picture":
      return "a picture";
    case "drawing":
      return "a drawing";
    case "table":
      return "a table";
    default:
      return "nothing that has been materialized";
  }
}

function quote(name: string): string {
  return JSON.stringify(name);
}
