import "katex/dist/katex.min.css";

import { useFontGate } from "./fonts.tsx";

/**
 * Making sure the mathematics is actually there before the frame is taken.
 *
 * KaTeX ships its own faces, they are bundled with the composition, and a formula therefore sets
 * identically on any machine — which for a long time made it the *only* typography in cuecraft that
 * did not depend on what the host happened to have installed (dragon:4). sprint:29 gave the deck a
 * second bundled profile beside it, and took the mechanism this file discovered — hold the frame,
 * ask the browser for each family by name, release — out into `./fonts.tsx` where both use it.
 *
 * Asking explicitly rather than waiting on `document.fonts.ready` is the part worth keeping: `ready`
 * resolves immediately when nothing has *started* loading, and whether anything has started depends
 * on whether layout has run, which is a race this must not be in.
 *
 * **KaTeX is deliberately untouched by the accessibility profile.** A `dyslexia: true` deck sets its
 * prose and its code in Atkinson and its mathematics in exactly the faces it always did. Mathematics
 * is not prose set in a different font: the glyphs *are* the notation, an italic `x` is a variable
 * and an upright `x` is not, and substituting a face designed for running text would change what a
 * definition says. If mathematical legibility turns out to want its own answer, that is its own
 * round with its own evidence.
 *
 * Only the families a definition actually uses. KaTeX ships sixty faces for a full TeX
 * installation; a hash function's definitions are italic variables, upright function names, and
 * operators, which is three of them.
 */
const FAMILIES = ["KaTeX_Main", "KaTeX_Math", "KaTeX_Size1"] as const;

const DESCRIPTORS = FAMILIES.flatMap((family) => [
  `16px "${family}"`,
  `italic 16px "${family}"`,
  `700 16px "${family}"`,
]);

/**
 * The one thing KaTeX's stylesheet does that cuecraft has to undo.
 *
 * `.katex-display` carries `margin: 1em 0`, which is right for mathematics set among paragraphs
 * of prose and wrong here: the `formula` composition supplies its own leading, derived from the
 * size it chose, and KaTeX's margin is *also* derived from that size — so the two compound and a
 * six-line definition sets two and a half times as tall as the fit predicted, with the last two
 * lines off the bottom of the frame. That is exactly how it was found.
 *
 * Zeroed rather than accounted for, because a layout rule that has to know another stylesheet's
 * margins is a layout rule that breaks on the next release of it.
 */
export const MATH_RESET = ".katex-display{margin:0}";

export function useMathFonts(): void {
  useFontGate(DESCRIPTORS, "loading the mathematics faces");
}
