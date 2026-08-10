# Attaching the showpiece to README.md

**Pending.** `<!-- VIDEO: phantom -->` in README.md has no attachment yet, and the comment block
under it says so. It is showpiece 1 — the first video a stranger meets — so this one matters more
than the others. Delete this file once the URL is in place.

## Why it is manual

The same reason as the others (`runme/upload-showpieces.md`): MP4s are projections
(`decision:1`), ignored by Git and never committed, and GitHub's Markdown editor is the one place
a repository can carry a video without the video being in the repository.

## Steps

From the repository root:

```bash
# 0. Once, if this machine has no R or no ffmpeg. Both are needed: ring.R encodes with ffmpeg.
npm run bootstrap:r

# 1. Render. Slow — ring.R simulates two minutes of road and draws every frame of it before a
#    single word is synthesized.
npm run render -- examples/phantom/phantom.yaml -o out/phantom.mp4

# 2. Fit it under GitHub's 10 MB drop limit. Writes out/upload/phantom.mp4.
npm run compress:upload -- out/phantom.mp4 --limit 10
```

Rendered and compressed on 2026-08-09 and already sitting in `out/upload/`, so both steps can be
skipped unless anything in `examples/phantom/` has changed since:

| file to attach           | duration | rendered | attached | crf |
| ------------------------ | -------- | -------- | -------- | --- |
| `out/upload/phantom.mp4` | 3:35.9   | 18.71 MB | 7.70 MB  | 23  |

3. Open `README.md` on github.com and press the pencil. Make sure you are on the **Edit** tab
   rather than **Preview**. Find:

   ```markdown
   <!-- VIDEO: phantom -->

   <!-- Not yet attached. See runme/upload-phantom.md — ... -->
   ```

4. Drag `out/upload/phantom.mp4` onto the editor **on the blank line under the anchor comment**.
   GitHub uploads it and inserts a bare `https://github.com/user-attachments/assets/…` URL.

5. Delete the second comment block — the "Not yet attached" one. Leave `<!-- VIDEO: phantom -->`:
   it is a durable anchor, not a placeholder, and the others keep theirs.

6. Preview. The new player should sit at the very top of Showpieces, above "What happens when you
   tap your card", and should render as a `<video controls>` player rather than as a link. If it
   renders as a link, the file did not finish uploading — undo and drop it again.

## What to check in the film before attaching it

Two of the six slides are computed on the far side of a process boundary, and one of them
**moves**, so what can silently go wrong here is different from every other deck in this
repository. Read it through `out/phantom.symbols.json` rather than by scrubbing:

```bash
node src/cli.ts inspect out/phantom.symbols.json --kind slide
node src/cli.ts snapshots out/phantom.mp4 --kind slide -d out/frames-phantom
```

- **The render's own stdout is the first check.** `model.R` prints the equilibrium speed, when the
  jam arrives, the wave's speed and the closest the cars ever came; `wave.R` prints the stop order
  and refuses outright if the stops did not walk backwards through the cast one car at a time. If
  the equilibrium is not 30.0 km/h, or the closest gap is not comfortably positive, stop — the
  narration is describing a different run from the one on screen.
- **Slide 3, the four holds.** The film freezes four times. On each, the phase word in the film's
  own left-hand panel must agree with the sentence being spoken: `even` while "every gap is the
  same", `a gap closing` while "one gap has closed by fifteen centimetres", `stopped` while "a car
  is at a standstill", `travelling` for the last pair. A freeze that lands one frame late shows
  the _next_ phase word, which reads as a mistake nobody made.
- **The replay comes back.** After "watch it again", the film runs the twelve seconds from the
  closed gap to the standstill more slowly, and must then return to **the frame it was frozen
  on** — not to the end of the replayed stretch, and not to the start of it. Compare the frame
  just before the replay with the frame just after.
- **Slide 5, the three named marks.** Three sentences each name one mark on the drawing. On each,
  that mark should be at full strength and the other two dimmed; between and after them, all three
  should be identically bright again. A mark left dim after the narration moved on is the
  ground-state round trip broken.
- **No mark should ever be red.** `wave.R` names its shapes by drawing them in a sentinel red and
  rewriting its own output, and refuses rather than shipping one that survived. This should be
  impossible — check anyway, because it is the failure that would look deliberate.
- **The y-axis labels on slide 5 are data.** They read `car 10, car 9, … car 1, car 22, … car 11`,
  and the last one is the car directly in front of the first. If that is no longer true, the last
  sentence on that slide is false and the model has moved.
