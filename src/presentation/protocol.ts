import { collapseWhitespace, wordPattern } from "./cue.ts";
import { ANCHOR_ID, ANCHOR_ID_HINT } from "./identity.ts";

/**
 * A protocol: who the parties are, and what they say to each other, in order.
 *
 * The twelfth role, and the first whose content is a **sequence of events** rather than a thing.
 * Every other body describes something that is true all at once — a world exists, a formula holds,
 * a population has a size — and narration then tours it. A protocol is not true all at once. Its
 * whole content is that this happened, and then this, and then this.
 *
 *     protocol:
 *       actors:
 *         client: Client
 *         gateway: API gateway
 *         auth: Auth service
 *       steps:
 *         - from: client
 *           to: gateway
 *           message: POST /orders
 *           say: The client begins by sending its request to the gateway.
 *         - from: gateway
 *           to: auth
 *           message: validate token
 *
 * **A step carries its own narration, and that is the point of the round.** Everywhere else in
 * cuecraft an element declares an identity and a separate `say:` reaches it by name (decision:14),
 * because the thing being related is a *moment* in a tour and an *element* in a structure, and
 * those are genuinely two lists. Here they are not. The order of the steps is the order of the
 * narration; a step and the sentence about it are one thing said twice, and asking an author to
 * type an id on both halves would be asking them to rebuild by hand a coupling the notation
 * already has. So `say:` sits on the step, and no id is written anywhere.
 *
 * `say:` is *optional*, which is what makes the round an experiment rather than an archetype. A
 * step with nothing said over it still has to happen visibly, and how long it gets is derived —
 * see `./beat.ts`, which owns that policy and is the only place a duration comes from something
 * other than a measured sound file.
 *
 * **Actors are a mapping, exactly as a world's entities are**, and for the same reason: an actor
 * *is* its identity. The steps name it, a prologue may reach it, and the renderer keys a lane off
 * it. The label is then free to be anything — "Auth service (OIDC)" — without every step having to
 * repeat it.
 *
 * What is deliberately absent is everything that would make this a diagram editor. There is no
 * lane order but the written one, no colour, no icon, no note, no divider, no guard, no
 * alternative, no loop, no duration, and no way to say two things happen at once. A protocol
 * states a finite ordered exchange; it does not *branch*.
 */

/** One party to the exchange: an identity, and the name it shows on its lane. */
export interface AuthoredActor {
  readonly id: string;
  readonly text: string;
}

/**
 * One message, from one actor to another.
 *
 * `message` is required and `say` is not, which is the opposite of what it looks like it should be
 * and is the right way round. The message is what the *diagram* shows; an arrow with no label is a
 * line. The narration is what the *film* adds, and a protocol is allowed to have stretches nobody
 * needs to talk over — that is exactly the case this role exists to handle well.
 */
export interface AuthoredStep {
  readonly from: string;
  readonly to: string;
  readonly message: string;
  readonly say?: string;
  /** Per-occurrence spellings for this step's narration only — decision:12, unchanged. */
  readonly pronounce?: ReadonlyMap<string, string>;
}

export interface AuthoredProtocol {
  readonly actors: readonly AuthoredActor[];
  readonly steps: readonly AuthoredStep[];
}

export const PROTOCOL_KEYS = ["actors", "steps"] as const;
export const STEP_KEYS = ["from", "to", "message", "say", "pronounce"] as const;

export const ACTORS_HINT =
  "a mapping of identity to name, like `gateway: API gateway`, in the order the lanes should sit";
export const STEP_HINT =
  '{ from: <actor>, to: <actor>, message: "..." }, optionally with a say';

/**
 * A protocol needs enough of itself to be one.
 *
 * Two parties, because a message an actor sends to itself is a legitimate step and a *protocol*
 * with only that actor in it is a monologue. One step, because a protocol with no traffic is a
 * cast list.
 */
export const MIN_ACTORS = 2;

/**
 * The identity a step is given on its author's behalf.
 *
 * The `change` precedent, one role on (`CHANGE_ELEMENT_ID`): the compiler already knows which part
 * of itself the narration is about, so asking an author to name it would be asking them to repeat
 * back something derived. A step is addressed as `step-1`, `step-2`, ... in written order, and the
 * form is reserved so an actor cannot collide with one.
 */
export function stepId(index: number): string {
  return `step-${index + 1}`;
}

const RESERVED_ID = /^step-[0-9]+$/;

export interface ProtocolIssue {
  /** Path relative to the `protocol` key, so the parser can prefix it. */
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export interface ResolvedProtocol {
  readonly protocol: AuthoredProtocol | undefined;
  readonly issues: readonly ProtocolIssue[];
}

/**
 * Validate an authored protocol, and normalize it.
 *
 * Hand-checked rather than expressed as a `z.union`, for the reason every other body in this
 * format is hand-checked: a union reports its branch failures nested inside one `invalid_union`
 * issue, and an author who mistyped an actor name would be told "Invalid input".
 *
 * The two checks that make a protocol *coherent* rather than merely well-formed are that every
 * step names actors that exist — a message to nobody is the exchange equivalent of an anchor to
 * nothing, and decision:14 already decided that is an error — and that every declared actor is
 * actually spoken to or from. The second one matters more here than connectedness does in a world:
 * a lane nothing ever touches is a column of empty space in every single shot of the film.
 */
export function resolveProtocol(value: unknown): ResolvedProtocol {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      protocol: undefined,
      issues: [{ path: [], message: "must have actors and steps" }],
    };
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter(
    (key) => !(PROTOCOL_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return {
      protocol: undefined,
      issues: [
        {
          path: [],
          message: `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${PROTOCOL_KEYS.join(", ")})`,
        },
      ],
    };
  }

  const issues: ProtocolIssue[] = [];
  const actors = readActors(record["actors"], issues);
  const steps = readSteps(record["steps"], actors, issues);
  if (issues.length > 0) return { protocol: undefined, issues };

  checkEveryLaneUsed(actors, steps, issues);
  if (issues.length > 0) return { protocol: undefined, issues };

  return { protocol: { actors, steps }, issues: [] };
}

function readActors(value: unknown, issues: ProtocolIssue[]): readonly AuthoredActor[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(issues, ["actors"], `must be ${ACTORS_HINT}`);
  }

  const actors: AuthoredActor[] = [];
  for (const [id, label] of Object.entries(value)) {
    if (!ANCHOR_ID.test(id)) {
      issues.push({
        path: ["actors", id],
        message: `an actor's identity must be ${ANCHOR_ID_HINT}`,
      });
      continue;
    }
    if (RESERVED_ID.test(id)) {
      issues.push({
        path: ["actors", id],
        message:
          `${JSON.stringify(id)} is reserved: a step is addressed as step-1, step-2 and so on, ` +
          "so that a protocol needs no ids of its own",
      });
      continue;
    }
    if (typeof label !== "string" || label.trim().length === 0) {
      issues.push({
        path: ["actors", id],
        message: "must be the name this actor's lane shows",
      });
      continue;
    }
    actors.push({ id, text: collapseWhitespace(label) });
  }

  if (issues.length === 0 && actors.length < MIN_ACTORS) {
    issues.push({
      path: ["actors"],
      message: `has ${actors.length}; a protocol is an exchange, so it needs at least ${MIN_ACTORS} actors`,
    });
  }
  return actors;
}

function readSteps(
  value: unknown,
  actors: readonly AuthoredActor[],
  issues: ProtocolIssue[],
): readonly AuthoredStep[] {
  if (!Array.isArray(value)) {
    return fail(issues, ["steps"], `must be a list of ${STEP_HINT}`);
  }
  if (value.length === 0) {
    return fail(
      issues,
      ["steps"],
      "must have at least one step; a protocol with no traffic is a cast list",
    );
  }

  const declared = new Set(actors.map((actor) => actor.id));
  const steps: AuthoredStep[] = [];
  value.forEach((raw: unknown, index: number) => {
    const before = issues.length;
    const step = readStep(raw, declared, index, issues);
    if (issues.length === before && step !== undefined) steps.push(step);
  });
  return steps;
}

function readStep(
  value: unknown,
  declared: ReadonlySet<string>,
  index: number,
  issues: ProtocolIssue[],
): AuthoredStep | undefined {
  const at = (message: string): undefined => {
    issues.push({ path: ["steps", index], message });
    return undefined;
  };

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return at(`must be ${STEP_HINT}`);
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter(
    (key) => !(STEP_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return at(
      `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${STEP_KEYS.join(", ")})`,
    );
  }

  for (const end of ["from", "to"] as const) {
    const named = record[end];
    if (typeof named !== "string" || named.trim().length === 0) {
      return at(`${end} must name an actor`);
    }
    if (!declared.has(named)) {
      const known = [...declared];
      return at(
        `${end} is ${JSON.stringify(named)}, which no actor declares` +
          (known.length === 0 ? "" : ` (declared: ${known.join(", ")})`),
      );
    }
  }

  const message = record["message"];
  if (typeof message !== "string" || message.trim().length === 0) {
    return at(
      "message must say what is being sent; an arrow with no label is a line, and a step " +
        "with nothing on it is not something a viewer can learn from",
    );
  }

  const say = record["say"];
  if (say !== undefined && (typeof say !== "string" || say.trim().length === 0)) {
    return at("say must be what to narrate over this step, or absent");
  }

  const pronounce = record["pronounce"];
  if (pronounce !== undefined) {
    if (say === undefined) {
      return at("has pronounce and nothing to say; a spelling repairs narration");
    }
    const problem = pronounceProblem(pronounce, say as string);
    if (problem !== undefined) return at(problem);
  }

  return {
    from: record["from"] as string,
    to: record["to"] as string,
    message: collapseWhitespace(message),
    ...(say === undefined ? {} : { say: collapseWhitespace(say as string) }),
    ...(pronounce === undefined
      ? {}
      : { pronounce: new Map(Object.entries(pronounce as Record<string, string>)) }),
  };
}

/**
 * The same check `parse.ts` makes on a speech cue's `pronounce`, and the same reasoning: a spelling
 * for a word that is not in this sentence is a typo silently doing nothing, which is the outcome a
 * compiler exists to prevent.
 */
function pronounceProblem(value: unknown, speech: string): string | undefined {
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
      return `pronounce.${word} does not appear in this step's say`;
    }
  }
  return undefined;
}

/**
 * Every lane has to carry something.
 *
 * A world refuses a disconnected entity because the camera would have to fly across empty space to
 * reach it. A protocol refuses an untouched actor for a stronger reason: a lane is a *column*, and
 * an unused one is empty vertical space in every shot of the film, at the exact horizontal position
 * that matters most — between two lanes that do talk.
 */
function checkEveryLaneUsed(
  actors: readonly AuthoredActor[],
  steps: readonly AuthoredStep[],
  issues: ProtocolIssue[],
): void {
  const touched = new Set(steps.flatMap((step) => [step.from, step.to]));
  const idle = actors.filter((actor) => !touched.has(actor.id));
  if (idle.length === 0) return;
  issues.push({
    path: ["actors"],
    message:
      `${idle.map((actor) => JSON.stringify(actor.id)).join(", ")} ` +
      `${idle.length === 1 ? "is an actor that never sends or receives" : "are actors that never send or receive"}; ` +
      "an untouched lane is empty space in every frame",
  });
}

function fail<T>(
  issues: ProtocolIssue[],
  path: readonly (string | number)[],
  message: string,
): readonly T[] {
  issues.push({ path, message });
  return [];
}
