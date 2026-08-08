import { ANCHOR_ID, ANCHOR_ID_HINT } from "./identity.ts";

/**
 * Who is speaking: a name the deck declares, and the voice that currently realises it.
 *
 * Narration has always been one totally ordered stream of measured clips, and that is not what this
 * changes. A narrator changes **who synthesizes an utterance and nothing about how narration
 * participates in time** — two narrators never overlap, nothing is mixed, and a clip lands exactly
 * where its measured length puts it. The whole of the feature is that a synthesis call can now be
 * given a different voice than its neighbour.
 *
 *     narrators:
 *       ada:  { voice: af_heart }
 *       meta: { voice: am_adam, speed: 0.95 }
 *
 * **An identity, not a voice string.** A cue could have carried `voice: am_adam` directly and it
 * would have worked; it would also have put a vendor tensor name in the middle of the narration,
 * repeated at every utterance, so that changing the second voice meant a find-and-replace. This is
 * the split decision:38 made between who an actor *is* and where the picture puts it, and the one
 * decision:14 made between the identity an author names and the address a compiler resolves: the
 * source says `meta`, and what `meta` sounds like is declared once.
 *
 * **Voice and speed together, because that is the whole of Kokoro's control surface** (dragon:3).
 * A narrator that could set a voice but not a rate would be an identity with half a body. Nothing
 * else may be declared here — no emphasis, no style, no delivery instruction — for decision:6's
 * reason, unchanged: a control the provider cannot honour is worse than no control.
 *
 * **What a narrator is deliberately not.** It is not a character, it is not an actor of a protocol,
 * and nothing infers one from the other. `examples/tap.yaml` has five named parties and none of
 * them is a narrator; mapping a protocol's actors onto voices automatically is the inference this
 * was built to avoid making by accident.
 *
 * See decision:39 for the whole argument, idea:18 for the inline spelling that was deferred, and
 * dragon:20 for the one scope whose narrator is not textually local.
 */

/** A declared narrator, with everything about it resolved. */
export interface Narrator {
  readonly id: string;
  /** A provider voice name. Checked by the synthesis seam, not here — see `narratorProblems`. */
  readonly voice: string;
  /** Falls back to the deck's speed, which falls back to 1. */
  readonly speed: number;
}

export const NARRATOR_HINT =
  "a mapping of name to { voice: <a voice name>, speed: <optional rate> }";

const NARRATOR_KEYS = ["voice", "speed"];

/**
 * Whether `narrators:` declares a cast, and what is wrong with it if it does not.
 *
 * Paths are relative to the `narrators` mapping, so a caller can prefix them and an author is told
 * which narrator they got wrong rather than that the cast is invalid.
 *
 * A **voice name is not checked here**, deliberately. `defaults.voice` has never been checked by
 * the parser either: the set of voices is the provider's, the synthesis seam already rejects an
 * unknown one by name with the full list, and teaching the presentation layer Kokoro's voice table
 * would be the parser importing the provider to duplicate a check that already exists.
 */
export function narratorProblems(
  value: unknown,
): readonly { path: readonly (string | number)[]; message: string }[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [{ path: [], message: `must be ${NARRATOR_HINT}` }];
  }

  const record = value as Record<string, unknown>;
  const ids = Object.keys(record);
  if (ids.length === 0) {
    return [
      {
        path: [],
        message:
          "declares no narrators; a deck that does not name one speaks in the deck's own voice " +
          "and needs no cast",
      },
    ];
  }

  const problems: { path: readonly (string | number)[]; message: string }[] = [];
  for (const id of ids) {
    const problem = narratorProblem(id, record[id]);
    if (problem !== undefined) problems.push({ path: [id], message: problem });
  }
  return problems;
}

/** Whether one entry of the cast is a narrator. */
function narratorProblem(id: string, value: unknown): string | undefined {
  if (!ANCHOR_ID.test(id)) {
    return `a narrator's name must be ${ANCHOR_ID_HINT}`;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "must be { voice: <a voice name> }, optionally with a speed";
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter((key) => !NARRATOR_KEYS.includes(key));
  if (extra.length > 0) {
    return `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${NARRATOR_KEYS.join(", ")})`;
  }

  const voice = record["voice"];
  if (typeof voice !== "string" || voice.trim().length === 0) {
    return "voice is required; a narrator is a name for a voice, so there is nothing else it could be";
  }

  const speed = record["speed"];
  if (speed !== undefined && (typeof speed !== "number" || !Number.isFinite(speed))) {
    return "speed must be a speaking rate, such as 0.95";
  }
  return undefined;
}

/**
 * A validated cast, with each narrator's speed resolved against the deck's.
 *
 * Insertion order is the declaration order, which is what every message that lists the cast prints.
 */
export function narratorsOf(
  value: unknown,
  deckSpeed: number,
): ReadonlyMap<string, Narrator> {
  const narrators = new Map<string, Narrator>();
  if (value === undefined) return narrators;

  for (const [id, declared] of Object.entries(value as Record<string, unknown>)) {
    const record = declared as { voice: string; speed?: number };
    narrators.set(id, {
      id,
      voice: record.voice.trim(),
      speed: record.speed ?? deckSpeed,
    });
  }
  return narrators;
}

/**
 * Why this reference does not name anybody, or `undefined` when it does.
 *
 * One function for all four places a narrator can be selected — the deck, a slide, a cue, and a cue
 * inside a module — because an author who typo'd a name should read the same sentence wherever they
 * typo'd it, and because a second copy of "which names are known" is a second thing to keep in step.
 */
export function unknownNarrator(
  id: string,
  declared: ReadonlySet<string> | ReadonlyMap<string, unknown>,
): string | undefined {
  const names = [...declared.keys()];
  if (names.includes(id)) return undefined;
  return (
    `names narrator ${JSON.stringify(id)}, which the deck does not declare` +
    (names.length === 0
      ? "; a deck names its narrators in a top-level narrators: mapping"
      : ` (declared: ${names.join(", ")})`)
  );
}
