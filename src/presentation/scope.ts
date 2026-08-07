/**
 * Where a thing is, when "on this slide" stopped being an answer.
 *
 * Until now every identity in a presentation was scoped to one slide and that was enough: an
 * `activates:` named a bullet, a mark, or an entity, and there was exactly one list to look in.
 * A child module breaks that, because a module is written without knowing where it will be
 * mounted, and two modules written by two people will both eventually contain something called
 * `check`.
 *
 * So an element has a **structural address**: the path of scopes it sits under, ending in its own
 * local identity.
 *
 *     root
 *     root/payment
 *     root/payment/check
 *     root/payment/check/verdict
 *
 * A string rather than an array of segments, because it is compared far more often than it is
 * taken apart, it has to appear in diagnostics, and the one thing it must never become is a
 * *query*. There is no wildcard, no relative form, no parent reference, and nothing in the source
 * format writes one down — an author types a local name, exactly as they always have, and the
 * compiler works out where it is. Cross-scope reference is a non-goal of the round that
 * introduced this, and an address you cannot spell is an address you cannot reach across.
 *
 * Local identities are already constrained by `ANCHOR_ID` to a form with no `/` in it, so the
 * separator cannot be forged from below and a path parses back exactly.
 */

/** The scope every presentation starts in. One slide, one root. */
export const ROOT_SCOPE = "root";

export type Scope = string;

/**
 * How deep the descent may go, counted in child modules below the root.
 *
 * Two: root, a child, and a grandchild. The implementation recurses and would happily do more,
 * and that is exactly why the limit is here rather than absent — an implementation that recurses
 * is not evidence that a four-deep presentation is watchable, and nothing built so far has been
 * watched at four. The number is a claim about what has been seen, and it moves when an artifact
 * moves it.
 */
export const MAX_MODULE_DEPTH = 2;

/** The scope inside `scope` belonging to the thing called `id` there. */
export function childScope(scope: Scope, id: string): Scope {
  return `${scope}/${id}`;
}

/** How many child modules deep this scope is. `root` is 0. */
export function scopeDepth(scope: Scope): number {
  return scope.split("/").length - 1;
}

/** The scope this one sits in, or nothing at the root. */
export function scopeParent(scope: Scope): Scope | undefined {
  const cut = scope.lastIndexOf("/");
  return cut === -1 ? undefined : scope.slice(0, cut);
}

/** The last segment: what this scope is called where it is mounted. */
export function scopeLeaf(scope: Scope): string {
  const cut = scope.lastIndexOf("/");
  return cut === -1 ? scope : scope.slice(cut + 1);
}

/** Every scope from the root down to this one, outermost first. */
export function scopeChain(scope: Scope): readonly Scope[] {
  const segments = scope.split("/");
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}
