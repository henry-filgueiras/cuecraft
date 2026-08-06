import type { CodeLanguage } from "./language.ts";
import type { AuthoredMark } from "./specimen.ts";
import type { AuthoredEntity, AuthoredRelation } from "./world.ts";

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
      readonly kind: "world";
      /** What exists. Ordered as authored, which is the order narration reaches them in. */
      readonly entities: readonly AuthoredEntity[];
      /** How it relates. Where any of it *sits* is derived — see `../render/world.ts`. */
      readonly relations: readonly AuthoredRelation[];
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
    case "world":
      return body.entities;
    default:
      return body.items;
  }
}
