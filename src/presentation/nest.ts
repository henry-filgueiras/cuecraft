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
  const played = new Set<string>();
  // Whether the cursor is inside a film's *region*: the run of cues immediately after a `play:`
  // that the film is going to be cut around. See `during` below for the rule and why it is here.
  let region: "closed" | "open" | "holding" = "closed";

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

    // A recall reaches back across *slides*, and a module has no idea where it is mounted or what
    // came before it — that is the whole of what `./scope.ts` says an address is for. A module that
    // could quote the deck around it would be a module that only compiles in one deck.
    //
    // Refused here rather than in the schema because this is the one walk that knows which scope a
    // cue list belongs to, and it is where a module's narration is checked against its own body.
    if (cue.kind === "recall" && scope !== ROOT_SCOPE) {
      issues.push({
        path: [index],
        message:
          `recalls ${JSON.stringify(cue.target)}, and a recall belongs to a slide's own ` +
          "narration; a module is written without knowing what came before it",
      });
      return;
    }

    // What a `play:` names — an output of a program that has not run yet — cannot be checked here,
    // for decision:57's reason: an exhibit's identities do not exist until a subprocess has
    // finished, and materialization refuses a mismatch in both directions. What *can* be checked
    // here is the only thing that is a fact about the source: whether this slide has a program at
    // all. A `play:` over a list of bullets is a sentence about nothing, and finding that out after
    // a minute of Kokoro would be finding it out in the wrong order.
    if (cue.kind === "play") {
      if (body.kind !== "exhibit") {
        issues.push({
          path: [index],
          message:
            `plays ${JSON.stringify(cue.source)}, and this ${scope === ROOT_SCOPE ? "slide" : "module"} ` +
            "has no exhibit; a film is something a program computed, and only an exhibit runs one",
        });
        return;
      }
      if (played.has(cue.source)) {
        issues.push({
          path: [index],
          message:
            `plays ${JSON.stringify(cue.source)}, which an earlier cue already plays; a film runs ` +
            "once, and a second run would be a second clock over one medium",
        });
        return;
      }
      played.add(cue.source);
      region = "open";
      bound.push(cue);
      return;
    }

    // A pause belongs to whichever aside it follows, and only to one that has started. A pause
    // written straight after `play:` is the author asking for silence *after* the film, which is
    // ordinary narration and closes the region.
    if (cue.kind === "pause") {
      if (region === "open") region = "closed";
      bound.push(cue);
      return;
    }

    // A replay belongs to the aside it sits in and nowhere else. It says "that happened quickly,
    // watch it again", and there is nothing to watch again unless a film is currently being held.
    if (cue.kind === "replay") {
      if (region !== "holding") {
        issues.push({
          path: [index],
          message:
            `replays ${JSON.stringify(cue.target)}, and nothing is being held here; a replay ` +
            "belongs inside an aside, after a `during:` cue has stopped a film",
        });
        return;
      }
      bound.push(cue);
      return;
    }

    if (cue.kind !== "speech") {
      region = "closed";
      bound.push(cue);
      return;
    }

    /**
     * Where a `during:` may be written, and why the rule is positional.
     *
     * The lowering reorders nothing (`../compile/footage.ts`): the source is read top to bottom in
     * the order the film happens, so a sentence spoken at a state of the medium is written where
     * that state occurs — **inside** the film's run, immediately after the `play:` that starts it.
     *
     *     - play: kmeans
     *     - speech: "..."      during: pass-3       <- inside the film
     *     - speech: "..."      during: converged    <- still inside it
     *     - "And that is where it stops."           <- after the film; the region is closed
     *
     * The first cue that is neither a subscription nor a pause inside one ends the region, so what
     * an author reads down the page is the order the viewer hears. The alternative — allowing a
     * `during:` anywhere in the list and moving it — would make the source's order a lie about the
     * film's, which is the one thing this format has never done.
     */
    if (cue.during !== undefined) {
      if (region === "closed") {
        issues.push({
          path: [index],
          message:
            `is spoken during ${JSON.stringify(cue.during)}, and no film is running here; a ` +
            "`during:` cue belongs immediately after the `play:` whose film reaches that state",
        });
        return;
      }
      region = "holding";
    } else if (region !== "closed") {
      region = "closed";
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
  if (body.kind !== "world") {
    return "cannot be entered; only an entity of a world, carrying a child module, can be";
  }
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
