# Attaching the R-exhibit showpiece to README.md

**Pending.** `<!-- VIDEO: revenue -->` in README.md has no attachment yet, and the comment block
under it says so. It is showpiece 6. Everything below is the one manual step that cannot be
scripted; delete this file once the URL is in place.

## Why it is manual

The same reason as the others (`runme/upload-showpieces.md`): MP4s are projections
(`decision:1`), ignored by Git and never committed, and GitHub's Markdown editor is the one place a
repository can carry a video without the video being in the repository.

## Steps

From the repository root:

```bash
# 0. Once, if this machine has no R. Installs it through Homebrew and verifies a headless PNG.
npm run bootstrap:r

# 1. Render. ~40s. Runs examples/revenue/quarterly-revenue.R during the build.
npm run render -- examples/revenue/revenue.yaml -o out/revenue.mp4

# 2. Fit it under GitHub's 10 MB drop limit. Writes out/upload/revenue.mp4.
npm run compress:upload -- out/revenue.mp4 --limit 10
```

Rendered and compressed on 2026-08-09 and already sitting in `out/upload/`, so both steps can be
skipped unless anything in `examples/revenue/` has changed since:

| file to attach           | duration | rendered | attached | crf |
| ------------------------ | -------- | -------- | -------- | --- |
| `out/upload/revenue.mp4` | 1:25.6   | 6.05 MB  | 2.42 MB  | 23  |

3. Open `README.md` on github.com and press the pencil. Make sure you are on the **Edit** tab
   rather than **Preview**. Find:

   ```markdown
   <!-- VIDEO: revenue -->

   <!-- Not yet attached. See runme/upload-revenue.md — ... -->
   ```

4. Drag `out/upload/revenue.mp4` onto the editor **on the blank line under the anchor comment**.
   GitHub uploads it and inserts a bare `https://github.com/user-attachments/assets/…` URL.

5. Delete the second comment block — the "Not yet attached" one. Leave `<!-- VIDEO: revenue -->`: it
   is a durable anchor, not a placeholder, and the others keep theirs.

6. Preview. The new player should sit between Cathedral v2 and Self-demo, and should render as a
   `<video controls>` player rather than as a link. If it renders as a link, the file did not finish
   uploading — undo and drop it again.

## What to check in the film before attaching it

This is the one showpiece whose picture is not drawn by cuecraft, so the thing that can silently go
wrong is different from every other deck: the chart can be **stale or wrong** rather than
mispositioned. Two checks, both quick:

- The fourth slide's chart should show four panels, largest region first, with Asia Pacific rising
  across its four quarters and Latin America flat. That is what the shipped CSV actually contains,
  and `src/examples.test.ts` fails if it stops being true.
- `rm -rf .cuecraft/renders/revenue` and render again. The chart must come back identical. If it
  does not come back at all, the R bootstrap did not take.
