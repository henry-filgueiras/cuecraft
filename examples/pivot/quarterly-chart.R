# Quarterly revenue by region, as an SVG whose bars know their own names.
#
# The chart in examples/revenue/ is a PNG, and it tells cuecraft where its four panels are with
# a `#cuecraft region` line beside the picture — because a raster cannot carry anything else.
# This one puts the names *inside* the artifact, so cuecraft addresses an element rather than a
# rectangle drawn over one, and can emphasise the bar itself rather than veiling everything else.
#
#   in    CUECRAFT_INPUT_TRANSACTIONS   the raw CSV: date, region, product, revenue
#   out   CUECRAFT_OUTPUT_DIR           where to write; also this process's directory
#
# Base R only, and no protocol beyond the one output line.

source_csv <- Sys.getenv("CUECRAFT_INPUT_TRANSACTIONS")
out_dir <- Sys.getenv("CUECRAFT_OUTPUT_DIR")
if (source_csv == "" || out_dir == "") stop("this program expects to be run by cuecraft")

width <- as.integer(Sys.getenv("CUECRAFT_WIDTH"))
height <- as.integer(Sys.getenv("CUECRAFT_HEIGHT"))
point_size <- as.numeric(Sys.getenv("CUECRAFT_POINTSIZE"))
ink <- Sys.getenv("CUECRAFT_BACKGROUND")
paper <- Sys.getenv("CUECRAFT_FOREGROUND")
muted <- Sys.getenv("CUECRAFT_MUTED")
accent <- Sys.getenv("CUECRAFT_ACCENT")

# --- naming a thing you are about to draw ----------------------------------------------
#
# decision:57's spike found that base R's svg() device emits no ids, no grouping and no <text>,
# and concluded that an SVG could not say which panel was which. That is true of the *device*
# and not of the program. cairo writes one <path> per drawing call with the fill it was given,
# so a call made in a colour nobody else uses is findable in the output afterwards.
#
# So: draw in a sentinel, then rewrite the sentinel into the real colour plus a name. Three
# lines of gsub, no package, and cuecraft learns nothing about geometry — it reads the names out
# of the finished file and has no idea what shape any of them is.
#
# The one rule this imposes on the rest of the program: do not draw anything else in pure red.

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

tx <- read.csv(source_csv, stringsAsFactors = FALSE)
tx$date <- as.Date(tx$date)
tx$quarter <- paste0("Q", (as.integer(format(tx$date, "%m")) - 1L) %/% 3L + 1L)

totals <- aggregate(revenue ~ region + quarter, data = tx, FUN = sum)
grid <- xtabs(revenue ~ region + quarter, data = totals) / 1000
grid <- grid[order(rowSums(grid), decreasing = TRUE), , drop = FALSE]

cat(sprintf("%d transactions, %d regions, %d quarters\n", nrow(tx), nrow(grid), ncol(grid)))

# --- the picture --------------------------------------------------------------------------

out_file <- "quarterly-regions.svg"
svg(
  file.path(out_dir, out_file),
  # cuecraft speaks pixels and svg() speaks inches, so everything crosses through one constant:
  # 96 is what a CSS pixel is, and 72 points is an inch. Both the box and the type size go through
  # it, which is the only way a label ends up the size cuecraft asked for rather than a size that
  # looked about right. The viewBox that comes out is what decides the aspect, and cuecraft fits
  # that into whatever room it turns out to have.
  width = width / 96, height = height / 96, pointsize = point_size * 72 / 96,
  bg = ink
)
par(bg = ink, fg = muted, family = "sans", las = 1,
    col.axis = muted, col.main = paper, col.lab = muted,
    mar = c(3.0, 5.6, 0.6, 0.4))

regions <- rownames(grid)
quarters <- colnames(grid)
ceiling_k <- max(grid) * 1.1
ticks <- pretty(c(0, max(grid)), n = 4)
ticks <- ticks[ticks <= ceiling_k]

plot.new()
plot.window(xlim = c(0, length(regions)), ylim = c(0, ceiling_k), xaxs = "i", yaxs = "i")
abline(h = ticks, col = adjustcolor(muted, alpha.f = 0.16), lwd = 1.5)

pad <- 0.10
slot <- (1 - 2 * pad) / length(quarters)
for (r in seq_along(regions)) {
  for (q in seq_along(quarters)) {
    left <- (r - 1) + pad + (q - 1) * slot
    rect(
      left + slot * 0.10, 0, left + slot * 0.90, grid[r, q],
      col = tag(sprintf("%s-%s", gsub("[^a-z0-9]+", "-", tolower(regions[r])), tolower(quarters[q]))),
      border = NA
    )
  }
}

axis(1, at = seq_along(regions) - 0.5, labels = regions, tick = FALSE, line = -0.6, cex.axis = 1.0)
axis(2, at = ticks, labels = format(ticks, big.mark = ","), tick = FALSE, line = -0.4, cex.axis = 0.92)
mtext("Revenue, thousands", side = 2, line = 3.9, col = muted, cex = 0.9, las = 0)

invisible(dev.off())

declare(file.path(out_dir, out_file), accent)

cat(sprintf("#cuecraft output svg quarterly-regions %s\n", out_file))
