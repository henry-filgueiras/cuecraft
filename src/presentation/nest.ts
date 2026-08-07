import { bodyAddresses, type SlideBody } from "./body.ts";
import { ENTER_MS, EXIT_MS, type NarrationCue } from "./cue.ts";
import { childScope, ROOT_SCOPE, scopeLeaf, type Scope } from "./scope.ts";
import type { AuthoredEntity } from "./world.ts";

/**
 * Binding one scope's narration: what it may reach, what it may enter, and what happens when it
 * calls something.
 *
 * Two jobs that have to be one walk, because they are two readings of the same list. Validation
 * asks whether each cue means something *here*; flattening splices the callee's narration in
 * where the call was made. Doing them separately would mean deciding twice what "here" is.
 *
 *     parent cue, parent cue
 *     enter payment                 ->  enter,  <the whole of payment's narration>,  exit
 *     parent cue
 *
 * The result is one serial stream. Everything downstream of the parser — synthesis, the frame
 * clock, anchoring — sees the ordered list of cues it has always seen and knows nothing about
 * modules, which is the test of whether this was a call stack or a second orchestration layer.
 *
 * **Return is emitted here, and it is emitted because the list ran out.** No cue says `exit`, no
 * author can write one, and nothing consults the shape of the child's graph to decide when to
 * come back. That is deliberate and it is the thing under test: a world may cycle, may have four
 * sinks, or may have no terminal state at all, so "the camera returns when the traversal reaches
 * the end" is a rule that only works on the worlds that happen to be trees. Lexical completion
 * works on all of them, and it is a rule the author already understands, because it is the rule
 * every function they have ever written obeys.
 */

export interface NestIssue {
  /** Path relative to the scope's `say`, so the caller can prefix it. */
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export interface BoundNarration {
  readonly cues: readonly NarrationCue[];
  readonly issues: readonly NestIssue[];
}

/**
 * Resolve and flatten one scope's cues against the body they are spoken over.
 *
 * `cues` are this scope's own, freshly parsed and not yet flattened. A module's narration has
 * already been bound by the time its entity is resolved, so a nested call arrives here as a
 * finished stream and is spliced without being re-examined — which is what keeps the recursion
 * one level deep at every level.
 */
export function bindNarration(
  body: SlideBody,
  cues: readonly NarrationCue[],
  scope: Scope,
): BoundNarration {
  const issues: NestIssue[] = [];
  const bound: NarrationCue[] = [];

  // What a cue in this scope may reach: everything addressed under it, including an inline
  // interior's elements (decision:25), and nothing inside a child module.
  const reachable = bodyAddresses(body, scope).filter(
    (entry) => entry.scope === scope && entry.address !== undefined,
  );
  const byName = new Map<string, Scope>();
  for (const entry of reachable) {
    const leaf = scopeLeaf(entry.address as Scope);
    // First wins, which is what `bodyElements` resolution has always done: an entity and an item
    // inside another entity may share a name, and the flat list has one answer for it.
    if (!byName.has(leaf)) byName.set(leaf, entry.address as Scope);
  }

  const reached = new Set<string>();
  const entered = new Set<string>();

  cues.forEach((cue, index) => {
    if (cue.kind === "enter") {
      const entity = entityIn(body, cue.target);
      if (entity?.module === undefined) {
        issues.push({
          path: [index],
          message:
            `enters ${JSON.stringify(cue.target)}, which ${describeMiss(body, cue.target)}` +
            openable(body),
        });
        return;
      }
      if (entered.has(cue.target)) {
        issues.push({
          path: [index],
          message: `enters ${JSON.stringify(cue.target)}, which an earlier cue already enters`,
        });
        return;
      }
      entered.add(cue.target);

      const into = entity.module.scope;
      bound.push({
        kind: "enter",
        scope,
        milliseconds: ENTER_MS,
        target: cue.target,
        into,
      });
      bound.push(...entity.module.say);
      bound.push({
        kind: "exit",
        scope,
        milliseconds: EXIT_MS,
        target: cue.target,
        into,
      });
      return;
    }

    if (cue.kind !== "speech") {
      bound.push(cue);
      return;
    }

    // The two relationships resolve identically — same scope, same names, same "already
    // reached" rule — and differ only in what they compile to. Resolving them through one path
    // is what keeps that true.
    const named = cue.activates ?? cue.fills;
    if (named === undefined) {
      bound.push(cue);
      return;
    }
    const relation = cue.activates === undefined ? "fills" : "activates";

    const address = byName.get(named);
    if (address === undefined) {
      const known = [...byName.keys()];
      issues.push({
        path: [index],
        message:
          `${relation} ${JSON.stringify(named)}, which nothing ${where(scope)} declares` +
          (known.length === 0
            ? `; ${scope === ROOT_SCOPE ? "this slide" : "this module"} declares no ids`
            : ` (declared: ${known.join(", ")})`),
      });
      return;
    }
    if (reached.has(named)) {
      issues.push({
        path: [index],
        message: `${relation} ${JSON.stringify(named)}, which an earlier cue already reaches`,
      });
      return;
    }

    // Only a population accumulates. Everything else in this format is one of something, and
    // "this bullet fills up over the next sentence" is a request the renderer could not honour
    // and the author would never see fail.
    if (relation === "fills" && !fillableAddresses(body, scope).includes(address)) {
      issues.push({
        path: [index],
        message:
          `fills ${JSON.stringify(named)}, which is not a group of a series; only a bounded ` +
          "population accumulates over a sentence, and everything else is reached at a moment " +
          "with activates",
      });
      return;
    }

    reached.add(named);
    bound.push(
      relation === "activates" ? { ...cue, address } : { ...cue, fillsAddress: address },
    );
  });

  return { cues: bound, issues };
}

/**
 * `root` is the slide the author is looking at; anything deeper is a module they opened.
 *
 * Two wordings rather than one because a deck that never descends should never be told about
 * scopes, and one that does should be told which one it is in.
 */
function where(scope: Scope): string {
  return scope === ROOT_SCOPE ? "on this slide" : `in ${JSON.stringify(scope)}`;
}

function describeMiss(body: SlideBody, target: string): string {
  const entity = entityIn(body, target);
  if (entity === undefined) return "no entity in this world declares";
  if (entity.module === undefined && entity.detail !== undefined) {
    return (
      "has an inline detail rather than a child module; an inline interior is narrated by the " +
      "narration around it, so there is nothing to enter"
    );
  }
  return "has nothing inside it";
}

function openable(body: SlideBody): string {
  if (body.kind !== "world") return "";
  const names = body.entities
    .filter((entity) => entity.module !== undefined)
    .map((entity) => entity.id);
  return names.length === 0
    ? "; no entity in this world carries a child"
    : ` (entered with: ${names.join(", ")})`;
}

/**
 * Whether this address names a group of a bounded population.
 *
 * Walks the same structure `bodyAddresses` walks, because the answer has to agree with it: an
 * address is fillable exactly when the element it names came from a `series`. Recursive for the
 * same reason everything else here is — the group may be inside an entity's interior, and an
 * interior is an ordinary body.
 */
function fillableAddresses(body: SlideBody, scope: Scope): readonly Scope[] {
  if (body.kind === "series") {
    return body.groups.flatMap((group) =>
      group.id === undefined ? [] : [childScope(scope, group.id)],
    );
  }
  if (body.kind !== "world") return [];
  return body.entities.flatMap((entity) =>
    entity.detail === undefined
      ? []
      : fillableAddresses(entity.detail, childScope(scope, entity.id)),
  );
}

function entityIn(body: SlideBody, id: string): AuthoredEntity | undefined {
  return body.kind === "world"
    ? body.entities.find((entity) => entity.id === id)
    : undefined;
}

/**
 * Every file a body was compiled from, in inclusion order.
 *
 * A module is a *source* dependency and not an invisible input. A deck that descends is not
 * reproducible from its own file, so anything that ever caches, watches, or freezes a
 * compilation has to be told what was actually read — and the honest place to derive that is the
 * resolved body, which is the only thing that knows what the descent turned out to be.
 */
export function modulesOf(body: SlideBody): readonly string[] {
  if (body.kind !== "world") return [];
  const paths: string[] = [];
  for (const entity of body.entities) {
    if (entity.module === undefined || entity.detail === undefined) continue;
    paths.push(entity.module.path);
    paths.push(...modulesOf(entity.detail));
  }
  return paths;
}
