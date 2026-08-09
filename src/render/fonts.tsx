import { createContext, useContext, useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

import { DEFAULT_TYPOGRAPHY, type Typography } from "./typography.ts";

/**
 * Which faces this render is set in, and making sure they are actually there.
 *
 * ## Two orderings, and only one of them is about waiting
 *
 * "The fonts must be ready before layout" is the obvious rule and it is not quite what cuecraft
 * needs, because cuecraft's layout never asks the browser anything. Every fitter in `./theme.ts`
 * predicts a line break by arithmetic — a character count over an average advance width — so that
 * composition resolves in Node, without a browser, in a unit test. That is a deliberate constraint
 * and this round does not relax it.
 *
 * So the ordering splits in two, and each half is guaranteed by a different mechanism:
 *
 *     profile before layout    the profile is resolved in `buildTimeline` and arrives as an input
 *                              prop, so every fitter in the tree already has it on first render.
 *                              There is no moment at which layout has run and the profile has not.
 *
 *     faces before capture     `delayRender` holds the frame until the browser reports the
 *                              families resident, so no frame is ever photographed in the
 *                              fallback.
 *
 * A CSS-only swap would satisfy neither: the arithmetic would be Helvetica's while the pixels were
 * Atkinson's, and the first frames would be whatever loaded first.
 *
 * ## Why the gate asks by name
 *
 * `document.fonts.ready` resolves immediately when nothing has *started* loading, and whether
 * anything has started depends on whether layout has run — a race this must not be in. So each
 * family is requested explicitly, which is the shape sprint:7 arrived at for KaTeX
 * (`./mathfonts.tsx`) and the reason that discovery was worth keeping.
 */

/**
 * The profile every composition in this render reads.
 *
 * A context rather than a prop threaded through forty components, and a context rather than a
 * module-level variable, which are two different arguments. Against the prop: `FactsContext` and
 * `SubtitleBandContext` already established the idiom for exactly this kind of value — one thing
 * the whole tree needs and no part of the tree decides. Against the global: a context is scoped to
 * a render tree, so two renders in one process cannot see each other's, and a nested world drawn
 * inside a recall inherits the root's rather than acquiring one.
 *
 * The default is the deck's ordinary look, so a component rendered outside a provider — a test, a
 * Remotion Studio preview of a placeholder — behaves as it always has rather than throwing.
 */
export const TypographyContext = createContext<Typography>(DEFAULT_TYPOGRAPHY);

export function useTypography(): Typography {
  return useContext(TypographyContext);
}

/**
 * Hold the frame until the browser has these faces.
 *
 * The smallest thing two callers needed. `./mathfonts.tsx` waits on KaTeX's three families and this
 * waits on a profile's two, and the only thing they share is the shape: take a handle, ask for each
 * font by its CSS shorthand, release the handle whatever happens.
 *
 * `descriptors` is a list of CSS `font` shorthands — `600 16px "Atkinson Hyperlegible Next"`. The
 * size in a shorthand is irrelevant to which file loads and required by the grammar; 16 is the
 * conventional filler.
 *
 * An empty list releases immediately, which is the whole of what a system-stack profile needs: a
 * face the host either has or does not have cannot be waited for (dragon:4).
 *
 * A face that will not load is not worth failing a render over. The stack behind it is still a
 * legible stack, and a rendered frame in the wrong face is a smaller failure than a render that
 * never finishes — dragon:4's fourth constraint, that fallback degrades rather than fails.
 */
export function useFontGate(descriptors: readonly string[], label: string): void {
  const [handle] = useState(() => delayRender(label));
  // The identity of the list, not the list: a component that rebuilt the array on every frame would
  // re-run the effect on every frame, and re-entering a `delayRender` that has already been
  // continued is a Remotion error rather than a no-op.
  const key = descriptors.join("|");

  useEffect(() => {
    let live = true;
    const wanted = key === "" ? [] : key.split("|");
    Promise.all(wanted.map((font) => document.fonts.load(font)))
      .catch(() => undefined)
      .then(() => {
        if (live) continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle, key]);
}

/**
 * The shorthands a profile's faces need, in a stable order.
 *
 * Only the weights the deck actually sets. Asking for a weight no composition uses would block the
 * render on a file nothing is going to draw with, and asking for a family a system-stack profile
 * merely *names* would block it on a file that does not exist.
 */
export function faceDescriptors(type: Typography): readonly string[] {
  return type.faces.flatMap((face) =>
    face.weights.map((weight) => `${weight} 16px "${face.family}"`),
  );
}

/** Hold the frame until this render's profile is resident. A no-op for a system stack. */
export function useTypographyGate(type: Typography): void {
  useFontGate(faceDescriptors(type), `loading the ${type.id} typography`);
}
