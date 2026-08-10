import { createHash } from "node:crypto";

import type { Timeline } from "./timeline.ts";

/**
 * The one identity a film and its symbol table share (decision:67, dragon:40).
 *
 * A symbol table says frame 400 is inside `slide:architecture`. That is true of the film it was
 * compiled beside and of no other, and until this existed nothing could tell the two apart: a
 * sidecar left over from an earlier render is still valid JSON, still parses, and still resolves
 * every key to a number. `cuecraft snapshot` would extract that number and report it with a
 * semantic name attached, which is a more convincing way to be wrong than sampling blindly.
 *
 * So both artifacts are stamped with a digest of the thing they are both derived from.
 *
 *     compiled presentation
 *              |
 *              v
 *          Timeline  ------> renderId = sha256(canonical JSON)
 *          /      \                |
 *         v        v               +--> moov metadata on the MP4
 *      film     symbols            +--> media.renderId in the sidecar
 *
 * ## Why the timeline, and not the film's bytes
 *
 * This is a **provenance** question, not an integrity question. There is no adversary and no
 * corruption; the two files are siblings from one compilation, and what has to be established is
 * not "are these the bytes I wrote" but "do these frame numbers describe this film". Those come
 * apart in both directions. Re-encoding a film — which `scripts/compress-for-upload.sh` does on
 * purpose — changes every byte and moves no frame. And re-rendering the same deck over the same
 * path leaves a byte digest that matches the film which is *there* rather than the film the sidecar
 * was born beside, so the one case that matters is exactly the one a byte digest cannot see.
 *
 * A digest of the timeline has neither problem, and it has a property a random identifier would
 * not: two renders of an identical timeline agree. That is not a false positive — a film rendered
 * from the same timeline genuinely is described by the same symbols — and it keeps tests stable.
 *
 * ## Why not the inputs
 *
 * Hashing the deck source, the version and the configuration would claim a match across pairs whose
 * frames differ. dragon:33 records that a deck with an exhibit is reproducible only up to whatever R
 * is installed, and re-synthesized narration moves every measured duration. The timeline sits
 * downstream of all of that and absorbs it, which is the same reason decision:9 puts the freeze
 * there.
 */

/** The digest algorithm, named in the stamp so a later one can be told apart from this one. */
const ALGORITHM = "sha256";

/**
 * A stable digest of everything the compilation decided.
 *
 * Over the *whole* timeline rather than a chosen subset, because the subset would be a second
 * statement of what affects the picture and would drift from the first one. It is kilobytes: a
 * twenty-six-slide film with an exhibit in it serializes to about 27 kB, so this costs microseconds
 * where hashing the film would cost tens of megabytes of I/O per invocation.
 */
export function renderIdFor(timeline: Timeline): string {
  return createHash(ALGORITHM).update(canonicalize(timeline)).digest("hex");
}

/**
 * JSON with every object's keys in sorted order.
 *
 * `JSON.stringify` emits keys in property-insertion order, which is deterministic for one build of
 * cuecraft and *not* a property worth depending on: it makes the digest a function of the order
 * fields happen to be assigned in, so reordering two lines of an object literal in `timeline.ts`
 * would invalidate every symbol table in existence without changing a single frame. Sorting removes
 * the dependency entirely.
 *
 * Arrays keep their order, because in a timeline an array's order is meaning — scenes are in
 * playback order and clips are in the order they are heard.
 *
 * Numbers are left to `JSON.stringify`, whose output for a double has been the shortest
 * round-tripping representation since ES2018 and is therefore stable across engines and versions.
 * Nothing here rounds: a digest that ignored the last bit of a measured duration would be claiming
 * that two films differing by a frame are the same film.
 *
 * `undefined` is dropped, exactly as it is when the sidecar is written, so an optional field that is
 * absent and one that is explicitly undefined cannot disagree.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sorted(value));
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, held]) => held !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries.map(([key, held]) => [key, sorted(held)]));
}

/**
 * How the identity is written into a film, and read back out of one.
 *
 * It rides in the MP4's `comment` tag, and that choice is forced rather than preferred. ffmpeg's mov
 * muxer writes only the tags it recognises unless it is given `-movflags use_metadata_tags`, and
 * Remotion spends the single `-movflags` argument on `faststart` — so a bespoke key like
 * `cuecraft_render_id` is accepted by the API, passed to the encoder, and silently dropped from the
 * file. That was measured, not assumed.
 *
 * Remotion also *always* writes a comment of its own and prepends it to anything it is given, so the
 * tag on a cuecraft film reads:
 *
 *     Made with Remotion 4.0.506; cuecraft renderId=sha256:1f0c…
 *
 * Which is why this is a search rather than an equality test: the stamp has to be findable inside a
 * string it does not own the start of. It stays greppable — `strings film.mp4 | grep cuecraft` finds
 * it — and self-describing, so a file encountered without any of this context still says what the
 * hex is.
 */
export const STAMP_TAG = "comment";

export function stampFor(renderId: string): string {
  return `cuecraft renderId=${ALGORITHM}:${renderId}`;
}

const STAMP = /cuecraft renderId=([a-z0-9]+):([0-9a-f]{16,})/;

/** The render identity inside a metadata value, or nothing if there is not one. */
export function renderIdIn(tag: string | undefined): string | undefined {
  const found = tag === undefined ? null : STAMP.exec(tag);
  // Algorithm-qualified so that a film stamped by a future cuecraft using a different digest reads
  // as *unknown* rather than as a mismatch. Refusing to extract because a stamp is newer than the
  // reader would be a worse failure than admitting the reader cannot tell.
  return found?.[1] === ALGORITHM ? found[2] : undefined;
}

/**
 * Enough of an identity to name in a message: the first twelve hex digits.
 *
 * Sixty-four characters of hex in an error is a wall a reader skips. Twelve is far past what any
 * human comparison needs, and no decision is ever taken on the short form — the comparison is
 * always over the whole digest.
 */
export function shortRenderId(renderId: string): string {
  return renderId.slice(0, 12);
}

/**
 * Whether a symbol table describes a given film.
 *
 * **Three states, and `unknown` is not a failure.** Every film and sidecar written before this
 * existed lacks a stamp, as does any film remuxed by a tool that dropped its `udta` — and a check
 * that treated "cannot tell" as "wrong" would break every artifact already on disk in order to
 * protect against a case it had no evidence for. So the burden is the right way round: an extraction
 * is refused only on positive evidence that the pair disagrees.
 */
export type RenderMatch =
  | { readonly verdict: "matched"; readonly renderId: string }
  | { readonly verdict: "mismatched"; readonly symbols: string; readonly film: string }
  | { readonly verdict: "unknown"; readonly because: "symbols" | "film" | "both" };

export function matchRender(
  symbols: string | undefined,
  film: string | undefined,
): RenderMatch {
  if (symbols === undefined || film === undefined) {
    return {
      verdict: "unknown",
      because:
        symbols === undefined && film === undefined
          ? "both"
          : symbols === undefined
            ? "symbols"
            : "film",
    };
  }
  return symbols === film
    ? { verdict: "matched", renderId: symbols }
    : { verdict: "mismatched", symbols, film };
}
