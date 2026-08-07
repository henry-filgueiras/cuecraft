# Attaching the online-order showpiece to README.md

**Pending.** `<!-- VIDEO: order -->` in README.md has no attachment yet, and the comment block
under it says so. It is showpiece 1 — the first thing a visitor sees — so until this is done the
README opens with a blank. Everything below is the one manual step that cannot be scripted; delete
this file once the URL is in place.

## Why it is manual

The same reason as the other four (`runme/upload-showpieces.md`): MP4s are projections
(`decision:1`), ignored by Git and never committed, and GitHub's Markdown editor is the one place
a repository can carry a video without the video being in the repository.

## Steps

From the repository root:

```bash
# 1. Render. ~45s, needs the local Kokoro model and Remotion's headless Chrome.
npm run render -- examples/order/order.yaml -o out/order.mp4

# 2. Fit it under GitHub's 10 MB drop limit. Writes out/upload/order.mp4.
npm run compress:upload -- out/order.mp4 --limit 10
```

Rendered and compressed on 2026-08-07 and already sitting in `out/upload/`, so both steps can be
skipped unless `examples/order/` has changed since:

| file to attach         | duration | rendered | attached | crf |
| ---------------------- | -------- | -------- | -------- | --- |
| `out/upload/order.mp4` | 1:38.7   | 15.56 MB | 7.11 MB  | 23  |

3. Open `README.md` on github.com and press the pencil. Make sure you are on the **Edit** tab
   rather than **Preview**. Find:

   ```markdown
   <!-- VIDEO: order -->

   <!-- Not yet attached. See runme/upload-order.md — ... -->
   ```

4. Drag `out/upload/order.mp4` onto the editor **on the blank line under the anchor comment**.
   GitHub uploads it and inserts a bare `https://github.com/user-attachments/assets/…` URL.

5. Delete the second comment block — the "Not yet attached" one. Leave `<!-- VIDEO: order -->`:
   it is a durable anchor, not a placeholder, and the other four keep theirs.

6. Preview. Five players, in this order: Anatomy of an online order, SHA-256, Observatory,
   Cathedral v2, Self-demo. The new URL should render as a `<video controls>` player, not as a
   link. If it renders as a link, the file did not finish uploading — undo and drop it again.

7. Commit from the web editor with a message naming what changed, then `git pull --ff-only`.

8. Fold this into `runme/upload-showpieces.md` — add the row to its table, and correct the counts
   that go stale the moment this lands: its step 7 names three players in order, and its
   verification block expects `3`. Both become five. Then delete this file.

## Checks before uploading

- The compressed copy is what gets dropped, not `out/order.mp4` — the master is 15.56 MB.
- Watch the compressed copy once at full size. It is the easy case for h264 — flat fields, large
  type, one slow camera move — and it came in at 7.11 MB without the encoder having to step the
  quality down at all.

## Verifying it worked

```bash
gh api repos/henry-filgueiras/cuecraft/readme \
  -H "Accept: application/vnd.github.html+json" | grep -c "<video"     # expect 5

grep -c "^https://github.com/user-attachments" README.md               # expect 5
grep -c "VIDEO:" README.md                                             # expect 5
grep -c "Not yet attached" README.md                                   # expect 0
npm run format:check                                                   # GitHub's editor does
                                                                       # not run Prettier
git status --short                                                     # expect clean
```

The formatting check matters. Committing through GitHub's web editor bypasses Prettier, and the
blank line it wants between the anchor and the URL is what the SHA-256 upload dropped on
`3bec79c` — harmless to GitHub's renderer, but `npm run format:check` will fail until it is put
back.
