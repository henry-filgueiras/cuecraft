import type { AuthoredActor, AuthoredStep } from "../presentation/protocol.ts";
import { TRANSCRIPT } from "./theme.ts";

/**
 * Who holds which column, and when.
 *
 * The transcript composition gives x a meaning — **x is who** — and then spends one column per
 * declared actor for the whole running time. That is exactly right for a protocol whose parties are
 * all present throughout, and it is expensive for one whose parties are not: an actor that says
 * four things in the first ten seconds holds a column for the remaining eighty, and every shot of
 * the film is scaled to a world that is mostly nobody.
 *
 * cuecraft knows the entire protocol before it draws a frame, which means it knows something a
 * responsive layout never can: **every actor's complete future**. An actor first appears at some
 * step and last appears at some step, so it has a live interval, and two actors whose intervals do
 * not overlap can be given the same column at different times. `N` semantic actors, `M` physical
 * slots, `M < N` when the exchange permits it.
 *
 * This is interval allocation, and the resemblance to a register allocator is exact rather than
 * decorative: the intervals are known offline, the assignment is a pure function of the source, and
 * it is computed once and never revised. What it is emphatically *not* is responsive layout. The
 * invariant the whole idea stands on is:
 *
 * > **An actor never changes column during its semantic lifetime.**
 *
 * Not "rarely", and not "only while the camera is elsewhere". A viewer of a sequence diagram is
 * given one thing for free — that a party stays where it was put — and a layout that spent it to
 * save width would have sold the only asset it had. So nothing here consults the camera, the
 * current frame, or anything else that varies: the allocator runs between parsing and layout, and
 * its output is a map from actor to slot index.
 *
 * Plain TypeScript, no geometry and no Remotion, because the interesting properties are all
 * assertions about intervals.
 */

/** An actor's live interval, in step indices. Both ends inclusive, and both always exist. */
export interface Lifetime {
  readonly id: string;
  /**
   * Declaration order.
   *
   * Kept alongside the slot because the two have genuinely come apart, and the distinction is the
   * round's main structural finding: **an actor's identity and its presentation slot are different
   * things.** Everything semantic — the anchor model's element index, what a prologue reaches by
   * name — stays keyed to declaration order. Only the column moves.
   */
  readonly declared: number;
  /** The first step this actor sends or receives. */
  readonly first: number;
  /** The last one. */
  readonly last: number;
}

/** One actor's occupancy of one slot. */
export interface Tenancy extends Lifetime {
  readonly slot: number;
  /** Which turn in this slot. Zero is the tenant the film opens with. */
  readonly ordinal: number;
}

export interface LaneAllocation {
  /** Every tenancy, in slot order and then in time order. */
  readonly tenancies: readonly Tenancy[];
  /** The same, grouped: `bySlot[s]` is who has held slot `s`, earliest first. */
  readonly bySlot: readonly (readonly Tenancy[])[];
  readonly byActor: ReadonlyMap<string, Tenancy>;
  readonly slots: number;
  /**
   * The most actors ever live at the same step.
   *
   * The interval graph's clique number, and therefore the *floor* — no allocation of any kind can
   * use fewer columns than this. It is reported rather than merely used because the distance
   * between it and `slots` is precisely what the cooling rule below costs, and a policy whose price
   * is not visible is a policy nobody can argue with.
   */
  readonly peak: number;
  /** How many times a slot changed hands. `slots + reuses === actors`. */
  readonly reuses: number;
}

/**
 * How long a column must cool before it may become somebody else.
 *
 * **Semantic death is not visual death**, and this constant is the whole of that distinction. An
 * actor's last message is not the moment it leaves the picture: its arrows are still on screen,
 * decaying but legible, for as long as the camera keeps them, and dropping a new name into that
 * column while its predecessor's traffic is still in frame would make the film assert something
 * false for free — that this party is a continuation of that one. No amount of entrance treatment
 * repairs a claim the geometry is making underneath it.
 *
 * So reclamation is delayed past `last_use`, and by exactly the amount that makes the claim
 * impossible rather than unlikely: **a slot cools for as long as a shot can remember.**
 * `maxHistoryRows` is already the answer to "how far back may a frame reach", stated once in the
 * camera's own terms and derived from the room a shot has rather than picked. Requiring a strictly
 * greater gap than that means the outgoing tenant's last row and the incoming tenant's first row
 * cannot appear in the same frame — not in *this* film, but in any frame `stepBounds` is capable of
 * composing.
 *
 * It is deliberately the conservative reading. A laxer rule reaches the arithmetic floor on
 * `examples/deploy.yaml`; this one does not, and the columns it declines to reclaim are the price
 * of never being wrong about identity. That price is reported (`peak` against `slots`) rather than
 * absorbed.
 */
export const COOLING_ROWS = TRANSCRIPT.maxHistoryRows;

/**
 * Each actor's live interval.
 *
 * `first` and `last` coincide for an actor that appears exactly once, which is a legitimate
 * one-step interval and not a degenerate case.
 *
 * The parser refuses an actor that nothing ever touches, because a lane nothing touches is empty
 * space in every frame. Should one reach here anyway, it is live for the whole exchange: nothing in
 * the source says when it arrives or leaves, and the only safe answer to "when may this column be
 * given away" in the absence of evidence is *never*.
 */
export function lifetimesOf(
  actors: readonly AuthoredActor[],
  steps: readonly AuthoredStep[],
): readonly Lifetime[] {
  const first = new Map<string, number>();
  const last = new Map<string, number>();
  steps.forEach((step, index) => {
    for (const id of [step.from, step.to]) {
      if (!first.has(id)) first.set(id, index);
      last.set(id, index);
    }
  });

  return actors.map((actor, declared) => ({
    id: actor.id,
    declared,
    first: first.get(actor.id) ?? 0,
    last: last.get(actor.id) ?? Math.max(0, steps.length - 1),
  }));
}

/** The most actors live at any one step: the floor on how many columns the exchange can need. */
export function peakLive(lifetimes: readonly Lifetime[]): number {
  let peak = 0;
  const steps = lifetimes.reduce((most, life) => Math.max(most, life.last), -1);
  for (let step = 0; step <= steps; step += 1) {
    const live = lifetimes.filter(
      (life) => life.first <= step && step <= life.last,
    ).length;
    peak = Math.max(peak, live);
  }
  return peak;
}

/**
 * Assign every actor a column, once, offline.
 *
 * **Arrival order, lowest free slot.** Actors are considered in the order they enter the story,
 * ties broken by declaration order, and each takes the lowest-numbered column it is allowed to
 * take. That is the classic left-edge sweep, and two things about it were decided rather than
 * inherited:
 *
 * **Nothing is sorted by lifetime.** The obvious hypothesis — give the longest-lived actors the
 * leftmost, most structurally anchored columns — is refuted by `examples/tap.yaml` in a single
 * line. Its longest-lived actor is the shop's bank, and ranking by lifetime produces a lane order
 * of `bank, network, issuer, you, terminal`, which destroys the one thing that file gets for free:
 * that the question travels left to right and the answer comes back the way it went. Written order
 * is not arrival order dressed up. It is the author's statement of the exchange's shape, and
 * decision:34 already refused to let anything else set it.
 *
 * The pathology the ranking was invented for — disposable early actors permanently staking the best
 * real estate while the protagonists arrive late and sit out on the right — turns out to be handled
 * by reuse alone, and better. Early actors that vanish do not need to be *demoted*; they need to
 * *vacate*, and vacating hands the leftmost columns to whoever comes next without anybody being
 * ranked.
 *
 * **A free slot is one that has cooled**, not merely one whose tenant is semantically finished. See
 * `COOLING_ROWS`. When no column has cooled, a new one is opened — so the allocator is allowed to
 * use more than the arithmetic minimum, and that is the intended behaviour rather than a shortfall.
 *
 * There is no scoring function. Where more than one column is free the lowest wins, and on both
 * shipped examples that choice never actually arose: every reclamation had exactly one candidate.
 */
export function allocateLanes(
  actors: readonly AuthoredActor[],
  steps: readonly AuthoredStep[],
): LaneAllocation {
  const lifetimes = lifetimesOf(actors, steps);
  const arriving = [...lifetimes].sort(
    (a, b) => a.first - b.first || a.declared - b.declared,
  );

  const bySlot: Tenancy[][] = [];
  const byActor = new Map<string, Tenancy>();

  for (const life of arriving) {
    const free = bySlot.findIndex((held) => {
      const sitting = held[held.length - 1] as Tenancy;
      return life.first - sitting.last > COOLING_ROWS;
    });
    const slot = free === -1 ? bySlot.length : free;
    const held = bySlot[slot] ?? [];
    const tenancy: Tenancy = { ...life, slot, ordinal: held.length };
    if (free === -1) bySlot.push([tenancy]);
    else held.push(tenancy);
    byActor.set(life.id, tenancy);
  }

  return {
    tenancies: bySlot.flat(),
    bySlot,
    byActor,
    slots: bySlot.length,
    peak: peakLive(lifetimes),
    reuses: lifetimes.length - bySlot.length,
  };
}

/**
 * Who holds a slot at a given step.
 *
 * Tenancy changes at the incoming actor's *first step*, which is also where its plate is drawn, so
 * this and the picture cannot disagree. Before the exchange starts, and through the stretch after
 * one tenant's last message and before the next one's first, the answer is still the sitting
 * tenant — it has not let go of the column yet, and saying otherwise would leave the rail naming
 * nobody.
 */
export function tenantAt<Held extends { readonly first: number }>(
  held: readonly Held[],
  step: number,
): Held | undefined {
  let sitting = held[0];
  for (const tenancy of held) {
    if (tenancy.first <= step) sitting = tenancy;
  }
  return sitting;
}
