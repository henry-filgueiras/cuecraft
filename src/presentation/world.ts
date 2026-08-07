import type { SlideBody } from "./body.ts";
import type { NarrationCue } from "./cue.ts";
import { ANCHOR_ID, ANCHOR_ID_HINT } from "./identity.ts";
import { ROOT_SCOPE, type Scope } from "./scope.ts";

/**
 * A semantic world: things that exist, and how they relate.
 *
 * The fifth body, and the first that is not a *sequence*. Bullets, steps, code and a change all
 * have an order, and an order is most of what their compositions are about. A world has none —
 * it has adjacency, and where anything sits is derived from that adjacency by a layout engine
 * (`../render/world.ts`), never written down.
 *
 * The vocabulary is two words, and stopping at two was the whole design problem. A graph format
 * wants ports, weights, labelled edges, groups, ranks, clusters and directions, and every one of
 * those is a coordinate wearing a semantic costume. What survived is what one real explanatory
 * world could not be described without:
 *
 *     entities     an identity, and what to call it
 *     relations    this one feeds that one

 * and one word added after a world had been watched:
 *
 *     detail       what is inside that one, if going inside it is worth the trip
 *
 * Entities are a **mapping** rather than a list because in a world an identity is not optional.
 * A bullet may carry an `id` if narration happens to reach it; an entity *is* the id — the
 * relations name it, the narration reaches it, and the renderer keys its position off it. Making
 * it the key says that structurally rather than in a comment, and it costs one line per entity.
 *
 * Relations are arrow literals for the same reason durations are `700ms` and not
 * `{ value: 700, unit: ms }`: the thing being written is small, it is written many times, and it
 * already has a notation everybody reads correctly. `from:`/`to:` would triple the line count of
 * the only part of the format where line count is the point.
 *
 * Nothing here is geometric, and there is no key that could become geometric later. There is no
 * direction, no rank, no group, no size, no colour and no order that matters.
 */

/**
 * One thing in the world: an identity, the name it shows, and possibly an inside.
 *
 * `detail` is an ordinary slide body — points, stages, or source — and that is the whole of the
 * design. An entity that is worth entering has something to say that a two-word label cannot,
 * and cuecraft already has seven compositions for saying things. Inventing an eighth vocabulary
 * to live inside the fifth body would have been building a presentation format inside a
 * presentation format.
 *
 * An inline `detail` cannot contain a world, and that has not changed. `child` is the exception,
 * and it is an exception rather than a relaxation: what it names is a *file*, and a file is what
 * turns nesting into a module — it has a canonical identity, so an inclusion chain can be checked
 * for cycles; it has a boundary, so its identities cannot collide with anything above it; and it
 * has room for a `say`, so the descent into it is a call rather than a camera move. Written
 * inline, none of those three would be true, which is why the two spellings mean different
 * things and only one of them may be a world.
 *
 *     detail:  <slide content>          narrated by the slide that contains it
 *     child:   ./payment.yaml           narrates itself, and may be a world
 */
export interface AuthoredEntity {
  readonly id: string;
  readonly text: string;
  /**
   * What is inside. Absent on most entities, and absent is the interesting default.
   *
   * Set by either spelling, so that everything downstream — `bodyElements`, `interiorRange`,
   * `chooseLayout`, the composition switch — sees one kind of interior and no branch.
   */
  readonly detail?: SlideBody;
  /** Set only when the interior arrived in its own file, and carrying what came with it. */
  readonly module?: EntityModule;
}

/** The provenance and the narration of a file-backed interior. */
export interface EntityModule {
  /** Repository-relative and canonical: the identity an inclusion chain is compared on. */
  readonly path: string;
  /** The scope its narration runs in. */
  readonly scope: Scope;
  /**
   * Its narration, already flattened: the module's own cues, plus the whole of any descent it
   * makes, in order. What it does *not* carry is the `enter` and `exit` around itself — those
   * belong to the narration that called it.
   */
  readonly say: readonly NarrationCue[];
}

/** One directed relation. `from` feeds `to`; both name declared entities. */
export interface AuthoredRelation {
  readonly from: string;
  readonly to: string;
}

export interface AuthoredWorld {
  readonly entities: readonly AuthoredEntity[];
  readonly relations: readonly AuthoredRelation[];
}

export const WORLD_KEYS = ["entities", "relations"] as const;
export const ENTITY_KEYS = ["label", "detail", "child"] as const;

export const ENTITIES_HINT =
  "a mapping of identity to label, like `source: What you write`";
export const ENTITY_HINT =
  'a label, { label: "...", detail: <slide content> }, or ' +
  '{ label: "...", child: ./module.yaml } for one that narrates itself';
export const RELATION_HINT = '"from -> to", naming two declared entities';

/** A world needs enough of itself to be a world. One entity with no relations is a bullet. */
export const MIN_ENTITIES = 2;

/** Splits an arrow literal. Whitespace around the arrow is optional; the arrow is not. */
const RELATION_LITERAL = /^\s*([^\s>-][^>]*?)\s*->\s*([^\s>-][^>]*?)\s*$/;

export interface WorldIssue {
  /** Path relative to the `world` key, so the parser can prefix it. */
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export interface ResolvedWorld {
  readonly world: AuthoredWorld | undefined;
  readonly issues: readonly WorldIssue[];
}

/**
 * How an entity's `detail` becomes a slide body.
 *
 * Supplied by the parser rather than done here, because resolving a body may mean *reading the
 * repository* — an interior may quote real source — and this module has no business knowing that
 * the filesystem exists. It also keeps the dependency pointing the right way: the parser knows
 * about worlds, and a world knows only that something can turn a value into a body.
 */
export interface DetailResolver {
  (value: unknown): {
    readonly body: SlideBody | undefined;
    readonly issues: readonly WorldIssue[];
  };
}

/**
 * How `child: ./thing.yaml` becomes an interior and a narration.
 *
 * Supplied rather than done here for the same reason, and one more: resolving a module means
 * *parsing a presentation body*, which is the parser's whole job and would be a circular
 * dependency written the other way round.
 */
export interface ChildResolver {
  (
    spec: unknown,
    within: Scope,
    id: string,
  ): {
    readonly body: SlideBody | undefined;
    readonly module: EntityModule | undefined;
    readonly issues: readonly WorldIssue[];
  };
}

export interface WorldOptions {
  readonly child?: ChildResolver;
  /** Which scope this world's own identities live in. */
  readonly scope?: Scope;
}

/**
 * Validate an authored world, and normalize it.
 *
 * Hand-checked rather than expressed as a `z.union`, for the reason every other body in this
 * format is hand-checked: a union reports its branch failures nested inside one `invalid_union`
 * issue, and an author who mistyped an entity name would be told "Invalid input".
 *
 * The checks that matter are the two that make a world *coherent* rather than merely
 * well-formed:
 *
 * - every relation names entities that exist, because a relation to nothing is the graph
 *   equivalent of an anchor to nothing, and decision:14 already decided that is an error;
 * - the world is connected, because a floating entity is not part of the world being explained
 *   and a camera asked to travel to it would fly across empty space to reach it.
 *
 * Cycles are *not* checked. A layered layout has a defined answer for them, and forbidding them
 * would be cuecraft having an opinion about what a world may mean rather than about how it looks.
 */
export function resolveWorld(
  value: unknown,
  resolveDetail: DetailResolver = noInteriors,
  options: WorldOptions = {},
): ResolvedWorld {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      world: undefined,
      issues: [{ path: [], message: "must have entities and relations" }],
    };
  }

  const record = value as Record<string, unknown>;
  const extra = Object.keys(record).filter(
    (key) => !(WORLD_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return {
      world: undefined,
      issues: [
        {
          path: [],
          message: `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${WORLD_KEYS.join(", ")})`,
        },
      ],
    };
  }

  const issues: WorldIssue[] = [];
  const entities = readEntities(
    record["entities"],
    resolveDetail,
    options.child ?? noModules,
    options.scope ?? ROOT_SCOPE,
    issues,
  );
  const relations = readRelations(record["relations"], entities, issues);
  if (issues.length > 0) return { world: undefined, issues };

  checkConnected(entities, relations, issues);
  if (issues.length > 0) return { world: undefined, issues };

  return { world: { entities, relations }, issues: [] };
}

/** A world with no interiors resolves without a parser, which is what the tests want. */
const noInteriors: DetailResolver = () => ({
  body: undefined,
  issues: [{ path: [], message: "an interior needs the parser to resolve it" }],
});

const noModules: ChildResolver = () => ({
  body: undefined,
  module: undefined,
  issues: [{ path: [], message: "a child module needs the parser to resolve it" }],
});

function readEntities(
  value: unknown,
  resolveDetail: DetailResolver,
  resolveChild: ChildResolver,
  scope: Scope,
  issues: WorldIssue[],
): AuthoredEntity[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return raise(issues, ["entities"], `must be ${ENTITIES_HINT}`);
  }

  const entities: AuthoredEntity[] = [];
  for (const [id, written] of Object.entries(value as Record<string, unknown>)) {
    if (!ANCHOR_ID.test(id)) {
      issues.push({
        path: ["entities", id],
        message: `identity must be ${ANCHOR_ID_HINT}`,
      });
      continue;
    }

    // Two forms, exactly as an item is `text` or `{ id, text }`: the short one for the entities
    // that are only ever a name, the long one for the rare entity worth going inside.
    if (typeof written === "string") {
      if (written.trim().length === 0) {
        issues.push({ path: ["entities", id], message: "label must not be empty" });
        continue;
      }
      entities.push({ id, text: written.trim() });
      continue;
    }

    const entity = readInterior(id, written, resolveDetail, resolveChild, scope, issues);
    if (entity !== undefined) entities.push(entity);
  }

  if (issues.length === 0 && entities.length < MIN_ENTITIES) {
    issues.push({
      path: ["entities"],
      message: `a world needs at least ${MIN_ENTITIES} entities, got ${entities.length}`,
    });
  }
  return entities;
}

function readInterior(
  id: string,
  written: unknown,
  resolveDetail: DetailResolver,
  resolveChild: ChildResolver,
  scope: Scope,
  issues: WorldIssue[],
): AuthoredEntity | undefined {
  if (typeof written !== "object" || written === null || Array.isArray(written)) {
    issues.push({ path: ["entities", id], message: `must be ${ENTITY_HINT}` });
    return undefined;
  }

  const record = written as Record<string, unknown>;
  const extra = Object.keys(record).filter(
    (key) => !(ENTITY_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    issues.push({
      path: ["entities", id],
      message: `unknown key ${JSON.stringify(extra.join(", "))} (allowed: ${ENTITY_KEYS.join(", ")})`,
    });
    return undefined;
  }

  const label = record["label"];
  if (typeof label !== "string" || label.trim().length === 0) {
    issues.push({ path: ["entities", id], message: "label must not be empty" });
    return undefined;
  }
  const inline = record["detail"] !== undefined;
  const filed = record["child"] !== undefined;
  if (inline && filed) {
    issues.push({
      path: ["entities", id],
      message:
        'has both "detail" and "child"; an entity has one inside, either written here or in ' +
        "its own file — and only the second one narrates itself",
    });
    return undefined;
  }
  if (!inline && !filed) {
    // The long form with nothing in it is the short form with extra typing, and saying so is
    // kinder than silently accepting two spellings of the same entity.
    issues.push({
      path: ["entities", id],
      message: "has no detail or child; an entity that is only a label is written as one",
    });
    return undefined;
  }

  if (filed) {
    const resolved = resolveChild(record["child"], scope, id);
    for (const issue of resolved.issues) {
      issues.push({
        path: ["entities", id, "child", ...issue.path],
        message: issue.message,
      });
    }
    if (resolved.body === undefined || resolved.module === undefined) return undefined;
    return { id, text: label.trim(), detail: resolved.body, module: resolved.module };
  }

  const resolved = resolveDetail(record["detail"]);
  for (const issue of resolved.issues) {
    issues.push({
      path: ["entities", id, "detail", ...issue.path],
      message: issue.message,
    });
  }
  if (resolved.body === undefined) return undefined;
  return { id, text: label.trim(), detail: resolved.body };
}

function readRelations(
  value: unknown,
  entities: readonly AuthoredEntity[],
  issues: WorldIssue[],
): AuthoredRelation[] {
  if (!Array.isArray(value)) {
    return raise(issues, ["relations"], `must be a list of ${RELATION_HINT}`);
  }

  const declared = new Set(entities.map((entity) => entity.id));
  const seen = new Set<string>();
  const relations: AuthoredRelation[] = [];

  value.forEach((raw: unknown, index: number) => {
    const at = ["relations", index];
    if (typeof raw !== "string") {
      issues.push({ path: at, message: `must be ${RELATION_HINT}` });
      return;
    }
    const match = RELATION_LITERAL.exec(raw);
    if (match === null) {
      issues.push({ path: at, message: `must be ${RELATION_HINT}` });
      return;
    }

    const [from, to] = [match[1] ?? "", match[2] ?? ""];
    const known = [...declared].join(", ");
    for (const end of [from, to]) {
      if (!declared.has(end)) {
        issues.push({
          path: at,
          message: `names ${JSON.stringify(end)}, which no entity declares (declared: ${known})`,
        });
      }
    }
    if (issues.some((issue) => issue.path === at)) return;

    if (from === to) {
      issues.push({ path: at, message: `relates ${JSON.stringify(from)} to itself` });
      return;
    }
    const key = `${from} ${to}`;
    if (seen.has(key)) {
      issues.push({
        path: at,
        message: `repeats the relation ${JSON.stringify(raw.trim())}`,
      });
      return;
    }
    seen.add(key);
    relations.push({ from, to });
  });

  if (issues.length === 0 && relations.length === 0) {
    issues.push({
      path: ["relations"],
      message: "a world needs at least one relation; entities alone are a list",
    });
  }
  return relations;
}

/**
 * One world, not several.
 *
 * Undirected reachability, because a relation connects both of its ends regardless of which way
 * the arrow points — an entity that only ever appears as a `to` is still part of the world.
 */
function checkConnected(
  entities: readonly AuthoredEntity[],
  relations: readonly AuthoredRelation[],
  issues: WorldIssue[],
): void {
  const neighbours = new Map<string, string[]>(entities.map((entity) => [entity.id, []]));
  for (const relation of relations) {
    neighbours.get(relation.from)?.push(relation.to);
    neighbours.get(relation.to)?.push(relation.from);
  }

  const first = entities[0];
  if (first === undefined) return;
  const reached = new Set<string>([first.id]);
  const queue = [first.id];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const next of neighbours.get(id) ?? []) {
      if (reached.has(next)) continue;
      reached.add(next);
      queue.push(next);
    }
  }

  const stranded = entities.filter((entity) => !reached.has(entity.id));
  if (stranded.length === 0) return;
  issues.push({
    path: ["relations"],
    message:
      `${stranded.map((entity) => JSON.stringify(entity.id)).join(", ")} ` +
      `${stranded.length === 1 ? "is" : "are"} not related to anything in the rest of the ` +
      "world; a world is one world",
  });
}

function raise(issues: WorldIssue[], path: string[], message: string): never[] {
  issues.push({ path, message });
  return [];
}
