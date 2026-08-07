import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

import "katex/dist/katex.min.css";

/**
 * Making sure the mathematics is actually there before the frame is taken.
 *
 * Every other face in this deck is a system stack (`./theme.ts`), resolved by the headless
 * Chromium against whatever the host machine has — which dragon:4 records as a reproducibility
 * problem and this round does not solve. KaTeX is the exception, and it is an exception in the
 * *right* direction: it ships its own faces, they are bundled with the composition, and a formula
 * therefore sets identically on any machine.
 *
 * The cost of bundling a face rather than borrowing one is that it has to *load*, and a renderer
 * that captures frames as fast as it can will otherwise photograph the fallback. Remotion's answer
 * is `delayRender`, and this is the documented shape of it: hold the frame, ask the browser for
 * each family by name, release. Asking explicitly rather than waiting on `document.fonts.ready`
 * matters, because `ready` resolves immediately when nothing has *started* loading — and whether
 * anything has started depends on whether layout has run, which is a race this must not be in.
 *
 * Only the families a definition actually uses. KaTeX ships sixty faces for a full TeX
 * installation; a hash function's definitions are italic variables, upright function names, and
 * operators, which is three of them.
 */
const FAMILIES = ["KaTeX_Main", "KaTeX_Math", "KaTeX_Size1"] as const;

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
  const [handle] = useState(() => delayRender("loading the mathematics faces"));

  useEffect(() => {
    let live = true;
    const wanted = FAMILIES.flatMap((family) => [
      `16px "${family}"`,
      `italic 16px "${family}"`,
      `700 16px "${family}"`,
    ]);
    Promise.all(wanted.map((font) => document.fonts.load(font)))
      // A face that will not load is not worth failing a render over: KaTeX falls back to a
      // system serif, which is worse-looking and still mathematics. A render that never
      // finishes is not.
      .catch(() => undefined)
      .then(() => {
        if (live) continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);
}
