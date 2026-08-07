# Attaching the SHA-256 showpiece to README.md

**Pending.** `<!-- VIDEO: sha256 -->` in README.md has no attachment yet, and the comment block
under it says so. Everything below is the one manual step that cannot be scripted; delete this
file once the URL is in place.

## Why it is manual

The same reason as the other three (`runme/upload-showpieces.md`): MP4s are projections
(`decision:1`), ignored by Git and never committed, and GitHub's Markdown editor is the one place
a repository can carry a video without the video being in the repository.

## Steps

From the repository root:

```bash
# 1. Render. ~90s, needs the local Kokoro model and Remotion's headless Chrome.
npm run render -- examples/sha256/sha256.yaml -o out/sha256.mp4

# 2. Fit it under GitHub's 10 MB drop limit. Writes out/upload/sha256.mp4.
npm run compress:upload -- out/sha256.mp4 --limit 10
```

3. Open `README.md` on github.com and press the pencil. Find:

   ```markdown
   <!-- VIDEO: sha256 -->

   <!-- Not yet attached. See runme/upload-sha256.md — ... -->
   ```

4. Drag `out/upload/sha256.mp4` onto the editor **on the blank line under the anchor comment**.
   GitHub uploads it and inserts a bare `https://github.com/user-attachments/assets/…` URL.

5. Delete the second comment block — the "Not yet attached" one. Leave `<!-- VIDEO: sha256 -->`:
   it is a durable anchor, not a placeholder, and the other three keep theirs.

6. Preview. The URL should render as a `<video controls>` player, not as a link. If it renders as
   a link, the file did not finish uploading — undo and drop it again.

7. Commit from the web editor with a message naming what changed, then pull.

8. Add the row to the table in `runme/upload-showpieces.md`, and delete this file.

## Checks before uploading

- The compressed copy is what gets dropped, not `out/sha256.mp4` — the master is ~33 MB.
- Watch the compressed copy once at full size. The field of sixty-four is the densest thing in
  any cuecraft artifact and the worst case for h264; if the dormant cell outlines have gone mushy,
  re-run `compress:upload` with a higher `--limit` and check the size still clears 10 MB.
