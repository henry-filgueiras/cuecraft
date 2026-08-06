/**
 * The only language cuecraft can set as a specimen. Widening this is a decision, not a knob.
 *
 * Its own module rather than a constant in `parse.ts` because both the parser and the source
 * quoter need it, and the quoter is imported *by* the parser — see decision:16 for why the
 * list is one entry long.
 */
export const CODE_LANGUAGES = ["yaml"] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export function isCodeLanguage(value: string): value is CodeLanguage {
  return (CODE_LANGUAGES as readonly string[]).includes(value);
}
