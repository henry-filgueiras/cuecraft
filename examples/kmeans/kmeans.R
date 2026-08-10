# Lloyd's algorithm on 206 points, animated, as a silent MP4 cuecraft can play.
#
# The first cuecraft exhibit whose evidence is a *computation over time*. A still of the fourth
# pass would throw away the only thing that makes k-means worth showing — that it converges by
# repeating two steps, and that the interesting moment is a state the run reaches.
#
#   in    CUECRAFT_INPUT_POINTS    x,y — the cloud, with obvious-but-not-perfect structure
#   out   CUECRAFT_OUTPUT_DIR      where to write; also this process's directory
#         CUECRAFT_WIDTH/HEIGHT/POINTSIZE/FPS and the four colours: the box, from decision:42
#
# Base R for the mathematics and the drawing; ffmpeg for the encode. That split is decision:5
# reaching across the process boundary in the other direction — cuecraft delegates encoding to
# ffmpeg, and so does anything it runs. No R package is installed for this, and none is needed:
# the loop is fourteen lines of arithmetic and cairo already draws PNGs headlessly.
#
# The loop is written out rather than handed to stats::kmeans() because the *steps* are the
# content. kmeans() returns an answer; this needs the two half-steps of every pass — points taking
# the nearest centre, then centres moving to the middle of what took them — because that
# alternation is the whole idea being explained.
#
# Nothing is encoded in hue. The deck hands this program four colours and three clusters have to
# be told apart within them, so membership is carried by *shape and weight* — the channel
# cuecraft's own attention model uses — and the one accent belongs to the centroids, which are
# what the narration is about.

points_csv <- Sys.getenv("CUECRAFT_INPUT_POINTS")
out_dir <- Sys.getenv("CUECRAFT_OUTPUT_DIR")
if (points_csv == "" || out_dir == "") stop("this program expects to be run by cuecraft")

width <- as.integer(Sys.getenv("CUECRAFT_WIDTH"))
height <- as.integer(Sys.getenv("CUECRAFT_HEIGHT"))
point_size <- as.numeric(Sys.getenv("CUECRAFT_POINTSIZE"))
fps <- as.integer(Sys.getenv("CUECRAFT_FPS"))
ink <- Sys.getenv("CUECRAFT_BACKGROUND")
paper <- Sys.getenv("CUECRAFT_FOREGROUND")
muted <- Sys.getenv("CUECRAFT_MUTED")
accent <- Sys.getenv("CUECRAFT_ACCENT")

K <- 3L
# Forgy initialisation from a fixed seed, and the seed is part of the artifact rather than a
# detail. This one starts two centres inside one blob, so the third pass has a centre crossing the
# sparse middle of the cloud — which is a state worth stopping on and is why this seed and not
# another.
SEED <- 32L

# --- the algorithm ----------------------------------------------------------------------

pts <- as.matrix(read.csv(points_csv))
storage.mode(pts) <- "double"
n <- nrow(pts)

nearest <- function(centres) {
  d <- sapply(seq_len(K), function(k) (pts[, 1] - centres[k, 1])^2 + (pts[, 2] - centres[k, 2])^2)
  max.col(-d, ties.method = "first")
}

recentre <- function(centres, assign) {
  t(sapply(seq_len(K), function(k) {
    if (any(assign == k)) colMeans(pts[assign == k, , drop = FALSE]) else centres[k, ]
  }))
}

scatter <- function(centres, assign) {
  sum((pts[, 1] - centres[assign, 1])^2 + (pts[, 2] - centres[assign, 2])^2)
}

set.seed(SEED)
start <- pts[sample(n, K), , drop = FALSE]

# Every pass recorded before a single frame is drawn: where the centres were, what took them,
# where they went. The animation is then a *reading* of the run rather than a second computation
# of it — the same separation cuecraft makes between compiling a timeline and rendering it.
passes <- list()
centres <- start
repeat {
  assign <- nearest(centres)
  moved <- recentre(centres, assign)
  passes[[length(passes) + 1L]] <- list(
    from = centres,
    assign = assign,
    to = moved,
    travel = max(sqrt(rowSums((moved - centres)^2))),
    fit = scatter(centres, assign)
  )
  settled <- max(abs(moved - centres)) < 1e-9
  centres <- moved
  if (settled || length(passes) >= 20L) break
}
final_fit <- scatter(centres, nearest(centres))
cat(sprintf("%d points, %d clusters, %d passes\n", n, K, length(passes)))

# How many points changed hands going into each pass. Nothing on screen is more legible than this
# number falling to zero, so it is computed rather than described.
switched <- integer(length(passes))
for (i in seq_along(passes)) {
  switched[i] <- if (i == 1L) n else sum(passes[[i]]$assign != passes[[i - 1L]]$assign)
}

# --- the film ---------------------------------------------------------------------------

OPENING <- 22L # the cloud, unlabelled
SEEDING <- 14L # the initial centres arriving
ASSIGN <- 13L # points taking the nearest centre, held
MOVE <- 16L # centres travelling
SETTLED <- 34L # the last state, kept

pad <- 0.55
xlim <- range(pts[, 1]) + c(-pad, pad)
ylim <- range(pts[, 2]) + c(-pad, pad)

# Membership by shape and weight rather than by hue. Solid circle, triangle, square, at three
# strengths of the same light — three greys that are also three silhouettes, so neither channel
# has to carry it alone at the size a slide is watched from.
shapes <- c(19, 17, 15)
tints <- c(paper, muted, adjustcolor(muted, alpha.f = 0.62))

frames <- character(0)

# Every state this film reaches, named, in the film's own seconds — decision:65.
#
# Taken from the frames actually written rather than from the constants above, so the two can never
# disagree: changing ASSIGN or MOVE moves the moments with them. Nothing here knows or could know
# where in a presentation the film will be placed, and there is no absolute timecode anywhere in
# this program or in the deck that plays it.
moments <- numeric(0)
mark <- function(name) {
  moments[[name]] <<- seconds_of(length(frames) - 1L)
}

# A frame index as seconds, rounded **down** rather than to nearest, and it matters.
#
# cuecraft cuts a film at the first frame that begins at or after a moment, which is the right rule
# for an instant and is unforgiving of a decimal that overshoots. Frame 122 at 30fps is 4.0666...s;
# printed to four places as `4.0667` it is 122.001 frames, and the freeze lands one frame into the
# *next* pass — where the panel says "pass 4" while the narration says "the third". Rounding down
# names the frame this program means. See the dragon this opened.
seconds_of <- function(frame) floor(frame / fps * 1e6) / 1e6

draw <- function(centres, assign, pass, phase, fit_through, travelling = NA) {
  file <- file.path(out_dir, sprintf("frame-%04d.png", length(frames) + 1L))
  png(file, width = width, height = height, pointsize = point_size, type = "cairo", bg = ink)
  on.exit(invisible(dev.off()), add = TRUE)

  layout(matrix(1:3, nrow = 1), widths = c(1.10, 1.15, 0.92))
  par(bg = ink, fg = muted, family = "sans", las = 1, col.axis = muted, col.lab = muted)

  # -- left: where the run has got to ----------------------------------------------------
  par(mar = c(2.4, 2.0, 2.4, 0.6))
  plot.new()
  plot.window(c(0, 1), c(0, 1))
  text(0, 0.93, "K-MEANS", adj = c(0, 1), col = muted, cex = 0.86, font = 2)
  text(0, 0.80, phase, adj = c(0, 1), col = accent, cex = 1.62, font = 2)
  if (!is.na(pass)) {
    text(0, 0.62, sprintf("pass %d of %d", pass, length(passes)),
      adj = c(0, 1), col = paper, cex = 1.14
    )
  }
  if (!is.na(travelling)) {
    text(0, 0.48, sprintf("%d points changed", travelling),
      adj = c(0, 1), col = muted, cex = 0.98
    )
  }
  if (!is.null(assign)) {
    sizes <- tabulate(assign, K)
    for (k in seq_len(K)) {
      y <- 0.30 - (k - 1) * 0.095
      points(0.035, y, pch = shapes[k], col = tints[k], cex = 1.15)
      text(0.11, y, sprintf("%d points", sizes[k]), adj = c(0, 0.5), col = muted, cex = 0.92)
    }
  }

  # -- centre: the cloud, the assignment, and the centres ---------------------------------
  par(mar = c(1.2, 1.2, 1.6, 1.2))
  plot.new()
  plot.window(xlim, ylim, asp = 1)
  if (!is.null(assign)) {
    # A faint spoke from every point to whatever centre currently owns it. Three sprays are
    # readable as three clusters from across a room in a way that three greys alone are not, and
    # when a point changes hands its spoke swings, which is the event being animated.
    segments(pts[, 1], pts[, 2], centres[assign, 1], centres[assign, 2],
      col = adjustcolor(muted, alpha.f = 0.13), lwd = 2
    )
    points(pts[, 1], pts[, 2], pch = shapes[assign], col = tints[assign], cex = 0.78)
  } else {
    points(pts[, 1], pts[, 2], pch = 1, col = adjustcolor(muted, alpha.f = 0.75), cex = 0.78, lwd = 2)
  }
  if (!is.null(centres)) {
    # The trail: every place a centre has already been, so a pass that moves a long way says so
    # after it has finished moving.
    for (k in seq_len(K)) {
      seen <- do.call(rbind, lapply(passes[seq_len(max(0L, (if (is.na(pass)) 0L else pass) - 1L))],
        function(p) p$from[k, ]
      ))
      if (!is.null(seen) && nrow(seen) > 1) {
        lines(rbind(seen, centres[k, ]),
          col = adjustcolor(accent, alpha.f = 0.55), lwd = 5, lty = 2
        )
      }
      points(centres[k, 1], centres[k, 2], pch = 21, bg = accent, col = ink, cex = 2.3, lwd = 4)
    }
  }
  box(col = adjustcolor(muted, alpha.f = 0.22), lwd = 2)

  # -- right: how far the fit still has to fall ------------------------------------------
  par(mar = c(3.4, 4.6, 2.4, 0.8))
  fits <- c(sapply(passes, function(p) p$fit), final_fit)
  plot.new()
  plot.window(c(0.5, length(fits) + 0.5), c(0, max(fits) * 1.10))
  # Only what has actually happened. Drawing the whole series in advance would put the answer on
  # screen from the first frame, and the thing being shown is that nobody knows it yet.
  through <- seq_len(fit_through)
  if (length(through) > 0) {
    segments(through, 0, through, fits[through], col = accent, lwd = 20, lend = 1)
  }
  abline(h = 0, col = adjustcolor(muted, alpha.f = 0.28), lwd = 3)
  axis(1,
    at = seq_along(fits), labels = c(seq_along(passes), ""),
    tick = FALSE, line = -0.8, cex.axis = 0.86
  )
  mtext("scatter within clusters", side = 3, line = 0.2, col = muted, cex = 0.78, adj = 0)

  frames <<- c(frames, file)
}

blend <- function(a, b, t) a + (b - a) * t
ease <- function(t) t * t * (3 - 2 * t)

for (i in seq_len(OPENING)) draw(NULL, NULL, NA, "the cloud", 0)
for (i in seq_len(SEEDING)) draw(start, NULL, NA, "three guesses", 0)
mark("initialised")

for (p in seq_along(passes)) {
  step <- passes[[p]]
  for (i in seq_len(ASSIGN)) {
    draw(step$from, step$assign, p, "assign", p - 1L, switched[p])
  }
  for (i in seq_len(MOVE)) {
    at <- ease(i / MOVE)
    draw(blend(step$from, step$to, at), step$assign, p, "move", p, switched[p])
  }
  # The settled state of this pass, on the last frame it is fully drawn. A deck that holds here
  # freezes on a completed pass rather than midway through the next one's recolouring.
  mark(if (p == length(passes)) "converged" else sprintf("pass-%d", p))
}

last <- passes[[length(passes)]]
for (i in seq_len(SETTLED)) {
  draw(last$to, last$assign, length(passes), "converged", length(passes) + 1L, 0L)
}

cat(sprintf("%d frames at %d fps\n", length(frames), fps))

# --- the encode -------------------------------------------------------------------------
#
# Silent, deliberately: cuecraft has one producer of sound and refuses a medium that carries one
# (decision:64). `-an` is the whole of what that costs.

out_file <- "kmeans.mp4"
status <- system2("ffmpeg", c(
  "-y", "-loglevel", "error",
  "-framerate", fps,
  "-i", shQuote(file.path(out_dir, "frame-%04d.png")),
  "-c:v", "libx264", "-preset", "medium", "-crf", "20",
  "-pix_fmt", "yuv420p", "-an",
  shQuote(file.path(out_dir, out_file))
))
if (status != 0) {
  stop("ffmpeg could not encode the animation; is it installed? (./scripts/bootstrap-r.sh checks)")
}

# The frames were scaffolding. Leaving them behind would put a quarter of a gigabyte of PNGs into
# the render workspace's public directory, which is a projection cuecraft has to serve to a
# browser — and nothing declared is ever discovered by scanning, so they would be invisible weight.
invisible(file.remove(frames))

cat("#cuecraft output video kmeans", out_file, "\n")
for (name in names(moments)) {
  cat(sprintf("#cuecraft moment %s %.6f\n", name, moments[[name]]))
}
