import type { AuthoredExhibitInput, ExhibitResource } from "./exhibit.ts";
import type { FigureKind } from "./figure.ts";
import type { AuthoredFormulaLine } from "./formula.ts";
import type {
  AuthoredOccurrence,
  AuthoredState,
  AuthoredTransition,
  MachineScope,
} from "./machine.ts";
import { takeId } from "./machine.ts";
import type { AuthoredSeriesGroup } from "./series.ts";
import type { CodeLanguage } from "./language.ts";
import type { AuthoredActor, AuthoredStep } from "./protocol.ts";
import { stepId } from "./protocol.ts";
import { childScope, type Scope } from "./scope.ts";
import type { AuthoredMark } from "./specimen.ts";
import type { AuthoredEntity, AuthoredRelation } from "./world.ts";
export type { AuthoredEntity, AuthoredRelation } from "./world.ts";

/**
 * What a slide's content *is*, and which parts of it narration can reach.
 *
 * Its own module rather than a corner of `parse.ts` because this vocabulary is shared by
 * everything downstream — timing, layout selection, the compositions — while parsing is not.
 * Since a specimen may quote a repository file, `parse.ts` now reaches the filesystem, and a
 * renderer bundle has no business carrying `node:fs` along for a type.
 *
 * decision:10 chose composition from the *shape* of a slide's content — how many items, how
 * long they are. Shape turned out to be a weak proxy for meaning exactly where idea:5 predicted
 * it would be. `bullets` and `steps` are the same data and make different claims: "these are
 * points" against "these are stages of one transformation", and a compiler's pipeline is not an
 * enumerated list. `code` is not points at all — its whitespace is the content. `change` is not
 * even one state of anything.
 *
 * So the role is the first input to composition, and shape decides only within a role. The
 * union is deliberately closed and deliberately small. Every entry exists because a real
 * artifact could not say what it meant without it, and none was added because it would be nice
 * to have.
 *
 * Still nothing geometric. A body says what the content means; it never says how big, how many
 * columns, or where.
 */

/** One item of a list, which may carry a semantic identity that narration can reach. */
export interface AuthoredItem {
  readonly text: string;
  readonly id?: string;
}

export type SlideBody =
  | { readonly kind: "none" }
  | { readonly kind: "bullets"; readonly items: readonly AuthoredItem[] }
  | { readonly kind: "steps"; readonly items: readonly AuthoredItem[] }
  | {
      readonly kind: "code";
      readonly language: CodeLanguage;
      /** Verbatim, including indentation. Written here, or quoted — see `./source.ts`. */
      readonly source: string;
      readonly marks: readonly AuthoredMark[];
    }
  | {
      readonly kind: "change";
      readonly language: CodeLanguage;
      /** Two truthful source states. What differs between them is nobody's to annotate. */
      readonly before: string;
      readonly after: string;
    }
  | {
      /**
       * Content the compiler supplies. It carries no text and no elements, which is exactly what
       * keeps it out of its own derivation — see `../compile/facts.ts`.
       */
      readonly kind: "figure";
      readonly figure: FigureKind;
    }
  | {
      /**
       * Mathematics. A sequence of lines, exactly as a list is, so narration reaches a
       * definition the same way it reaches a bullet — see `./formula.ts`.
       */
      readonly kind: "formula";
      readonly lines: readonly AuthoredFormulaLine[];
    }
  | {
      /**
       * A bounded population: many of the same thing, in named groups — see `./series.ts`.
       * The *groups* are the elements; the members have no identity and never will.
       */
      readonly kind: "series";
      readonly groups: readonly AuthoredSeriesGroup[];
    }
  | {
      readonly kind: "world";
      /** What exists. Ordered as authored, which is the order narration reaches them in. */
      readonly entities: readonly AuthoredEntity[];
      /** How it relates. Where any of it *sits* is derived — see `../render/world.ts`. */
      readonly relations: readonly AuthoredRelation[];
    }
  | {
      /**
       * An ordered exchange between parties — see `./protocol.ts`. The first body whose content
       * is a sequence of *events* rather than a structure, and the only one that brings its own
       * narration with it.
       */
      readonly kind: "protocol";
      readonly actors: readonly AuthoredActor[];
      readonly steps: readonly AuthoredStep[];
    }
  | {
      /**
       * A state machine and one run of it — see `./machine.ts`. The first body that is a
       * *structure* and a *sequence* at once: the topology is true before anything is said, and
       * the scenario happens an occurrence at a time.
       */
      readonly kind: "machine";
      readonly states: readonly AuthoredState[];
      readonly transitions: readonly AuthoredTransition[];
      readonly scenario: readonly AuthoredOccurrence[];
      /** Whether the slide is about the whole machine or about the run — decision:54. */
      readonly scope: MachineScope;
    }
  | {
      /**
       * An artifact a foreign program computed during this compilation — see `./exhibit.ts`. The
       * first body cuecraft cannot read: it knows what produced the content and nothing about what
       * the content is.
       */
      readonly kind: "exhibit";
      /** Repository-relative path of the R program, for diagnostics and for the specimen. */
      readonly program: string;
      /** The program itself, read at parse time and handed to the runner over stdin. */
      readonly source: string;
      readonly inputs: readonly AuthoredExhibitInput[];
      /** The identities the picture will have. These are what narration can reach — decision:57. */
      readonly shows: readonly string[];
      /** Which column identifies a row, when what comes back is a table rather than a picture. */
      readonly key?: string;
      /**
       * What the program produced, and where it landed.
       *
       * Absent on a freshly parsed presentation and present after materialization, which is the
       * one place in the format where a body is completed rather than read. It is not authored and
       * cannot be: an author who could write this could point a slide at a checked-in image, which
       * is precisely what `./exhibit.ts` refuses to make expressible.
       */
      readonly resource?: ExhibitResource;
    };

/**
 * The identity a change declares on behalf of its author.
 *
 * Every other identity in the format is typed twice: once on the element, once on the cue that
 * reaches it. A change is the first body that already *knows* which part of itself the narration
 * would be talking about, because the changed region is derived (`./change.ts`). Asking the
 * author to name it would be asking them to repeat back something the compiler computed.
 *
 * So the body declares one identity and that is the whole of the vocabulary. It is scoped to the
 * slide exactly as a bullet's `id` is, it appears in the "declared:" list of every anchor error,
 * and a deck that spells it wrong fails at parse time. Nothing here is global and nothing here
 * is magic — there is one derived element, and it has a name.
 */
export const CHANGE_ELEMENT_ID = "change";

/**
 * The elements of a body that narration can reach, in the order the renderer lays them out.
 *
 * One function rather than four branches scattered through the compiler: an anchor resolves to
 * an index into *this* list whatever the body is, so adding a fifth role would not touch timing,
 * validation, or the anchor representation.
 *
 * The `change` case is the first where the elements are *derived* rather than authored, and it
 * needed no change to anything downstream — which is the evidence that this seam is real.
 */
export function bodyElements(body: SlideBody): readonly { readonly id?: string }[] {
  switch (body.kind) {
    case "none":
      return [];
    case "code":
      return body.marks;
    case "change":
      return [{ id: CHANGE_ELEMENT_ID }];
    case "formula":
      return body.lines;
    case "series":
      return body.groups;
    case "figure":
      // Nothing. A figure's content is derived from the timing that would have to be derived
      // from it, so it declares no endpoint narration could reach and adds nothing to measure.
      return [];
    case "exhibit":
      // Whatever the picture will be able to say it contains, and nothing else. A figure has no
      // elements at all because naming one would make its derivation circular; an exhibit has
      // exactly the ones the slide declared and the program is obliged to draw (decision:57).
      // An author still writes no coordinate — only a name, checked against R on every render.
      return body.shows.map((id) => ({ id }));
    case "world":
      return [...body.entities, ...body.entities.flatMap(interiorElements)];
    case "protocol":
      // Actors first, then steps, for the same reason a world publishes entities before
      // interiors: two lists that share one index space need one ordering rule, stated once.
      // The steps' identities are the compiler's own (`./protocol.ts`), which is why an author
      // writes none.
      return [...body.actors, ...body.steps.map((_, index) => ({ id: stepId(index) }))];
    case "machine":
      // States first, then occurrences, which is the protocol rule with the nouns changed. What
      // it buys is the same thing: a prologue may reach a *state* by name — "this is where it
      // starts" — and may not reach into the lowering of the scenario, because the compiler wrote
      // both ends of that relationship (`./machine.ts`).
      //
      // Transitions are deliberately absent. They are the machine's third kind of identity and
      // the only one narration cannot reach, because an edge is not a moment: what happens at a
      // moment is an *occurrence* of one, and the scenario already addresses those.
      return [
        ...body.states,
        ...body.scenario.map((_, index) => ({ id: takeId(index) })),
      ];
    default:
      return body.items;
  }
}

/**
 * Where an entity's interior sits in the flat element list.
 *
 * The ordering rule is one sentence and it lives here, next to `bodyElements`, because two
 * places that agree about an index are one place away from disagreeing about it: **every entity
 * first, then every interior in entity order**. So a world of eleven entities, the eighth of
 * which has a three-element interior, has fourteen reachable elements, and the interior's are
 * 11, 12 and 13.
 *
 * That flatness is what let narration reach inside an entity without anything upstream
 * changing. An `activates:` still resolves to one index into one list, timing still knows
 * nothing about worlds, and the anchor representation decision:14 chose is untouched — an
 * interior is not a second addressing scheme, it is more of the same one.
 */
export function interiorRange(
  entities: readonly AuthoredEntity[],
  id: string,
): { readonly offset: number; readonly count: number } | undefined {
  let offset = entities.length;
  for (const entity of entities) {
    const count = interiorElements(entity).length;
    // Absent when the entity has no inside — not when the inside has nothing narration can
    // reach. A figure's content is supplied by the compiler and declares no endpoints, and it is
    // still very much an inside.
    if (entity.id === id) {
      return entity.detail === undefined ? undefined : { offset, count };
    }
    offset += count;
  }
  return undefined;
}

function interiorElements(entity: AuthoredEntity): readonly { readonly id?: string }[] {
  return entity.detail === undefined ? [] : bodyElements(entity.detail);
}

/**
 * The same walk as `bodyElements`, naming what it visits.
 *
 * An index into a flat list is a fine thing for a compiler to resolve against and a useless thing
 * to put in a diagnostic, and it stopped being sufficient the moment two scopes could both
 * contain something called `check`. So this publishes, for each element in `bodyElements` order,
 * the two facts that resolution and validation actually need:
 *
 *     address    where the element sits, as a structural path (`./scope.ts`)
 *     scope      which narration is entitled to reach it
 *
 * The second is the whole of the distinction this round turns on, and it is one line below.
 * An **inline `detail`** is addressed under its entity and reachable from the *enclosing*
 * narration: that is decision:25 exactly as it shipped, where an author writes a sentence about
 * something inside a concept and the portal opens. A **child module** is addressed under its
 * entity and reachable only from *its own* narration, because it brought some — its scope is a
 * different scope, and a cue outside it may not reach in.
 *
 * Here rather than beside the parser for the same reason `interiorRange` is here: it is the same
 * ordering rule, and an ordering rule that lives in two places is one edit from living in two
 * different places.
 */
export interface ElementAddress {
  /** Absent on an element that declares no identity, which is most bullets in most decks. */
  readonly address: Scope | undefined;
  readonly scope: Scope;
}

export function bodyAddresses(body: SlideBody, scope: Scope): readonly ElementAddress[] {
  const named = (id: string | undefined): ElementAddress => ({
    address: id === undefined ? undefined : childScope(scope, id),
    scope,
  });

  switch (body.kind) {
    case "none":
    case "figure":
      return [];
    case "exhibit":
      return body.shows.map((id) => named(id));
    case "code":
      return body.marks.map((mark) => named(mark.id));
    case "change":
      return [named(CHANGE_ELEMENT_ID)];
    case "formula":
      return body.lines.map((line) => named(line.id));
    case "series":
      return body.groups.map((group) => named(group.id));
    case "world":
      return [
        ...body.entities.map((entity) => named(entity.id)),
        ...body.entities.flatMap((entity) => interiorAddresses(entity, scope)),
      ];
    case "protocol":
      return [
        ...body.actors.map((actor) => named(actor.id)),
        // A step is addressed under the slide and reachable only from the narration the compiler
        // generated for it — which is the module rule (below) applied to something that is not a
        // module. Giving each step a scope of its own is what makes `activates: step-3` in an
        // author's own `say:` an unknown identity rather than a way to reach inside the lowering.
        ...body.steps.map((_, index) => ({
          address: childScope(scope, stepId(index)),
          scope: childScope(scope, stepId(index)),
        })),
      ];
    case "machine":
      return [
        ...body.states.map((state) => named(state.id)),
        // Each occurrence in a scope of its own, exactly as a step is, so that `activates: take-3`
        // written by an author is an unknown identity rather than a way to reach into the lowering.
        ...body.scenario.map((_, index) => ({
          address: childScope(scope, takeId(index)),
          scope: childScope(scope, takeId(index)),
        })),
      ];
    default:
      return body.items.map((item) => named(item.id));
  }
}

function interiorAddresses(
  entity: AuthoredEntity,
  scope: Scope,
): readonly ElementAddress[] {
  if (entity.detail === undefined) return [];
  const inside = childScope(scope, entity.id);
  const addresses = bodyAddresses(entity.detail, inside);
  // A module's elements keep their addresses and lose their reachability: they belong to the
  // module's own narration, and the enclosing `say` may not speak to them.
  return entity.module === undefined
    ? addresses.map((entry) => ({ address: entry.address, scope }))
    : addresses;
}
