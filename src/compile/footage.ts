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
  for (let index = 0; index < slide.say.length; index += 1) {
    const cue = slide.say[index] as NarrationCue;
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

    // The film's region: everything after the `play:` that the parser accepted as subscribing to
    // it. `bindNarration` already established that this run is contiguous and that nothing outside
    // it carries a `during:`, so this only has to find where it ends.
    const region: NarrationCue[] = [];
    let holding = false;
    while (index + 1 < slide.say.length) {
      const next = slide.say[index + 1] as NarrationCue;
      const subscribed = next.kind === "speech" && next.during !== undefined;
      // A pause belongs to the aside it follows, and only once one has started. A pause straight
      // after the `play:` is the author asking for silence *after* the film — the same reading
      // `bindNarration` takes, stated in both places because both walks have to agree about where
      // the region ends.
      if (!subscribed && !(next.kind === "pause" && holding)) break;
      holding = holding || subscribed;
      index += 1;
      region.push(next);
    }

    const rendezvous = queue(
      region,
      resource,
      body.kind === "exhibit" ? body.program : "",
    );
    if (rendezvous.problem !== undefined) return { problem: rendezvous.problem };
    cues.push(...lower(cue, rendezvous.at ?? [], resource.durationSeconds));
  }
  return { cues };
}

/** One rendezvous: a place the film stops, and everything the narration says while it is there. */
interface Rendezvous {
  readonly seconds: number;
  readonly cues: readonly NarrationCue[];
}

/**
 * The film's cut points, and what is said at each of them.
 *
 * **This is where "several cues on one event is one rendezvous" happens**, and it happens by being
 * a grouping rather than a mapping: cues are gathered under the moment they name, in the order the
 * deck wrote them, so two sentences about `pass-3` produce one stop with two sentences at it rather
 * than a freeze and a resume per sentence. That property is the mission's, and it costs a `Map`.
 *
 * Two refusals, and both are disagreements between the deck and the film rather than authoring
 * slips the parser could have caught:
 *
 * - **A state the film does not reach.** decision:57's rule, one level out: what the deck says it
 *   will talk about has to exist, and the film's own list is what settles it.
 * - **States the deck holds in a different order from the one the film reaches them in.** The
 *   source reads in film order (`../presentation/nest.ts`), so a deck that subscribes to
 *   `converged` and then to `pass-3` has written down a sequence the film cannot perform, and
 *   silently reordering it would make the page a lie about the video.
 */
function queue(
  region: readonly NarrationCue[],
  resource: Extract<ExhibitResource, { kind: "footage" }>,
  program: string,
): { at?: readonly Rendezvous[]; problem?: string } {
  const times = new Map(resource.moments.map((moment) => [moment.name, moment.seconds]));
  const order: string[] = [];
  const grouped = new Map<string, NarrationCue[]>();

  for (const cue of region) {
    // A pause joins whatever aside it follows. The parser guarantees there is one.
    const named =
      cue.kind === "speech" && cue.during !== undefined ? cue.during : order.at(-1);
    if (named === undefined) continue;
    if (!grouped.has(named)) {
      if (!times.has(named)) {
        return {
          problem:
            `this slide holds at ${quote(named)}, which ${program} did not declare; the film ` +
            (resource.moments.length === 0
              ? "names no moments at all"
              : `reaches ${resource.moments.map((moment) => quote(moment.name)).join(", ")}`),
        };
      }
      order.push(named);
      grouped.set(named, []);
    }
    (grouped.get(named) as NarrationCue[]).push(cue);
  }

  const at = order.map((name) => ({
    seconds: times.get(name) as number,
    cues: grouped.get(name) as readonly NarrationCue[],
  }));
  for (let index = 1; index < at.length; index += 1) {
    const previous = at[index - 1] as Rendezvous;
    const current = at[index] as Rendezvous;
    if (current.seconds < previous.seconds) {
      return {
        problem:
          `this slide holds at ${quote(order[index - 1] as string)} and then at ` +
          `${quote(order[index] as string)}, and the film reaches them the other way round; a ` +
          "deck reads in the order its film runs",
      };
    }
  }
  return { at };
}

/**
 * The film cut into slices, with each rendezvous's narration between them.
 *
 * **The architectural heart of sprint:31, and it is nine lines.** Given a film of 8.13s, a moment
 * at 4.07s and a sentence subscribed to it, what comes out is
 *
 *     slice[0.00 .. 4.07]   <that sentence>   slice[4.07 .. 8.13]
 *
 * — three ordinary occupants of the one serial cursor, each with a duration known before the cursor
 * reaches it. Nothing downstream learns a new concept: `compilePresentation` places the slices by
 * borrowed duration exactly as it places one, `buildTimeline` walks them on the same cursor, and
 * the *freeze* is not here at all. It is the hold `buildTimeline` already derives between two
 * slices, which is the whole reason this round needed no renderer change (decision:65).
 *
 * The aside's own sentences are what extend the film. They are speech cues; they always were. A
 * medium cannot ask for time and does not: it is cut at a point it was already going to pass
 * through, and the narration that goes in the gap makes the gap.
 *
 * Endpoints are shared by construction — `to` of one slice is the `from` of the next, the same
 * number — which is what stops a split producing a repeated or a dropped frame of film once
 * `framesFor` has had both.
 *
 * A moment at 0 or at the very end produces an empty slice, which is dropped rather than emitted:
 * a leaf that occupies no time is a leaf nobody can see, and `held()` covers the frames either way.
 */
function lower(
  cue: Extract<NarrationCue, { kind: "play" }>,
  at: readonly Rendezvous[],
  durationSeconds: number,
): readonly NarrationCue[] {
  const out: NarrationCue[] = [];
  let from = 0;
  for (const stop of [
    ...at,
    { seconds: durationSeconds, cues: [] as readonly NarrationCue[] },
  ]) {
    if (stop.seconds > from) {
      out.push({
        kind: "play",
        scope: cue.scope,
        source: cue.source,
        fromSeconds: from,
        toSeconds: stop.seconds,
        rate: 1,
      });
      from = stop.seconds;
    }
    out.push(...stop.cues);
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
