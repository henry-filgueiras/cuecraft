import { join } from "node:path";

/**
 * The repository this cuecraft is running from.
 *
 * `src/` and the compiled `dist/` both sit one level below the root, so this resolves
 * correctly whether cuecraft runs from source or from a build.
 *
 * It is the boundary for everything cuecraft reads or writes that is not the presentation
 * itself: the model cache, the render workspace, and — since source-backed specimens — the
 * files a presentation is allowed to quote.
 */
export function repositoryRoot(): string {
  return join(import.meta.dirname, "..");
}
