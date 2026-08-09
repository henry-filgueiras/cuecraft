# Attaching the semantic-exhibit showpiece to README.md

**Pending.** `<!-- VIDEO: pivot -->` in README.md has no attachment yet, and the comment block under
it says so. It is showpiece 7. Everything below is the one manual step that cannot be scripted;
delete this file once the URL is in place.

## Why it is manual

The same reason as the others (`runme/upload-showpieces.md`): MP4s are projections (`decision:1`),
ignored by Git and never committed, and GitHub's Markdown editor is the one place a repository can
carry a video without the video being in the repository.

## Steps

From the repository root:

```bash
# 0. Once, if this machine has no R. Installs it through Homebrew and verifies a headless PNG.
npm run bootstrap:r

# 1. Render. ~55s. Runs both examples/pivot/*.R during the build.
npm run render -- examples/pivot/pivot.yaml -o out/pivot.mp4

# 2. Fit it under GitHub's 10 MB drop limit. Writes out/upload/pivot.mp4.
npm run compress:upload -- out/pivot.mp4 --limit 10
```

Rendered and compressed on 2026-08-09 and already sitting in `out/upload/`, so both steps can be
skipped unless anything in `examples/pivot/` has changed since:

| file to attach         | duration | rendered | attached | crf |
| ---------------------- | -------- | -------- | -------- | --- |
| `out/upload/pivot.mp4` | 2:11.9   | 9.84 MB  | 4.08 MB  | 23  |

3. Open `README.md` on github.com and press the pencil. Make sure you are on the **Edit** tab
   rather than **Preview**. Find:

   ```markdown
   <!-- VIDEO: pivot -->

   <!-- Not yet attached. See runme/upload-pivot.md — ... -->
   ```

4. Drag `out/upload/pivot.mp4` onto the editor **on the blank line under the anchor comment**.
   GitHub uploads it and inserts a bare `https://github.com/user-attachments/assets/…` URL.

5. Delete the second comment block — the "Not yet attached" one. Leave `<!-- VIDEO: pivot -->`: it is
   a durable anchor, not a placeholder, and the others keep theirs.

6. Preview. The new player should sit between "A chart nobody drew" and Self-demo, and should render
   as a `<video controls>` player rather than as a link. If it renders as a link, the file did not
   finish uploading — undo and drop it again.

## What to check in the film before attaching it

Two of the five slides are computed on the far side of a process boundary, so what can silently go
wrong here is different from a deck cuecraft draws end to end. Four checks:

- **Slide 2, around 0:33 to 0:47.** Four sentences each name one bar. On each, exactly one bar
  should be at full brightness and the other fifteen should be dimmed but still readable. Between
  the sentences — and after the last one, around 0:48 — **every bar should be identically bright
  again.** A bar left dim after the narration moved on is the ground-state round trip broken, which
  is the one thing this slide exists to demonstrate.
- **No bar should ever be red.** The program names its bars by drawing them in a sentinel red and
  rewriting its own output; a red bar means a rewrite was missed. The program is supposed to refuse
  rather than ship one, so this should be impossible — check anyway, because it is the failure that
  would look deliberate.
- **Slide 4, around 1:15 to 1:45.** The table starts at rows 1–6. On "West's Cirrus line …" it
  should slide to bring row 12 into view and light it; on "South's Ember line …" it should slide
  again for row 15. **The readout under the table must agree with the rows on screen.** A table that
  moves without the readout following, or a lit row that is not the one the sentence named, is worse
  than no movement at all.
- **The chart on slide 2 should fill its room**, not sit small with air on both sides. If it is
  visibly undersized, the heading has grown to two lines — see `dragon:31`.
