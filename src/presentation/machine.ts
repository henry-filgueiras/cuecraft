import { collapseWhitespace, wordPattern } from "./cue.ts";
import { ANCHOR_ID, ANCHOR_ID_HINT } from "./identity.ts";

/**
 * A state machine: what could happen, and one run of what did.
 *
 * The thirteenth role, and the first whose content is **both** a structure and a sequence. Every
 * other body is one or the other, and the two have always wanted different things. A world exists
 * all at once and narration tours it (decision:22). A protocol is nothing but order, and carries
 * its own narration because a step and the sentence about it are one thing said twice
 * (decision:34). A machine is a world *and* a protocol over the same slide, and keeping those two
 * halves apart is the whole of the design:
 *
 *     states + transitions    the possible topology     true before anything is said
 *     scenario                one ordered run of it     an occurrence at a time, in order
 *
 *     machine:
 *       states:
 *         closed: Closed
 *         opening: Opening
 *         open: Open
 *
 *       transitions:
 *         call-accepted: { from: closed, to: opening, on: call accepted }
 *         opened:        { from: opening, to: open,   on: open limit reached }
 *
 *       scenario:
 *         - take: call-accepted
 *           say: A call releases the door from its closed state.
 *         - take: opened
 *
 * ## Why the two halves are two halves
 *
 * The tempting spelling is the one this refuses: a list of transitions, each with a sentence, and
 * no topology at all. It is shorter, it renders, and it is a different artifact — an animated
 * event log. What makes this a state machine explainer is precisely the transitions the scenario
 * **does not take**: the branch the elevator did not go down is the reason the branch it did go
 * down means anything. So topology is declared in full, and a transition nobody exercises is
 * ordinary possibility rather than dead weight.
 *
 * The consequence runs the other way too. A transition is **timeless** — it has a source, a target
 * and the event that fires it, and it has no narration, because it does not happen at a time. An
 * *occurrence* happens at a time, and that is where `say:` lives. The same transition may occur
 * four times and be narrated differently, or not at all, on each of them, which is not something a
 * `say:` on the transition could ever express.
 *
 * ## What is refused, and why each refusal is load-bearing
 *
 * - **No initial, final, accepting or terminal state.** A scenario starts wherever its first
 *   occurrence starts and stops wherever its last one stops, and both are *inferred*. A machine
 *   that could declare a final state would let the film assert that where the explanation stopped
 *   is where the machine was going, which is a claim about the system rather than about the
 *   explanation, and it is very often false.
 * - **No guards or actions as separate concepts.** A transition has one visible label. If the
 *   guard matters, it is part of what the transition is called.
 * - **No composite states, no regions, no pseudostates, no second scenario.** One flat machine,
 *   one run, exactly one current state — which is what makes occupancy expressible at all.
 * - **Nothing geometric and nothing temporal.** No rank, no side, no route, no colour, no order
 *   that matters beyond the scenario's, and no dwell. Where anything sits is derived from the
 *   topology by `../render/machine.ts`; how long a silent occurrence lasts is derived from its
 *   label by `./beat.ts`. There is no key here that could become either.
 *
 * ## The one key that is none of those, and what it does not open
 *
 * `scope` says whether the slide is about the whole machine or about the run the scenario
 * describes, and it is the only key here that changes what reaches the frame (decision:54). It
 * qualifies the argument above rather than abandoning it: the topology is still declared in full
 * and still validated in full, `whole` is still the default and still means exactly what it meant,
 * and a reduced slide states its own counts on the frame so that a smaller picture is never a
 * smaller machine asserted as the whole one.
 *
 * What it does not open, and cannot: there is no partial reduction, no per-state emphasis, no
 * weighting, no threshold and no second criterion. A slide is about the machine or about the run.
 * The value is a name rather than a boolean precisely so that "mostly reduced" has nowhere to be
 * spelled.
 */

/** One state: an identity, and the name it shows. A state *is* its identity, as an entity is. */
export interface AuthoredState {
  readonly id: string;
  readonly text: string;
}

/**
 * One transition, which is a fact about the machine and not about the run.
 *
 * `on` is required, for the reason a protocol's `message` is: it is what the *diagram* shows, and
 * an arrow with no label is a line. In a machine it carries more than that — two transitions may
 * join the same pair of states, and the only thing that tells them apart on the frame is what
 * fires them.
 */
export interface AuthoredTransition {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  /** The event or condition that fires it. Shown on the edge; never derived, never optional. */
  readonly on: string;
}

/**
 * One occurrence: the run takes a named transition, and may say something about doing so.
 *
 * `say` is optional and that is what makes this an experiment rather than a diagram. A silent
 * occurrence still has to happen visibly, and how long it gets is derived — see `./beat.ts`, the
 * one derived clock in the format, which a machine reuses without changing a constant.
 */
export interface AuthoredOccurrence {
  readonly take: string;
  readonly say?: string;
  /** Per-occurrence spellings for this occurrence's narration only — decision:12, unchanged. */
  readonly pronounce?: ReadonlyMap<string, string>;
}

/**
 * What the slide is about: the whole machine, or the run the scenario describes.
 *
 * The one authored thing in this grammar that is neither a state, a transition nor an occurrence,
 * and the only key that changes which of the declared topology reaches the frame. It is a
 * projection rather than a second notation — the machine is still declared in full, still
 * validated in full, and `whole` still means what it has always meant (decision:54).
 */
export type MachineScope = "whole" | "narrated";

export const MACHINE_SCOPES = ["whole", "narrated"] as const;

export interface AuthoredMachine {
  readonly states: readonly AuthoredState[];
  readonly transitions: readonly AuthoredTransition[];
  readonly scenario: readonly AuthoredOccurrence[];
  /** `whole` unless the author said otherwise. See `MachineScope`. */
  readonly scope: MachineScope;
}

export const MACHINE_KEYS = ["states", "transitions", "scenario", "scope"] as const;
export const TRANSITION_KEYS = ["from", "to", "on"] as const;
export const OCCURRENCE_KEYS = ["take", "say", "pronounce"] as const;

export const STATES_HINT =
  "a mapping of identity to name, like `opening: Opening`, in any order";
export const TRANSITION_HINT = '{ from: <state>, to: <state>, on: "what fires it" }';
export const OCCURRENCE_HINT = "{ take: <transition> }, optionally with a say";

/**
 * A machine needs enough of itself to be one.
 *
 * Two states, because a machine with one state has nothing to be in *instead*. One transition,
 * because states alone are a vocabulary list. One occurrence, because a scenario with nothing in
 * it has no starting state to infer and nothing for the film to do.
 */
export const MIN_STATES = 2;
export const MIN_TRANSITIONS = 1;

/**
 * The identity an occurrence is given on its author's behalf.
 *
 * The `step-N` precedent (`./protocol.ts`), one role on, and for the same reason: the compiler
 * already knows which part of itself the narration is about, so asking an author to name it would
 * be asking them to repeat back something derived. Occurrences are `take-1`, `take-2`, ... in
 * scenario order, and the form is reserved so that neither a state nor a transition can take it.
 */
export function takeId(index: number): string {
  return `take-${index + 1}`;
}

const RESERVED_ID = /^take-[0-9]+$/;

export interface MachineIssue {
  /** Path relative to the `machine` key, so the parser can prefix it. */
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export interface ResolvedMachine {
  readonly machine: AuthoredMachine | undefined;
  readonly issues: readonly MachineIssue[];
}

/**
 * Where the run is, before and after every occurrence.
 *
 * Derived once here so that nothing downstream re-derives continuity and nothing downstream can
 * derive it differently. `before[0]` is the scenario's starting state, which is the first
 * occurrence's `from` and is inferred rather than declared; `after.at(-1)` is where it stopped,
 * which is the last occurrence's `to` and carries no claim of having finished.
 */
export interface ScenarioPath {
  readonly transitions: readonly AuthoredTransition[];
  readonly before: readonly string[];
  readonly after: readonly string[];
  readonly start: string;
  readonly stop: string;
}

export function scenarioPath(machine: {
  readonly transitions: readonly AuthoredTransition[];
  readonly scenario: readonly AuthoredOccurrence[];
}): ScenarioPath {
  const byId = new Map(machine.transitions.map((entry) => [entry.id, entry] as const));
  const transitions = machine.scenario.map(
    (occurrence) => byId.get(occurrence.take) as AuthoredTransition,
  );
  const before = transitions.map((transition) => transition.from);
  const after = transitions.map((transition) => transition.to);
  return {
    transitions,
    before,
    after,
    start: before[0] as string,
    stop: after[after.length - 1] as string,
  };
}

/**
 * Validate an authored machine, and normalize it.
 *
 * Hand-checked rather than expressed as a `z.union`, for the reason every other body in this
 * format is hand-checked: a union reports its branch failures nested inside one `invalid_union`
 * issue, and an author who mistyped a state name would be told "Invalid input".
 *
 * Three checks make a machine *coherent* rather than merely well-formed, and each of them exists
 * because the failure it catches would otherwise produce a film that renders and lies:
 *
 * - **Every transition names states that exist**, because an edge to nowhere is the graph
 *   equivalent of an anchor to nothing, and decision:14 already decided that is an error.
 * - **Every occurrence names a transition that exists.** A scenario is the one place an author
 *   types an identity twice, so it is the one place a typo can happen.
 * - **The scenario is continuous.** Every occurrence after the first begins where the last one
 *   ended. A run that teleports is not a run of this machine, and a film that drew one would be
 *   showing a traveller crossing an edge that is not there.
 *
 * Connectedness is deliberately **not** checked, and that is a difference from a world rather than
 * an oversight. A world refuses a stranded entity because the camera would have to fly across
 * empty space to reach it; a machine's camera only ever visits states the scenario occupies, so an
 * unreachable state is a legitimate thing to say about a system — and saying "this state exists
 * and nothing in this explanation gets you to it" is often the point.
 */
export function resolveMachine(value: unknown): ResolvedMachine {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      machine: undefined,
      issues: [{ path: [], message: "must have states, transitions and a scenario" }],
    };
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter(
    (key) => !(MACHINE_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return {
      machine: undefined,
      issues: [
        {
          path: [],
          message: `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${MACHINE_KEYS.join(", ")})`,
        },
      ],
    };
  }

  const issues: MachineIssue[] = [];
  const states = readStates(record["states"], issues);
  const transitions = readTransitions(record["transitions"], states, issues);
  if (issues.length > 0) return { machine: undefined, issues };

  const scenario = readScenario(record["scenario"], transitions, issues);
  if (issues.length > 0) return { machine: undefined, issues };

  const scope = readScope(record["scope"], issues);
  if (issues.length > 0) return { machine: undefined, issues };

  return { machine: { states, transitions, scenario, scope }, issues: [] };
}

/**
 * Which of the declared machine this slide is about.
 *
 * Absent means `whole`, and `whole` is what every deck written before decision:54 gets, byte for
 * byte. Spelled as two named values rather than as a boolean because the key states what the
 * picture *is* rather than switching a behaviour on — and because the values are where the three
 * criteria that were measured and refused (reachability, circuits, circuits plus terminals) are
 * documented as not being options.
 */
function readScope(value: unknown, issues: MachineIssue[]): MachineScope {
  if (value === undefined) return "whole";
  if (
    typeof value !== "string" ||
    !(MACHINE_SCOPES as readonly string[]).includes(value)
  ) {
    issues.push({
      path: ["scope"],
      message: `must be ${MACHINE_SCOPES.join(" or ")}`,
    });
    return "whole";
  }
  return value as MachineScope;
}

function readStates(value: unknown, issues: MachineIssue[]): readonly AuthoredState[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(issues, ["states"], `must be ${STATES_HINT}`);
  }

  const states: AuthoredState[] = [];
  for (const [id, label] of Object.entries(value)) {
    const problem = identityProblem(id, "a state");
    if (problem !== undefined) {
      issues.push({ path: ["states", id], message: problem });
      continue;
    }
    if (typeof label !== "string" || label.trim().length === 0) {
      issues.push({
        path: ["states", id],
        message: "must be the name this state shows on the map",
      });
      continue;
    }
    states.push({ id, text: collapseWhitespace(label) });
  }

  if (issues.length === 0 && states.length < MIN_STATES) {
    issues.push({
      path: ["states"],
      message:
        `has ${states.length}; a machine needs at least ${MIN_STATES} states, ` +
        "because a machine with one state has nothing to be in instead",
    });
  }
  return states;
}

function readTransitions(
  value: unknown,
  states: readonly AuthoredState[],
  issues: MachineIssue[],
): readonly AuthoredTransition[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(
      issues,
      ["transitions"],
      `must be a mapping of identity to ${TRANSITION_HINT}`,
    );
  }

  const declared = new Set(states.map((state) => state.id));
  const transitions: AuthoredTransition[] = [];
  for (const [id, written] of Object.entries(value as Record<string, unknown>)) {
    const at = ["transitions", id];
    const problem = identityProblem(id, "a transition");
    if (problem !== undefined) {
      issues.push({ path: at, message: problem });
      continue;
    }
    // One namespace for both, because both are written into the same places by hand and a machine
    // where `open` means a state in one line and a transition in the next is a machine nobody can
    // read back. Cheap to state, and it makes every later diagnostic unambiguous.
    if (declared.has(id)) {
      issues.push({
        path: at,
        message: `${JSON.stringify(id)} is already a state; states and transitions share one set of names`,
      });
      continue;
    }

    const transition = readTransition(id, written, declared, at, issues);
    if (transition !== undefined) transitions.push(transition);
  }

  if (issues.length === 0 && transitions.length < MIN_TRANSITIONS) {
    issues.push({
      path: ["transitions"],
      message:
        `has ${transitions.length}; a machine needs at least ${MIN_TRANSITIONS} transition, ` +
        "because states with nothing between them are a vocabulary list",
    });
  }
  return transitions;
}

function readTransition(
  id: string,
  written: unknown,
  declared: ReadonlySet<string>,
  at: readonly (string | number)[],
  issues: MachineIssue[],
): AuthoredTransition | undefined {
  const raise = (message: string): undefined => {
    issues.push({ path: at, message });
    return undefined;
  };

  if (typeof written !== "object" || written === null || Array.isArray(written)) {
    return raise(`must be ${TRANSITION_HINT}`);
  }

  const record = written as Record<string, unknown>;
  const extra = Object.keys(record).filter(
    (key) => !(TRANSITION_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return raise(
      `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${TRANSITION_KEYS.join(", ")})`,
    );
  }

  for (const end of ["from", "to"] as const) {
    const named = record[end];
    if (typeof named !== "string" || named.trim().length === 0) {
      return raise(`${end} must name a state`);
    }
    if (!declared.has(named)) {
      return raise(
        `${end} is ${JSON.stringify(named)}, which no state declares ` +
          `(declared: ${[...declared].join(", ")})`,
      );
    }
  }

  const on = record["on"];
  if (typeof on !== "string" || on.trim().length === 0) {
    return raise(
      "on must say what fires this transition; an unlabelled edge is a line, and two " +
        "transitions between the same pair of states have nothing else to tell them apart",
    );
  }

  return {
    id,
    from: record["from"] as string,
    to: record["to"] as string,
    on: collapseWhitespace(on),
  };
}

/**
 * One ordered run, checked for continuity as it is read.
 *
 * The current state is carried down the list rather than checked afterwards, so the diagnostic can
 * say where the run actually was when the offending occurrence tried to happen — which is the fact
 * an author needs and the one a set-based check throws away.
 */
function readScenario(
  value: unknown,
  transitions: readonly AuthoredTransition[],
  issues: MachineIssue[],
): readonly AuthoredOccurrence[] {
  if (!Array.isArray(value)) {
    return fail(issues, ["scenario"], `must be a list of ${OCCURRENCE_HINT}`);
  }
  if (value.length === 0) {
    return fail(
      issues,
      ["scenario"],
      "must have at least one occurrence; a machine with no run is a diagram, and this " +
        "body exists to explain one run of a machine",
    );
  }

  const byId = new Map(transitions.map((transition) => [transition.id, transition]));
  const occurrences: AuthoredOccurrence[] = [];
  let current: string | undefined;
  /**
   * Whether the run's position is still known.
   *
   * Once one occurrence has failed, nobody knows where the machine would have been, and every
   * later continuity complaint is invented by the first mistake rather than made by the author. A
   * single mistyped transition name would otherwise report itself once and then report a
   * discontinuity for every occurrence after it, which buries the one line worth reading.
   */
  let derailed = false;

  value.forEach((raw: unknown, index: number) => {
    const at = ["scenario", index];
    const raise = (message: string): void => {
      issues.push({ path: at, message });
      derailed = true;
    };

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      raise(`must be ${OCCURRENCE_HINT}`);
      return;
    }

    const record = raw as Record<string, unknown>;
    const extra = Object.keys(record).filter(
      (key) => !(OCCURRENCE_KEYS as readonly string[]).includes(key),
    );
    if (extra.length > 0) {
      raise(
        `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${OCCURRENCE_KEYS.join(", ")})`,
      );
      return;
    }

    const take = record["take"];
    if (typeof take !== "string" || take.trim().length === 0) {
      raise("take must name a transition");
      return;
    }
    const transition = byId.get(take);
    if (transition === undefined) {
      raise(
        `take is ${JSON.stringify(take)}, which no transition declares ` +
          `(declared: ${[...byId.keys()].join(", ")})`,
      );
      return;
    }

    // Continuity. The run is somewhere, and a transition it may take is one that leaves there.
    if (!derailed && current !== undefined && transition.from !== current) {
      const available = transitions
        .filter((candidate) => candidate.from === current)
        .map((candidate) => candidate.id);
      raise(
        `takes ${JSON.stringify(take)}, which leaves ${JSON.stringify(transition.from)}, ` +
          `but the run is in ${JSON.stringify(current)}` +
          (available.length === 0
            ? " and nothing leaves there"
            : ` (leaving there: ${available.join(", ")})`),
      );
      return;
    }

    const say = record["say"];
    if (say !== undefined && (typeof say !== "string" || say.trim().length === 0)) {
      raise("say must be what to narrate over this occurrence, or absent");
      return;
    }

    const pronounce = record["pronounce"];
    if (pronounce !== undefined) {
      if (say === undefined) {
        raise("has pronounce and nothing to say; a spelling repairs narration");
        return;
      }
      const problem = pronounceProblem(pronounce, say as string);
      if (problem !== undefined) {
        raise(problem);
        return;
      }
    }

    current = transition.to;
    occurrences.push({
      take,
      ...(say === undefined ? {} : { say: collapseWhitespace(say as string) }),
      ...(pronounce === undefined
        ? {}
        : { pronounce: new Map(Object.entries(pronounce as Record<string, string>)) }),
    });
  });

  return occurrences;
}

function identityProblem(id: string, what: string): string | undefined {
  if (!ANCHOR_ID.test(id)) return `${what}'s identity must be ${ANCHOR_ID_HINT}`;
  if (RESERVED_ID.test(id)) {
    return (
      `${JSON.stringify(id)} is reserved: an occurrence is addressed as take-1, take-2 and so ` +
      "on, so that a scenario needs no ids of its own"
    );
  }
  return undefined;
}

/**
 * The same check `parse.ts` makes on a speech cue's `pronounce`, and the same reasoning: a spelling
 * for a word that is not in this sentence is a typo silently doing nothing, which is the outcome a
 * compiler exists to prevent.
 */
function pronounceProblem(value: unknown, speech: string): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "pronounce must be a map of word to spelling, such as { queued: kyood }";
  }
  for (const [word, spelling] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z'-]*$/.test(word)) {
      return `pronounce key ${JSON.stringify(word)} must be a single word`;
    }
    if (typeof spelling !== "string" || spelling.trim().length === 0) {
      return `pronounce.${word} must be the spelling to synthesize instead`;
    }
    if (!wordPattern(word).test(speech)) {
      return `pronounce.${word} does not appear in this occurrence's say`;
    }
  }
  return undefined;
}

function fail<T>(
  issues: MachineIssue[],
  path: readonly (string | number)[],
  message: string,
): readonly T[] {
  issues.push({ path, message });
  return [];
}
