# When each of the twenty-two cars first came to a standstill, in the order it happened.
#
#   in    CUECRAFT_INPUT_MODEL     examples/phantom/model.R — the same run the film reads
#   out   CUECRAFT_OUTPUT_DIR      where to write; also this process's directory
#
# ## What this answers that the film cannot
#
# The film shows a band of stopped cars sliding backwards. What it does not show — what no
# picture of a moving thing can show, because the eye fills it in — is whether that band is *one*
# disturbance visiting every driver in turn, or several jams forming independently and happening
# to line up.
#
# So this asks each car one question with one answer: when did you first stop? Put in the order
# the answers arrived, they are a staircase, and the staircase is the proof. Every car stopped
# after the car in front of it and before the car behind it, twenty-one times, without a single
# exception and never once in the other direction. The last one to stop is the car directly in
# front of the first, because by then the disturbance had been all the way round.
#
# ## Why this is a drawing rather than a picture
#
# The bars are the subject, so the narration has to be able to reach one. `svg()` writes no ids,
# but cairo writes one path per drawing call in the colour it was given, so a call made in a
# sentinel nobody else uses can be found afterwards and rewritten into a real colour plus a name
# — decision:59, and `examples/pivot/quarterly-chart.R` is where the technique is set out.
#
# Only three bars are named, because only three are spoken about. A name nothing reaches is a
# name that will be wrong later.

model <- Sys.getenv("CUECRAFT_INPUT_MODEL")
out_dir <- Sys.getenv("CUECRAFT_OUTPUT_DIR")
if (model == "" || out_dir == "") stop("this program expects to be run by cuecraft")
source(model)

width <- as.integer(Sys.getenv("CUECRAFT_WIDTH"))
height <- as.integer(Sys.getenv("CUECRAFT_HEIGHT"))
point_size <- as.numeric(Sys.getenv("CUECRAFT_POINTSIZE"))
ink <- Sys.getenv("CUECRAFT_BACKGROUND")
paper <- Sys.getenv("CUECRAFT_FOREGROUND")
muted <- Sys.getenv("CUECRAFT_MUTED")
accent <- Sys.getenv("CUECRAFT_ACCENT")

# --- naming a thing you are about to draw ----------------------------------------------

tags <- character(0)
tag <- function(name) {
  tags[[length(tags) + 1L]] <<- name
  rgb(255, 0, length(tags), maxColorValue = 255)
}

declare <- function(file, fill) {
  svg <- paste(readLines(file, warn = FALSE), collapse = "\n")
  found <- regmatches(svg, gregexpr('fill="rgb\\(100%, 0%, ([0-9.]+)%\\)"', svg, perl = TRUE))[[1]]
  for (attr in unique(found)) {
    index <- round(as.numeric(sub(".*0%, ([0-9.]+)%.*", "\\1", attr)) / 100 * 255)
    svg <- gsub(attr, sprintf('data-cuecraft="%s" fill="%s"', tags[[index]], fill), svg, fixed = TRUE)
  }
  # Nothing may be left over. A sentinel that survived is a bar drawn in bright red on the film,
  # and it is much better to fail the render than to ship that.
  if (grepl("rgb\\(100%, 0%,", svg)) stop("a tagged element was not rewritten")
  writeLines(svg, file)
}

# --- the work ---------------------------------------------------------------------------

run <- run_ring()

# The first standstill per car, and nothing else. `NA` for a car that never stopped, which would
# make the claim this picture exists to support false — so it is a refusal rather than a gap.
first_stop <- apply(run$v, 2, function(speed) {
  i <- which(speed < STANDSTILL)[1]
  if (is.na(i)) NA_real_ else run$t[i]
})
if (anyNA(first_stop)) stop("a car never stopped; the wave did not reach the whole ring")

order_of <- order(first_stop)
after <- first_stop[order_of] - first_stop[order_of[1]]
between <- diff(after)

# The claim, checked rather than asserted. Every car must stop after the one ahead of it, which
# on a ring indexed forwards means the order walks *down* by one each time and wraps.
expected <- (order_of[1] - seq_along(order_of)) %% CARS + 1L
if (!identical(as.integer(order_of), as.integer(expected))) {
  stop("the stops did not walk backwards through the cast one car at a time")
}

cat(sprintf(
  "%d cars stopped in strict order over %.1f s; %.2f s apart on average (%.2f to %.2f)\n",
  CARS, max(after), mean(between), min(between), max(between)
))
cat(sprintf(
  "first was car %d, last was car %d, which is the car directly in front of car %d\n",
  order_of[1], tail(order_of, 1), order_of[1]
))

# --- the picture --------------------------------------------------------------------------

out_file <- "stop-order.svg"
svg(
  file.path(out_dir, out_file),
  # cuecraft speaks pixels and svg() speaks inches, so both the box and the type size cross
  # through 96 CSS pixels to the inch. See examples/pivot/quarterly-chart.R.
  width = width / 96, height = height / 96, pointsize = point_size * 72 / 96,
  bg = ink
)
par(
  bg = ink, fg = muted, family = "sans", las = 1,
  col.axis = muted, col.lab = muted,
  mar = c(3.0, 4.4, 2.0, 1.0)
)

ceiling_s <- max(after) * 1.06
ticks <- pretty(c(0, max(after)), n = 5)
ticks <- ticks[ticks <= ceiling_s]

plot.new()
plot.window(xlim = c(-0.35, ceiling_s), ylim = c(CARS + 0.5, 0.5), xaxs = "i", yaxs = "i")
abline(v = ticks, col = adjustcolor(muted, alpha.f = 0.16), lwd = 1.5)

# A mark per car at the instant it stopped, top to bottom in the order that happened, with a
# faint leader back to the first one so the staircase reads as a run rather than as a scatter.
#
# A dot rather than a bar, and not only because a bar from zero would say "this car was stopped
# for that long", which is a different and false claim: the first car's bar would be zero wide,
# cairo would emit no path for it, and the name would silently fail to attach. A mark for an
# instant is both the honest shape and the one that survives being named.
segments(0, seq_len(CARS), after, seq_len(CARS),
  col = adjustcolor(muted, alpha.f = 0.28), lwd = 2
)

named <- c(1L, 2L, CARS)
names(named) <- c("first", "behind", "last")
for (row in seq_len(CARS)) {
  role <- names(named)[match(row, named)]
  spoken <- !is.na(role)
  points(after[row], row,
    pch = 16, cex = if (spoken) 1.9 else 1.35,
    col = if (spoken) tag(role) else adjustcolor(muted, alpha.f = 0.72)
  )
}

axis(
  1,
  at = ticks, labels = sprintf("%gs", ticks), tick = FALSE,
  line = -0.6, cex.axis = 0.94
)
# Every car labelled, not every other one. At the default size R drops alternate labels when
# they would collide, and the two it drops first are the two the last sentence is about — the car
# that stopped first, and the car directly in front of it that stopped last.
axis(
  2,
  at = seq_len(CARS), labels = sprintf("car %d", order_of), tick = FALSE,
  line = -0.4, cex.axis = 0.62, gap.axis = 0
)
mtext("in the order they stopped", side = 2, line = 3.6, col = muted, cex = 0.88, las = 0)
mtext(
  sprintf("seconds after the first car came to a standstill"),
  side = 1, line = 1.7, col = muted, cex = 0.88, adj = 1
)
mtext(
  sprintf("one car every %.2f seconds, all the way round", mean(between)),
  side = 3, line = 0.4, col = paper, cex = 0.98, adj = 0, font = 2
)

invisible(dev.off())

declare(file.path(out_dir, out_file), accent)

cat(sprintf("#cuecraft output svg stop-order %s\n", out_file))
