import type { NarrationCue } from "./cue.ts";

/**
 * Which earlier moment a `recall:` names, and every way of getting that wrong.
 *
 * The one question in this format that is about a *presentation* rather than about a slide. Every
 * other reference resolves inside one scope — an `activates:` names something on the slide it is
 * spoken over, an `enter:` names an entity of the world in front of it — and `./nest.ts` resolves
 * them with the body in hand. A recall has no body to look in: it reaches back across slides, which
 * means the only thing that can answer it is the deck.
 *
 * ## The rule, and why it is this narrow
 *
 *     exactly one earlier slide's root-scoped `activates` with that id
 *
 * Each half of that carries weight:
 *
 * - **Earlier.** A recall says something was already established. A forward reference would be a
 *   film quoting a sentence the viewer has not heard, which is not a recall, it is a spoiler with a
 *   cut in it. A same-slide reference is worse: the picture would not change, so the replay would
 *   read as a stutter rather than as a return.
 * - **Exactly one.** Two candidates make `recall: settlement` mean two different things depending on
 *   which one a resolver happened to visit first, and "first wins" is the wrong default for the one
 *   reference in this format that crosses a slide boundary — a deck grows by adding slides at the
 *   end, so first-wins would silently keep pointing at the older one forever.
 * - **Root-scoped.** A module is written without knowing where it is mounted (`./scope.ts`), so an
 *   anchor inside one is not a fact about this deck and cannot be quoted by it.
 * - **`activates`, not `fills`.** An anchor is a moment and a span is an interval (decision:14 and
 *   `Span` in `../compile/timeline.ts`). A recall replays one clip whole, which is a moment's worth
 *   of narration, and a population that accumulates across a sentence is a different claim.
 *
 * Together those make a cycle unreachable. A recall can only point backwards, only at a speech cue,
 * and a speech cue can never be a recall — so there is no edge to close a loop with, and no cycle
 * detector was built for a graph that cannot have one.
 *
 * ## Read off the authored source, twice, on purpose
 *
 * The surface below is taken from a slide's `say` exactly as the author wrote it, and the same
 * function serves the validation walk and the build walk. Two readings of "which anchors are
 * recallable" would be two things to keep in step, and the one that drifted would be the one nobody
 * was looking at — the objection `./nest.ts` makes to having two copies of what a cue list is.
 *
 * Cue indices are indices into the authored list, which is what makes an error say "narration cue
 * 3" and mean the third line the author can see. A slide that descends has its callees' cues
 * spliced in later, and a recall never survives that splice into a different position because a
 * recall is only ever written at the root.
 */

/** What one slide contributes to the deck's recall graph, read off its authored `say`. */
export interface RecallSurface {
  /** Root-scoped `activates` ids, in cue order. At most one cue per id — `./nest.ts` sees to that. */
  readonly activates: readonly string[];
  /** Root-scoped `fills` ids, kept only so a recall of one can be told what it is instead. */
  readonly fills: readonly string[];
  /** Every `recall:` this slide makes, by index into its authored cue list. */
  readonly recalls: readonly { readonly cueIndex: number; readonly target: string }[];
}

export interface RecallIssue {
  readonly slideIndex: number;
  readonly cueIndex: number;
  readonly message: string;
}

export interface RecallResolution {
  /**
   * Where each recall resolved to, keyed by `recallKey`, as a 1-based slide ordinal.
   *
   * An ordinal rather than an index because that is what a slide is called everywhere an author or
   * a compiled artifact can see one, and a recall's source appears in both.
   */
  readonly sources: ReadonlyMap<string, number>;
  readonly issues: readonly RecallIssue[];
}

export function recallKey(slideIndex: number, cueIndex: number): string {
  return `${slideIndex}:${cueIndex}`;
}

/**
 * Read one slide's contribution off its `say`.
 *
 * `unknown` because it is called from validation, where the value has passed the cue schema but is
 * still raw YAML, and from the build, where it is the same raw value. Nothing here judges: a `say`
 * that is not a cue list has already been reported by `cueListProblems`.
 */
export function recallSurface(say: unknown): RecallSurface {
  const activates: string[] = [];
  const fills: string[] = [];
  const recalls: { cueIndex: number; target: string }[] = [];

  if (!Array.isArray(say)) return { activates, fills, recalls };

  say.forEach((cue: unknown, cueIndex: number) => {
    if (typeof cue !== "object" || cue === null) return;
    const record = cue as Record<string, unknown>;
    if (typeof record["activates"] === "string") activates.push(record["activates"]);
    if (typeof record["fills"] === "string") fills.push(record["fills"]);
    if (typeof record["recall"] === "string") {
      recalls.push({ cueIndex, target: record["recall"] });
    }
  });

  return { activates, fills, recalls };
}

/**
 * Resolve every recall in a deck, in slide order.
 *
 * A deck with no recalls produces no issues and consults nothing, which is what keeps this from
 * being a new restriction on decks that never asked for the feature: two slides may both activate
 * `check` forever, and only a cue that actually names `check` makes that a question.
 */
export function resolveRecalls(surfaces: readonly RecallSurface[]): RecallResolution {
  const sources = new Map<string, number>();
  const issues: RecallIssue[] = [];

  surfaces.forEach((surface, slideIndex) => {
    for (const { cueIndex, target } of surface.recalls) {
      const declaring = surfaces
        .map((other, index) => ({ index, has: other.activates.includes(target) }))
        .filter((entry) => entry.has)
        .map((entry) => entry.index);

      const earlier = declaring.filter((index) => index < slideIndex);
      if (earlier.length === 1 && earlier[0] !== undefined) {
        sources.set(recallKey(slideIndex, cueIndex), earlier[0] + 1);
        continue;
      }

      issues.push({
        slideIndex,
        cueIndex,
        message: refusal(target, slideIndex, declaring, earlier, surfaces),
      });
    }
  });

  return { sources, issues };
}

/**
 * Why this recall did not resolve, in the most specific terms available.
 *
 * Ordered by how close the author got. Somebody who wrote the id on the wrong slide is told which
 * slide it is on; somebody who wrote it on a `fills` is told what a `fills` is; somebody who typed
 * it wrong is told what they could have typed. The generic "no such anchor" is last because it is
 * the least useful thing that is true.
 */
function refusal(
  target: string,
  slideIndex: number,
  declaring: readonly number[],
  earlier: readonly number[],
  surfaces: readonly RecallSurface[],
): string {
  const quoted = JSON.stringify(target);

  if (earlier.length > 1) {
    return (
      `recalls ${quoted}, which ${slides(earlier)} all activate; a recall must name exactly ` +
      "one earlier moment, so give them distinct ids"
    );
  }
  if (declaring.includes(slideIndex)) {
    return (
      `recalls ${quoted}, which this slide activates; a recall reaches back to an earlier ` +
      "slide, and quoting the slide you are on would not change the picture"
    );
  }
  const later = declaring.filter((index) => index > slideIndex);
  if (later.length > 0) {
    return (
      `recalls ${quoted}, which ${slides(later)} activate${later.length === 1 ? "s" : ""}; ` +
      "a recall only reaches backwards, and nothing has been said there yet"
    );
  }

  const filling = surfaces
    .map((surface, index) => ({ index, has: surface.fills.includes(target) }))
    .filter((entry) => entry.has)
    .map((entry) => entry.index);
  if (filling.length > 0) {
    return (
      `recalls ${quoted}, which ${slides(filling)} fill${filling.length === 1 ? "s" : ""} ` +
      "across a sentence rather than activating at a moment; a recall replays one utterance, " +
      "and a population that accumulates is not one"
    );
  }

  const recallable = [
    ...new Set(surfaces.slice(0, slideIndex).flatMap((surface) => surface.activates)),
  ];
  return (
    `recalls ${quoted}, which no earlier slide activates` +
    (recallable.length === 0
      ? "; no slide before this one anchors anything"
      : ` (recallable: ${recallable.join(", ")})`)
  );
}

/** `slide 2`, or `slides 1 and 4`, or `slides 1, 3 and 4` — from zero-based indices. */
function slides(indices: readonly number[]): string {
  const ordinals = indices.map((index) => String(index + 1));
  if (ordinals.length === 1) return `slide ${ordinals[0]}`;
  const last = ordinals.at(-1);
  return `slides ${ordinals.slice(0, -1).join(", ")} and ${last}`;
}

/**
 * Fill in what resolution worked out, by cue index.
 *
 * A separate pass rather than an argument to the parser's `toCues`, because the cues of one slide
 * can be built without knowing anything about the deck and the resolution cannot. Index alignment
 * holds because `toCues` emits exactly one cue per authored entry, and this runs before
 * `bindNarration` splices a callee's narration into the list.
 */
export function bindRecalls(
  cues: readonly NarrationCue[],
  slideIndex: number,
  sources: ReadonlyMap<string, number>,
): readonly NarrationCue[] {
  return cues.map((cue, cueIndex) => {
    if (cue.kind !== "recall") return cue;
    const ordinal = sources.get(recallKey(slideIndex, cueIndex));
    return ordinal === undefined ? cue : { ...cue, sourceOrdinal: ordinal };
  });
}
