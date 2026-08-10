# The run, drawn as a film cuecraft can play, and the states it reaches, named.
#
#   in    CUECRAFT_INPUT_MODEL     examples/phantom/model.R — the ring, and what it does
#   out   CUECRAFT_OUTPUT_DIR      where to write; also this process's directory
#         CUECRAFT_WIDTH/HEIGHT/POINTSIZE/FPS and the four colours: the box, from decision:42
#
# Base R for the drawing, ffmpeg for the encode — the same split `examples/kmeans/kmeans.R`
# makes, and decision:5 reaching across the process boundary in the other direction.
#
# ## Why there are two pictures on one clock
#
# A ring alone does not show this. Watched for four seconds a bunched-up loop of cars looks like
# a bunched-up loop of cars, and the one fact worth the whole film — that the cars go one way and
# the jam goes the other — is a fact about *time*, so it cannot appear in any single frame of a
# picture of space.
#
# So the film draws both, side by side, sharing one clock. On the left the ring itself, which is
# where the cars are. On the right the same run with time along the bottom and position up the
# side: every car's trajectory climbs to the right, and the band of stopped cars slides *down*.
# Everything on that panel is going up except the jam. Nothing has to say so.
#
# ## Nothing here decides anything about the run
#
# This program reads `model.R` and draws what it finds. It does not choose the parameters, it
# does not choose where the jam goes, and it may not — every number it puts on screen is measured
# off the recorded run and would change with it.

model <- Sys.getenv("CUECRAFT_INPUT_MODEL")
out_dir <- Sys.getenv("CUECRAFT_OUTPUT_DIR")
if (model == "" || out_dir == "") stop("this program expects to be run by cuecraft")
source(model)

width <- as.integer(Sys.getenv("CUECRAFT_WIDTH"))
height <- as.integer(Sys.getenv("CUECRAFT_HEIGHT"))
point_size <- as.numeric(Sys.getenv("CUECRAFT_POINTSIZE"))
fps <- as.integer(Sys.getenv("CUECRAFT_FPS"))
ink <- Sys.getenv("CUECRAFT_BACKGROUND")
paper <- Sys.getenv("CUECRAFT_FOREGROUND")
muted <- Sys.getenv("CUECRAFT_MUTED")
accent <- Sys.getenv("CUECRAFT_ACCENT")

# How much faster than the road the film runs.
#
# Six, and the number was settled by watching rather than by taste. Two minutes of road is twenty
# seconds of film, which is short enough that the narration can stop it four times without the
# slide outlasting everything else in the deck; and the twelve seconds between the first closed
# gap and the first standstill is two seconds of film, which is short enough that "watch that
# again" is a thing worth asking for and long enough that the replay has something to show.
SPEEDUP <- 6

STOPPED <- 0.5 # m/s — at or below this a car is drawn and counted as stopped

# --- the run ------------------------------------------------------------------------------

if (!uniform_is_fixed()) stop("the even ring is not a fixed point; the model has drifted")

run <- run_ring()
states <- states_of(run)
measured <- measurements_of(run, states)

cat(sprintf(
  "%d cars, %.0f m, equilibrium %.2f km/h, free %.1f km/h\n",
  CARS, TRACK, run$v[1, 1] * 3.6, DESIRED * 3.6
))
cat(sprintf(
  "jam at %.1fs; wave %.1f km/h backwards, one lap %.0fs; closest %.2f m\n",
  measured$stopped_at, measured$wave_kmh, measured$lap_seconds, measured$closest
))

# The film reads the run at its own stride. `seq` rather than arithmetic on indices so the last
# frame is the last recorded step and never one past it.
stride <- max(1L, as.integer(round(SPEEDUP / fps / DT)))
sampled <- seq(1L, nrow(run$x), by = stride)
X <- run$x[sampled, , drop = FALSE]
V <- run$v[sampled, , drop = FALSE]
T <- run$t[sampled]

# Which sampled frame each named state landed on: the first frame at or after it, which is the
# rule cuecraft cuts by, so the frame this program means and the frame cuecraft freezes on are
# the same frame.
frame_of <- vapply(states, function(step) which(sampled >= step)[1], integer(1))

# --- the drawing --------------------------------------------------------------------------

# A frame index as seconds, floored rather than rounded to nearest.
#
# cuecraft cuts at the first frame beginning at or after a moment, which is unforgiving of a
# decimal that overshoots: a moment printed one part in a million long lands the freeze on the
# *next* frame, and at four times real time that is half a second of road. Flooring names the
# frame this program means. `examples/kmeans/kmeans.R` pays the same tax; see dragon:38.
seconds_of <- function(frame) floor((frame - 1L) / fps * 1e6) / 1e6

# The phase word, derived from which named states the run has already passed rather than from a
# schedule. Adding a state to `model.R` puts its word on screen with nothing else changed.
PHASES <- c(even = "even", closing = "a gap closing", stopped = "stopped", wave = "travelling")
phase_at <- function(i) {
  passed <- names(frame_of)[frame_of <= i]
  if (length(passed) == 0) "even" else PHASES[[tail(passed, 1)]]
}

# Slowness, 0 at the instructed speed and 1 at a standstill. The one continuous channel in the
# picture: it sets how solid a car is on the ring and how strongly it marks the diagram, so a car
# that is merely hesitating reads as hesitating rather than as stopped.
slowness <- function(v) pmin(1, pmax(0, (V_TARGET - v) / V_TARGET))

# Ink for a car, from muted at speed to the accent at rest. `colorRamp` rather than alpha alone,
# so a stopped car is a colour rather than a density and stays legible against the plate.
#
# `alpha` is a vector here, which is why the transparency is mixed in rather than handed to
# `adjustcolor` — that one takes a single alpha and quietly refuses a column of them.
tint <- local({
  ramp <- colorRamp(c(muted, accent))
  function(s, alpha = 1) {
    channels <- ramp(pmin(1, pmax(0, s)))
    grDevices::rgb(
      channels[, 1], channels[, 2], channels[, 3],
      alpha = alpha * 255, maxColorValue = 255
    )
  }
})

frames <- character(0)

draw <- function(i) {
  file <- file.path(out_dir, sprintf("frame-%05d.png", i))
  png(file, width = width, height = height, pointsize = point_size, type = "cairo", bg = ink)
  on.exit(invisible(dev.off()), add = TRUE)

  x <- X[i, ]
  v <- V[i, ]
  s <- slowness(v)
  layout(matrix(1:3, nrow = 1), widths = c(0.70, 1.06, 1.74))
  par(bg = ink, fg = muted, family = "sans", las = 1)

  # -- left: what the road is doing --------------------------------------------------------
  par(mar = c(2.2, 1.6, 2.2, 0.4))
  plot.new()
  plot.window(c(0, 1), c(0, 1))
  text(0, 0.96, "22 CARS, 230 METRES", adj = c(0, 1), col = muted, cex = 0.78, font = 2)
  text(0, 0.87, phase_at(i), adj = c(0, 1), col = accent, cex = 1.50, font = 2)
  text(0, 0.755, sprintf("%.0f s on the road", T[i]), adj = c(0, 1), col = paper, cex = 1.02)

  readout <- c(
    sprintf("slowest    %4.1f km/h", min(v) * 3.6),
    sprintf("fastest    %4.1f km/h", max(v) * 3.6),
    sprintf("stopped    %2d of %d", sum(v <= STOPPED), CARS),
    sprintf("tightest    %4.2f m", min(c(x[-1], x[1] + TRACK) - x - CAR_LENGTH))
  )
  for (k in seq_along(readout)) {
    text(0, 0.61 - (k - 1) * 0.078, readout[k],
      adj = c(0, 1), col = muted, cex = 0.88, family = "mono"
    )
  }
  text(0, 0.22, "nobody braked.\nnothing got in the way.",
    adj = c(0, 1), col = adjustcolor(muted, alpha.f = 0.85), cex = 0.86, font = 3
  )

  # -- middle: the ring, from above --------------------------------------------------------
  par(mar = c(1.0, 0.6, 1.6, 0.6))
  plot.new()
  plot.window(c(-1.32, 1.32), c(-1.32, 1.32), asp = 1)
  circle <- seq(0, 2 * pi, length.out = 361)
  for (r in c(0.86, 1.14)) {
    lines(r * cos(circle), r * sin(circle), col = adjustcolor(muted, alpha.f = 0.30), lwd = 3)
  }

  theta <- (x %% TRACK) / TRACK * 2 * pi
  # Cars drawn as short arcs of the road they occupy rather than as dots, so a queue reads as a
  # queue: at a standstill the marks very nearly touch, and in free flow they plainly do not.
  span <- CAR_LENGTH / TRACK * 2 * pi
  for (k in seq_len(CARS)) {
    arc <- seq(theta[k] - span / 2, theta[k] + span / 2, length.out = 8)
    lines(cos(arc), sin(arc), col = tint(s[k]), lwd = 13 + 5 * s[k], lend = 1)
  }
  # Which way the traffic is going, stated once, where it cannot be confused with a car.
  head <- pi / 2
  arrows(1.24 * cos(head - 0.16), 1.24 * sin(head - 0.16),
    1.24 * cos(head + 0.16), 1.24 * sin(head + 0.16),
    length = 0.10, col = muted, lwd = 3
  )
  text(0, 0, "every driver was\nasked for 30 km/h",
    col = adjustcolor(muted, alpha.f = 0.75), cex = 0.92
  )

  # -- right: the same run, against time ---------------------------------------------------
  par(mar = c(3.4, 4.4, 2.2, 0.8))
  plot.new()
  plot.window(c(0, max(T)), c(0, TRACK))
  # Only what has already happened. Drawing the whole run in advance would put the jam on screen
  # before it exists, and the thing being shown is that nobody can see it coming.
  through <- seq_len(i)
  pos <- (X[through, , drop = FALSE]) %% TRACK
  slow <- slowness(V[through, , drop = FALSE])
  ord <- order(slow) # stopped cars drawn last, so the band is never under the free flow
  points(rep(T[through], CARS)[ord], pos[ord],
    pch = 16, cex = 0.34 + 0.42 * slow[ord],
    col = tint(slow[ord], alpha = 0.25 + 0.65 * slow[ord])
  )
  axis(1, tick = FALSE, line = -0.6, cex.axis = 0.86, col.axis = muted)
  axis(2,
    at = seq(0, TRACK, by = 50), tick = FALSE, line = -0.4,
    cex.axis = 0.86, col.axis = muted
  )
  mtext("metres round the ring", side = 2, line = 3.0, col = muted, cex = 0.76, las = 0)
  mtext("seconds", side = 1, line = 1.6, col = muted, cex = 0.76, adj = 1)
  # Which way is forwards, said once on the axis that needs it. Without this the panel is a
  # pattern; with it, every trace climbing while the band descends is the whole argument.
  #
  # Words rather than an arrow glyph: cairo's sans has no U+2191 and draws a replacement box,
  # which is the sort of thing that only shows up once a frame has been extracted and looked at.
  mtext("forwards is up", side = 3, line = 0.1, col = muted, cex = 0.80, adj = 0, font = 2)
  box(col = adjustcolor(muted, alpha.f = 0.22), lwd = 2)

  frames <<- c(frames, file)
}

for (i in seq_along(T)) draw(i)
cat(sprintf("%d frames at %d fps (%.1f s of film, %.0f s of road)\n", length(frames), fps, length(frames) / fps, max(T)))

# --- the encode -------------------------------------------------------------------------
#
# Silent, because cuecraft has one producer of sound and refuses a medium that carries one
# (decision:64). `-an` is the whole of what that costs.

out_file <- "ring.mp4"
status <- system2("ffmpeg", c(
  "-y", "-loglevel", "error",
  "-framerate", fps,
  "-i", shQuote(file.path(out_dir, "frame-%05d.png")),
  "-c:v", "libx264", "-preset", "medium", "-crf", "20",
  "-pix_fmt", "yuv420p", "-an",
  shQuote(file.path(out_dir, out_file))
))
if (status != 0) {
  stop("ffmpeg could not encode the animation; is it installed? (./scripts/bootstrap-r.sh checks)")
}

# The frames were scaffolding, and leaving them behind would put a few hundred megabytes of PNGs
# into a directory cuecraft serves to a browser. Nothing declared is discovered by scanning, so
# they would be invisible weight.
invisible(file.remove(frames))

cat("#cuecraft output video ring", out_file, "\n")
for (name in names(frame_of)) {
  cat(sprintf("#cuecraft moment %s %.6f\n", name, seconds_of(frame_of[[name]])))
}
