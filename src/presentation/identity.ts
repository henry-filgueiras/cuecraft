/**
 * What an identity may be spelled like.
 *
 * Narrow on purpose: an identity appears in two places in the source and has to be matched
 * exactly, so the set of things it can be should be small enough to type correctly twice.
 *
 * Its own module rather than a constant in `parse.ts` because the fifth body needs it and
 * `parse.ts` imports *that* — a world's entities are keyed by identity, so the rule has to be
 * reachable from below the parser without importing the parser.
 */
export const ANCHOR_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const ANCHOR_ID_HINT =
  "lower-case letters, digits and hyphens, starting with a letter";
