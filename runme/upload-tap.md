# Attaching the card-tap showpiece to README.md

**Pending.** `<!-- VIDEO: tap -->` in README.md has no attachment yet, and the comment block under
it says so. It is showpiece 1 — the first thing a visitor sees — so until this is done the README
opens with a blank. Everything below is the one manual step that cannot be scripted; delete this
file once the URL is in place.

## Why it is manual

The same reason as the others (`runme/upload-showpieces.md`): MP4s are projections
(`decision:1`), ignored by Git and never committed, and GitHub's Markdown editor is the one place a
repository can carry a video without the video being in the repository.

## Steps

From the repository root:

```bash
# 1. Render. ~40s, needs the local Kokoro model and Remotion's headless Chrome.
npm run render -- examples/tap.yaml -o out/tap.mp4

# 2. Fit it under GitHub's 10 MB drop limit. Writes out/upload/tap.mp4.
npm run compress:upload -- out/tap.mp4 --limit 10
```

Rendered and compressed on 2026-08-07 and already sitting in `out/upload/`, so both steps can be
skipped unless `examples/tap.yaml` has changed since:

| file to attach       | duration | rendered | attached | crf |
| -------------------- | -------- | -------- | -------- | --- |
| `out/upload/tap.mp4` | 1:12.6   | 9.43 MB  | 4.20 MB  | 23  |

3. Open `README.md` on github.com and press the pencil. Make sure you are on the **Edit** tab
   rather than **Preview**. Find:

   ```markdown
   <!-- VIDEO: tap -->

   <!-- Not yet attached. See runme/upload-tap.md — ... -->
   ```

4. Drag `out/upload/tap.mp4` onto the editor **on the blank line under the anchor comment**. GitHub
   uploads it and inserts a bare `https://github.com/user-attachments/assets/…` URL.

5. Delete the second comment block — the "Not yet attached" one. Leave `<!-- VIDEO: tap -->`: it is
   a durable anchor, not a placeholder, and the others keep theirs.

6. Preview. Six players, in this order: What happens when you tap your card, Anatomy of an online
   order, SHA-256, Observatory, Cathedral v2, Self-demo. The new URL should render as a
   `<video controls>` player, not as a link. If it renders as a link, the file did not finish
   uploading — undo and drop it again.

## The adversarial film is deliberately not attached

`examples/deploy.yaml` renders to `out/upload/deploy.mp4` (1:53.3, 8.2 MB compressed) and the README
links the _source_ rather than the video. That is on purpose: it exists to stress the automatic
policies, not to be watched by a visitor, and what it demonstrates is written down in
`decision:37` and `dragon:17`. Attach it only if a reviewer asks to see it.
