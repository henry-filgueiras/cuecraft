/**
 * Reading an SVG a foreign program drew, and finding the names it put in it.
 *
 * decision:57's spike established that base R's `svg()` device emits nothing addressable: no `id`
 * outside `<defs>`, no grouping per panel, and no `<text>` — cairo outlines every glyph. That
 * finding is why regions exist, and it is still true.
 *
 * What it does not establish, and what this round found, is that the *device* having no opinion is
 * not the same as the *program* having none. A program knows which object it just drew; it can draw
 * it in a colour nobody else uses, find that colour in its own output, and write a name onto the
 * element that carries it. Base R, three lines of `gsub`, no package. So the identity can travel
 * **inside** the artifact after all, and cuecraft discovers it instead of being handed a rectangle.
 *
 * ## The attribute, and why it is not `id`
 *
 *     <path data-cuecraft="asia-pacific" fill="#e8833a" d="..."/>
 *
 * `id` was the obvious choice and is the wrong one for two reasons that idea:24 had already
 * flagged. cairo fills `<defs>` with `id="glyph-0-0"` and refers to them with `<use xlink:href>`, so
 * ids in the file are already spoken for; and an inlined SVG's ids land in the same document as the
 * composition's own. A namespaced data attribute collides with nothing, may legally appear on
 * several elements at once — one semantic object is frequently several paths — and says on its face
 * who it is for.
 *
 * ## What cuecraft does *not* learn
 *
 * Nothing here parses geometry, and nothing downstream may. cuecraft reads two things out of an
 * SVG: how large it is, and which names it carries. It does not know that a tagged element is a
 * bar, where it sits, how big it is, or what it means — exactly as it does not for a PNG. The
 * contract is unchanged from decision:55; only the *carrier* of the identity moved.
 *
 * A regex rather than an XML parser, and the constraint that makes that honest: everything read
 * here is an attribute on the root element or a fixed-shape attribute anywhere, and neither can be
 * confused by nesting. The moment something wants an element's *position* in the tree, this needs a
 * parser and should get one rather than a longer regex.
 */

/** An identity a program wrote into its own picture. The same grammar as every other in the format. */
const TAG = /data-cuecraft="([^"]*)"/g;

/** What a name may be: the identifier grammar `shows:` and `activates:` already share. */
const IDENTITY = /^[A-Za-z][A-Za-z0-9_-]*$/;

export const SVG_TAG_ATTRIBUTE = "data-cuecraft";

export interface SvgArtifact {
  readonly width: number;
  readonly height: number;
  /** Every distinct name the file carries, in the order they first appear. */
  readonly elements: readonly string[];
}

/**
 * An SVG's dimensions and the names inside it, or why the file is not one cuecraft can take.
 *
 * The dimensions come from `viewBox` in preference to `width`/`height`, because cairo writes the
 * latter in points and the former in user units, and the aspect ratio is the only thing the
 * composition actually needs — a vector picture is fitted to the room rather than to its own
 * pixel count, which is the whole of what idea:24 said this format would buy.
 */
export function readSvg(text: string): { artifact?: SvgArtifact; problem?: string } {
  const root = /<svg\b[^>]*>/.exec(text);
  if (root === null) {
    return { problem: "there is no <svg> root element" };
  }

  const size = dimensions(root[0]);
  if (size === undefined) {
    return {
      problem:
        "the <svg> element has neither a viewBox nor a width and height cuecraft can read; " +
        "a picture with no dimensions has no aspect ratio to be fitted to a room",
    };
  }

  const elements: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(TAG)) {
    const name = match[1] ?? "";
    if (!IDENTITY.test(name)) {
      return {
        problem:
          `${JSON.stringify(name)} is tagged in the picture and is not a usable identity; ` +
          "a name starts with a letter and continues with letters, digits, hyphens or underscores",
      };
    }
    // Not a refusal. One semantic object is frequently several paths — a bar and its outline, a
    // panel's worth of rectangles — and a program should not have to merge them into one element
    // to give them one name.
    if (seen.has(name)) continue;
    seen.add(name);
    elements.push(name);
  }

  return { artifact: { ...size, elements } };
}

function dimensions(root: string): { width: number; height: number } | undefined {
  const view =
    /viewBox="\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*"/.exec(
      root,
    );
  if (view !== null) {
    const width = Number(view[3]);
    const height = Number(view[4]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }

  const width = length(root, "width");
  const height = length(root, "height");
  if (width !== undefined && height !== undefined) return { width, height };
  return undefined;
}

/** `width="576pt"` is 576. The unit is discarded, because only the ratio survives being fitted. */
function length(root: string, name: string): number | undefined {
  const match = new RegExp(`\\b${name}="\\s*([\\d.eE+-]+)[a-z%]*\\s*"`).exec(root);
  if (match === null) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
