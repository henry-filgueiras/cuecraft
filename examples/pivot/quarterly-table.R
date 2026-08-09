# Quarterly revenue by segment, as a table rather than as a picture.
#
# cuecraft runs this during `cuecraft render`. It is handed the raw transactions and an
# output directory, and it hands back **a CSV**. Nothing here draws anything, and nothing
# here knows what a slide looks like: the picture is cuecraft's problem, and this program's
# only job is to turn 673 transaction rows into the twenty-four rows somebody would actually
# want to look at.
#
#   in    CUECRAFT_INPUT_TRANSACTIONS   the raw CSV: date, region, product, revenue
#   out   CUECRAFT_OUTPUT_DIR           where to write; also this process's directory
#
# That is the whole of the experiment on this side of the boundary. Handing back data rather
# than pixels is *less* work for the program, not more — no device, no palette, no geometry,
# no coordinates to report — and it is cuecraft that gains, because for the first time it can
# read what came back and lay it out itself.
#
# Base R only: read.csv, aggregate, reshape and write.csv.

source_csv <- Sys.getenv("CUECRAFT_INPUT_TRANSACTIONS")
out_dir <- Sys.getenv("CUECRAFT_OUTPUT_DIR")
if (source_csv == "" || out_dir == "") stop("this program expects to be run by cuecraft")

tx <- read.csv(source_csv, stringsAsFactors = FALSE)
stopifnot(all(c("date", "region", "product", "revenue") %in% names(tx)))

# --- derive, group, aggregate, pivot ---------------------------------------------------
#
# The quarter is derived here because it is not in the data — the file is one row per sale,
# which is what a system would actually export. The segment is derived too: the interesting
# unit is a region's line of business, and no column says that either.

tx$date <- as.Date(tx$date)
tx$quarter <- paste0("Q", (as.integer(format(tx$date, "%m")) - 1L) %/% 3L + 1L)
tx$segment <- paste(tx$region, tx$product, sep = " ")

totals <- aggregate(revenue ~ segment + quarter, data = tx, FUN = sum)
wide <- reshape(
  totals,
  idvar = "segment", timevar = "quarter", direction = "wide", sep = "."
)
names(wide) <- sub("^revenue\\.", "", names(wide))

quarters <- c("Q1", "Q2", "Q3", "Q4")
wide <- wide[, c("segment", quarters)]
wide[is.na(wide)] <- 0

# Largest first, so the table reads the way somebody would ask about it — and so that the
# segment the narration has to go and find is genuinely a long way down.
wide <- wide[order(rowSums(wide[, quarters]), decreasing = TRUE), ]

# --- one derived column, in words ------------------------------------------------------
#
# A sentence per row rather than a number, because a table of six numeric columns tells you
# nothing about which rows are worth looking at, and because a column of prose is the honest
# adversarial case for a layout: it is the one that cannot be made to fit.

shape <- function(row) {
  first <- row[["Q1"]]
  last <- row[["Q4"]]
  if (first <= 0) return("started from nothing")
  change <- last / first
  if (change >= 1.5) "grew strongly through every quarter of the year"
  else if (change >= 1.12) "grew steadily"
  else if (change <= 0.66) "fell away sharply after the opening quarter"
  else if (change <= 0.9) "drifted down"
  else "held roughly flat"
}
wide$movement <- vapply(seq_len(nrow(wide)), function(i) shape(wide[i, ]), character(1))

# Formatted here, on the side that knows what the numbers mean. cuecraft receives strings and
# does not parse one: it has no idea these are thousands, and must not acquire one.
for (q in quarters) wide[[q]] <- format(round(wide[[q]]), big.mark = ",", trim = TRUE)

out_file <- "quarterly-segments.csv"
write.csv(wide, file.path(out_dir, out_file), row.names = FALSE)

cat(sprintf("%d transactions in, %d segments out\n", nrow(tx), nrow(wide)))

# --- what cuecraft takes back ----------------------------------------------------------
#
# stdout describes outputs; the filesystem carries them. The only thing that changed from the
# chart is the word `csv`.

cat(sprintf("#cuecraft output csv quarterly-segments %s\n", out_file))
