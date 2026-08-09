---
id: spr_01KZKNE2VBP4FK8GVSTT50E27Z
sequence: 25
kind: sprint
status: closed
created: 2026-08-09
closed: 2026-08-09
---

# Hand a computation to R, and show what came back

## Goal

Let a presentation delegate one computation to R during its own materialization, and show what
came back — so that a slide can carry evidence cuecraft did not draw and could not have drawn.

## Rationale

Every body cuecraft has is something it can *read*: a list, a specimen, a diff, a graph, an
exchange, a machine, its own compilation facts. Each one is understood well enough that the
compiler chooses the composition, the size, the colour and the timing from it. That is the whole
of decision:10 and it is why there is no `layout:` key.

There is a class of content that will never be readable that way, and a quarterly revenue chart is
the cheapest honest example of it. The work that produces one — read transaction rows, derive the
quarter, group by quarter and region, sum — is not a shape a presentation format should learn. It
is a shape a *statistical environment* already knows, and R has known it for thirty years.

So the question this round exists to answer is not "can cuecraft draw a bar chart". It is: **can
cuecraft hand a computation to a foreign environment and accept the result as content, without
that becoming a second authoring surface?** The failure mode is obvious and is what the non-goals
below defend against — an escape hatch that starts as "run this program" and ends as a build
system, a language runtime abstraction, and a way to check a PNG into `examples/`.

The design constraint that makes this cuecraft-shaped rather than generic: **an exhibit is a
projection, exactly as narration audio is.** There is deliberately no way to write
`image: chart.png` against a file in the checkout. A deck that could display a checked-in image
could display a *stale* one, and decision:18 already refuses that for source. The only way to get
pixels onto a cuecraft frame is to say what computes them.

## Success criteria

- A slide can carry an `exhibit:` body naming an R program and its inputs, and nothing else — no
  size, no position, no colour, no format, no output filename.
- `cuecraft render` on the demo deck runs R during materialization and produces an MP4 whose chart
  was computed from `examples/revenue/transactions.csv` on that run.
- Deleting the generated PNG and re-rendering produces the same film. Deleting the CSV fails the
  render with a diagnostic that names the file.
- Editing the CSV changes the chart, with no other edit anywhere.
- The R program is handed the box it must fill — pixel dimensions and the deck's own palette — so
  the plot is native rather than a white rectangle pasted on. An author receives the palette; they
  do not choose it (decision:42's rule, applied across a process boundary).
- The runner reports a failing R program with enough context to fix it: the program, the exit
  status, and R's own stderr.
- Unit tests cover manifest parsing, path validation and diagnostics with no R installed. Tests
  that need R are a separate suffix and a separate npm script, as Kokoro's and Remotion's are.
- `./scripts/bootstrap-r.sh` takes this machine from no R to a verified `Rscript`, is idempotent,
  and fails actionably when it cannot proceed.
- `npm run check` and `scarp doctor` pass.

## Non-goals

- **No polyglot runtime abstraction.** There is one runner, it runs R, and it is named for R. No
  language registry, no plugin interface, no `runtime:` key. The seam is that the module is small
  enough to copy, not that it is parameterised.
- **No caching.** Correct invalidation over source, inputs, R version and installed packages is a
  build-system problem, and a deck that runs one `aggregate()` has not earned it.
- **No checked-in presentation media.** No `image:` key, no PNG in `examples/`, no way to point a
  slide at a file that was not computed on this run. This is the thesis, not a convenience.
- **No R package ecosystem.** Base R, or the round records why not. No `install.packages` in the
  bootstrap, no DESCRIPTION file, no renv.
- **No general image layout.** One archetype, contained, centred, aspect preserved. No crop, no
  fit mode, no caption key, no gallery, no second image on a slide.
- **No SVG, no PDF, no animation.** PNG is the format the round proves; a second one needs a
  reason a first one did not supply.
- **No new anchoring.** An exhibit declares no elements narration can reach, exactly as a figure
  declares none. Timing is untouched.
- **Not a data pipeline.** cuecraft does not read the CSV, does not know what a quarter is, and
  must not acquire an opinion about either.

## Outcome

**A cuecraft presentation can hand a computation to R and put the result on a slide, and it cannot
put anything else there.** `out/revenue.mp4` is 1:25.6 of it: 468 transaction rows in, a chart
computed in 0.2 seconds during the render, and narration that says so truthfully.

The whole vocabulary is two keys:

    exhibit:
      run: examples/revenue/quarterly-revenue.R
      with:
        transactions: examples/revenue/transactions.csv

### The refusal did more work than the feature

The round's real design move was not adding a way to show a picture. It was **refusing to add
`image:`**. Every other shape this could have taken — a path to a PNG, an optional cached artifact,
a "use this if the program fails" fallback — reintroduces the possibility of a slide displaying
something stale, which is exactly what decision:18 refuses for quoted source. Because there is no
such key, "this chart was computed from the source data while the video was being built" is
*structurally* true rather than asserted, and the four ways it could be false were each checked:
delete the projection and it comes back; run twice and it is byte-identical; edit one CSV row and
the bar moves; a test fails if an image ever appears in `examples/revenue/`.

That refusal also protected the thesis in a place it could easily have leaked. An exhibit is a
rectangle of pixels, and a program that chose its own background would be an author setting a colour
by other means. So the program is **handed** the box and the palette through its environment and
there is no key that could override one — decision:42 reaching across a process boundary
(decision:55).

### stdout describes outputs; the filesystem carries them

The protocol is one line, `#cuecraft output png <name> <file>`, with the file named relative to a
directory the runner chose and emptied (decision:56). Two consequences fell out of that single
choice rather than being designed:

- **Path safety became arithmetic.** Not a policy with options — `relative(dir, path)` not starting
  with `..`. Absolute paths, `../escape.png` and `figures/../../elsewhere.png` are one refusal.
- **Base R was enough.** A program declares an output with one `cat()`. Requiring JSON would have
  made `jsonlite` a prerequisite of the first R program, and reserving a prefix instead of owning
  the stream is what keeps `print()` and `message()` working the way an R programmer expects.

### Against the success criteria

Met: two keys and nothing else; the demo renders with the chart computed on that run; deleting the
projection reproduces it and deleting the CSV fails with the file named; editing the CSV changes the
chart and nothing else; the program receives the box and the palette; a failing program reports the
program, the exit status and R's stderr; unit tests run with no R and R tests are a separate suffix
and script; `./scripts/bootstrap-r.sh` took this machine from no R to a verified headless PNG and is
idempotent; `npm run check` (725) and `scarp doctor` pass.

### What the artifact corrected

**The first composition sized the chart at seventy percent of its room, and only a rendered frame
said so.** The program had been given the box measured *without* a subtitle band; the deck has
subtitles; the band eats the bottom of the frame. Both halves were wrong — the composition now fills
the room it actually has, and `EXHIBIT` is measured against the subtitled case so the program draws
for the smaller of the two rooms. What survives is dragon:31: the box an exhibit is drawn for is
settled two stages before the room it lands in is known, and the ordering that causes it was chosen
(so a broken program costs no Kokoro time) rather than forced.

**Writing the tests changed the code twice.** `resolveOutputs` was extracted and exported because
the refusals were unreachable from a machine with no R — which is also the better factoring. And the
directory-refusal test failed on its first run, because that refusal was being raised inside the
`try` that catches "does not exist" and reported as a different mistake.

**The chart's form was decided by the palette.** Four coloured series would need four hues from a
ramp between the two colours cuecraft supplies, and that ramp is indistinguishable at a distance or
with any colour vision deficiency. Small multiples on a shared scale carry identity in the panel
title and magnitude in the one accent, so nothing is encoded in hue — which is the discipline
`theme.ts` already states for specimens, arrived at independently.

### What was refused and stayed refused

No polyglot runtime abstraction: one module, named for R, small enough to copy — a second
environment is parked as idea:23 and would be a *copy*, not a strategy object. No caching (idea:22),
because wrong invalidation shows a stale picture that looks entirely right. No checked-in
presentation media, enforced by a test. No R packages: base R throughout, and the bootstrap installs
none. No general image layout: one archetype, contained, centred, no fit mode, no caption key, no
second image. No SVG. No new anchoring — an exhibit declares nothing narration can reach, and
timing is untouched. Cuecraft still does not read the CSV and has no opinion about what a quarter is.

### What this cost, honestly

Compiling a deck with an exhibit **executes code from that deck**. Paths stay contained — the
program and every input must be inside the checkout — but a `.R` file in the checkout is a program,
and rendering somebody else's deck now runs it. That is a real widening of what `cuecraft render`
means and it is written into decision:55 rather than buried.

A deck with an exhibit is also **reproducible only up to whatever R is installed** (dragon:33). The
Kokoro weights are pinned by revision and SHA-256; R is whatever `brew install r` resolved to. And
narration cannot reach inside a computed picture, which is the first place the format's central
mechanism does not apply at all rather than merely applying coarsely (dragon:32).
