# Attaching the showpiece videos to README.md

**Done once, kept for the next time.** The three videos are attached and rendering; this file is
the procedure for replacing them after a re-render, not a pending task.

## Why it is manual

The MP4s are projections (`decision:1`): generated media, ignored by Git, never committed. There is
no Git LFS here and no proven convention for pushing large media through `gh`. GitHub's own
Markdown editor accepts a dropped video file, uploads it, and mints a hosted `user-attachments`
URL — which is the one place a repository can carry a video without the video being in the
repository. So the upload is done by hand, in the browser.

## Where each video lives in the README

Each embed is marked by an HTML comment. The comments are **not placeholders any more** — they are
durable anchors saying which video belongs where, and they are invisible when the README renders.
Leave them in place.

```markdown
<!-- VIDEO: observatory -->

https://github.com/user-attachments/assets/4f8e0c9b-57ce-401f-a55f-428eaa08acfc
```

| anchor                               | attached URL ends in | source example               |
| ------------------------------------ | -------------------- | ---------------------------- |
| `<!-- VIDEO: observatory -->`        | `…428eaa08acfc`      | `examples/observatory.yaml`  |
| `<!-- VIDEO: cathedral-v2 -->`       | `…ff533292bc73`      | `examples/cathedral-v2.yaml` |
| `<!-- VIDEO: cuecraft-self-demo -->` | `…ea5e2a3c83a3`      | `examples/cuecraft.yaml`     |

A bare `user-attachments` URL on its own line is what GitHub itself inserts, and GitHub turns it
into a `<video controls>` player. It stays a plain link in any other Markdown renderer, which is
the accepted cost of not hosting the media ourselves.

## Replacing a video after a re-render

Renders are gitignored, so a fresh clone has none of them. From the repository root:

```bash
npm run render -- examples/observatory.yaml  -o out/observatory.mp4
npm run render -- examples/cathedral-v2.yaml -o out/cathedral-v2.mp4
npm run render -- examples/cuecraft.yaml     -o out/cuecraft.mp4
```

Each takes about a minute on an M-series Mac.

**A rendered showpiece is too big to drop into GitHub's Markdown editor.** The limit there is
10 MB and a minute of atlas comes out at 16–17, so compress first — constant quality, roughly half
the size, no visible difference:

```bash
npm run compress:upload -- out/observatory.mp4
npm run compress:upload -- out/cathedral-v2.mp4
npm run compress:upload -- out/cuecraft.mp4
```

**Attach the files in `out/upload/`, never the ones in `out/`.**

| file to attach                | duration | rendered | attached |
| ----------------------------- | -------- | -------- | -------- |
| `out/upload/observatory.mp4`  | 1:17.6   | 16.2 MB  | 7.5 MB   |
| `out/upload/cathedral-v2.mp4` | 1:09.4   | 17.3 MB  | 8.2 MB   |
| `out/upload/cuecraft.mp4`     | 1:45.3   | 7.5 MB   | 2.9 MB   |

Then, per video:

1. Open `README.md` on GitHub and click the **pencil / Edit** button.
2. Make sure you are on the **Edit** tab rather than **Preview**.
3. Find the anchor comment, and **select the URL line beneath it** — that line is what gets
   replaced.
4. With it selected, **drag the matching file from `out/upload/` onto the editor**, or use the
   attach-files control at the bottom of the editing area. GitHub uploads it and writes a new
   `https://github.com/user-attachments/assets/…` URL in place of the selection.
5. Leave the anchor comment and the blank line under it alone.
6. Repeat for the other two.
7. Switch to **Preview**. Three players, in this order: Observatory, Cathedral v2, Self-demo.
8. **Commit changes** to `main`, then pull it back down: `git pull --ff-only`.

If GitHub rejects one on size, its limit has moved: `npm run compress:upload -- out/observatory.mp4
--limit 8` and try again.

## Verifying it worked

The GitHub API renders the README exactly as the page does, so the embeds can be checked without
opening a browser:

```bash
gh api repos/henry-filgueiras/cuecraft/readme \
  -H "Accept: application/vnd.github.html+json" | grep -c "<video"     # expect 3

grep -c "user-attachments" README.md                                   # expect 3
grep -c "VIDEO:" README.md                                             # expect 3
npm run format:check                                                   # GitHub's editor does
                                                                       # not run Prettier
git status --short                                                     # expect clean
```

The last two matter. Committing through GitHub's web editor bypasses local formatting, and the
blank line Prettier wants between the anchor and the URL is harmless — verified against GitHub's
own Markdown renderer, the embed still becomes a `<video>` element either way.

## If GitHub's UI differs from the above

This is written against GitHub's web editor as it behaved in August 2026, and GitHub moves its
buttons. What is durable:

- the video must be uploaded through a GitHub editing surface, so that GitHub hosts it;
- the resulting `user-attachments` URL is generated by that upload and cannot be predicted or
  hand-written;
- the anchor comments mark exactly where each generated URL belongs.

If the drag-and-drop target, the attach control, or the tab labels have moved, use whatever the
current UI offers for attaching a file to Markdown — the outcome is the same. Do not work around a
missing control by committing an MP4 to the repository, adding Git LFS, or pushing media through
`gh`; none of those are conventions this repository has.
