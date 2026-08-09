# Quarterly revenue by region, computed from transaction-level rows.
#
# cuecraft runs this during `cuecraft render`. It is handed the input file, an output
# directory, and the box the picture has to fill; it hands back one line saying what it
# wrote. Nothing here is checked in as an image, and nothing here reads a chart.
#
#   in    CUECRAFT_INPUT_TRANSACTIONS   the raw CSV: date, region, product, revenue
#   out   CUECRAFT_OUTPUT_DIR           where to write; also this process's directory
#
# Base R only, deliberately: no packages are installed by the bootstrap, and everything
# below is read.csv, aggregate, xtabs and barplot.

# --- what cuecraft told us -----------------------------------------------------------

source_csv <- Sys.getenv("CUECRAFT_INPUT_TRANSACTIONS")
out_dir <- Sys.getenv("CUECRAFT_OUTPUT_DIR")
if (source_csv == "" || out_dir == "") stop("this program expects to be run by cuecraft")

# The box, and the palette. Received, never chosen: cuecraft owns how a slide looks, and a
# program that picked its own background would be an author setting a colour by other means.
width <- as.integer(Sys.getenv("CUECRAFT_WIDTH"))
height <- as.integer(Sys.getenv("CUECRAFT_HEIGHT"))
point_size <- as.numeric(Sys.getenv("CUECRAFT_POINTSIZE"))
ink <- Sys.getenv("CUECRAFT_BACKGROUND")
paper <- Sys.getenv("CUECRAFT_FOREGROUND")
muted <- Sys.getenv("CUECRAFT_MUTED")
accent <- Sys.getenv("CUECRAFT_ACCENT")

# --- the actual work -----------------------------------------------------------------

tx <- read.csv(source_csv, stringsAsFactors = FALSE)
stopifnot(all(c("date", "region", "product", "revenue") %in% names(tx)))

# The quarter is derived here because it is not in the data. That is the point of the
# example: the CSV is what a system would actually export, one row per transaction, and
# the presentation shows something nobody wrote down.
tx$date <- as.Date(tx$date)
tx$quarter <- paste0("Q", (as.integer(format(tx$date, "%m")) - 1L) %/% 3L + 1L)

totals <- aggregate(revenue ~ quarter + region, data = tx, FUN = sum)
grid_totals <- xtabs(revenue ~ region + quarter, data = totals) / 1000

# Largest region first, so the panels read in the order somebody would ask about them.
grid_totals <- grid_totals[order(rowSums(grid_totals), decreasing = TRUE), , drop = FALSE]

cat(sprintf(
  "%d transactions, %d regions, %d quarters, %.0fk total\n",
  nrow(tx), nrow(grid_totals), ncol(grid_totals), sum(grid_totals)
))

# --- the picture ---------------------------------------------------------------------
#
# Small multiples on a shared scale rather than four coloured series on one axis. Four
# hues would have to come from somewhere, and the only somewhere available is a ramp
# between the two colours cuecraft supplied — which is exactly the palette that cannot be
# told apart at a distance or with any colour vision deficiency. Here identity is carried
# by the panel's own title and magnitude by one accent, so nothing is encoded in hue at
# all, and cross-region comparison stays direct because the y axis is shared.

out_file <- "quarterly-revenue.png"
png(
  file.path(out_dir, out_file),
  width = width, height = height, pointsize = point_size,
  bg = ink, type = "cairo"
)

panels <- nrow(grid_totals)
par(
  mfrow = c(1, panels),
  bg = ink, fg = muted, family = "sans", las = 1,
  col.axis = muted, col.main = paper, col.lab = muted,
  # Room on the left of the first panel for the shared axis, and along the bottom for the
  # quarter labels. `oma` carries the axis title so it is not repeated four times.
  mar = c(3.2, 0.6, 3.0, 0.6), oma = c(1.0, 5.4, 0.2, 0.6)
)

ceiling_k <- max(grid_totals) * 1.14
ticks <- pretty(c(0, max(grid_totals)), n = 4)
ticks <- ticks[ticks <= ceiling_k]

for (i in seq_len(panels)) {
  region <- rownames(grid_totals)[i]
  values <- as.numeric(grid_totals[i, ])

  at <- barplot(
    values,
    plot = FALSE, space = 0.42
  )
  plot.new()
  plot.window(xlim = c(0, max(at) + 0.72), ylim = c(0, ceiling_k), xaxs = "i", yaxs = "i")

  # Gridlines first, so the bars sit on top of them rather than being ruled through.
  abline(h = ticks, col = adjustcolor(muted, alpha.f = 0.16), lwd = 1.5)

  rect(
    at - 0.5, 0, at + 0.5, values,
    col = accent, border = NA
  )

  axis(1, at = at, labels = colnames(grid_totals), tick = FALSE, line = -0.4, cex.axis = 0.92)
  if (i == 1) {
    axis(2, at = ticks, labels = format(ticks, big.mark = ","), tick = FALSE, line = -0.2, cex.axis = 0.92)
  }
  title(main = region, cex.main = 1.15, font.main = 2, line = 0.9)
}

mtext(
  "Revenue, thousands", side = 2, outer = TRUE, line = 3.3,
  col = muted, cex = 0.9, las = 0
)

invisible(dev.off())

# --- what cuecraft takes back ---------------------------------------------------------
#
# stdout describes outputs; the filesystem carries them. Everything else this program
# printed is ordinary diagnostics and is ignored unless the run fails.

cat(sprintf("#cuecraft output png quarterly-revenue %s\n", out_file))
