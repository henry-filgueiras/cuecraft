# Twenty-two cars on a 230-metre ring, and the jam that arrives without a cause.
#
# This file is the *model*, and it is declared as an input to both programs that use it —
# `ring.R`, which draws the run as a film, and `wave.R`, which draws where the jam went. Neither
# of them re-derives it. An exhibit's `with:` is "the files this program may read" and says
# nothing about what kind of file that is, so one definition of the run can be handed to two
# programs without cuecraft learning a word (decision:55, decision:56).
#
# Sourced, never run directly. It defines and measures; it draws nothing and prints nothing.
#
# ## What is being reproduced
#
# Sugiyama et al., "Traffic jams without bottlenecks — experimental evidence for the physical
# mechanism of the formation of a jam", New J. Phys. 10 (2008) 033001. Twenty-two vehicles on a
# 230 m single-lane circuit, every driver asked to hold about 30 km/h and to follow safely. There
# is no bottleneck, no signal, no lane change and no instruction to brake. Within a couple of
# minutes a car comes to a complete stop, and the stop then travels *backwards* around the
# circuit at roughly 20 km/h while every car in it continues forwards.
#
# ## The model, and why this one
#
# The Intelligent Driver Model (Treiber, Hennecke & Helbing, Phys. Rev. E 62 (2000) 1805):
#
#     dv/dt = a [ 1 - (v/v0)^4 - (s*(v, dv) / s)^2 ]
#     s*    = s0 + max(0, v T + v dv / (2 sqrt(a b)))
#
# with `s` the bumper-to-bumper gap and `dv` the closing rate. Two other candidates were tried
# first and both were rejected by measurement rather than by taste:
#
#   optimal-velocity (Bando 1995)   unstable at this density, and cars pass through each other.
#                                   Overlap of nearly two metres at the parameters that produce a
#                                   jam in a watchable time. A film of a phantom traffic jam whose
#                                   cars collide is not evidence of anything.
#   full-velocity-difference        collision-free, and stable. The term that stops the crashes is
#     (Jiang 2001)                  the term that damps the instability; every setting that kept
#                                   the cars apart also kept the ring uniform for 400 seconds.
#
# IDM cannot produce a collision — `(s*/s)^2` diverges as the gap closes — so the safety is
# structural rather than tuned. What it also cannot produce, on its own, is this instability:
# swept across `a`, `b`, `T` and `v0`, an undelayed IDM at this density stays uniform.
#
# ## The delay is the mechanism, not a parameter
#
# Each driver responds to the road as it was TAU seconds ago. That single change is what makes
# the uniform ring unstable, and it is the honest statement of why the phenomenon exists: not
# that somebody braked, but that everybody reacted late. TAU = 0.5 s is at the fast end of
# measured driver reaction times, which is the conservative choice — a slower, more human driver
# makes the jam arrive sooner and harder, and at 0.7 s and above the cars begin to overlap.
#
# ## What is fixed, and what falls out
#
# `V_TARGET` is what the drivers were told: 30 km/h. `DESIRED` — the speed they would choose on
# an empty road — is *solved* from it, so the equilibrium ring runs at exactly the instructed
# speed rather than near it. Nothing here is fitted to make the film work: the run is recorded
# first, and every number the deck says out loud is measured off it afterwards.
#
# The one number that was chosen for the film is `NUDGE`, and it is chosen along an axis that
# does not touch the physics. The instability's growth is exponential, so a smaller perturbation
# only delays the jam — across two orders of magnitude of `NUDGE` the wave's speed, the closest
# the cars ever come, and the single-cluster shape of the result are all unchanged, and only the
# clock moves. Ten centimetres puts the first standstill about thirty-six seconds in, which is
# long enough that a viewer has time to believe nothing is going to happen.

TRACK <- 230 # metres, one lane, a closed loop
CARS <- 22L # vehicles
CAR_LENGTH <- 4.5 # metres, bumper to bumper

V_TARGET <- 30 / 3.6 # m/s — "hold about thirty kilometres an hour"
HEADWAY <- 0.22 # s — desired time gap to the car in front
MIN_GAP <- 3.0 # m — bumper-to-bumper gap at a standstill
ACCEL <- 2.5 # m/s^2 — maximum acceleration
BRAKE <- 1.8 # m/s^2 — comfortable deceleration
TAU <- 0.5 # s — reaction delay: what the driver is responding to is this old
DELTA <- 4 # IDM's acceleration exponent, as published

NUDGE <- 0.10 # m — how far one car starts from where it should be, and the only asymmetry

# What counts as a standstill, and why it is this number rather than a rounder one.
#
# Anything below this prints as 0.0 km/h at the one decimal place the film's readout shows. That
# matters because the narration says "a car is at a standstill" over a frozen frame, and a panel
# reading 1.0 km/h beside that sentence is the deck contradicting the picture in the only place a
# viewer is looking. The threshold is the display's, not a judgement.
STANDSTILL <- 0.1 # m/s

DT <- 0.01 # s — integration step
DURATION <- 120 # s — the jam forms in the first forty and travels for the rest

SPACING <- TRACK / CARS # m, centre to centre
EQUILIBRIUM_GAP <- SPACING - CAR_LENGTH # m, bumper to bumper

# The desired speed that makes the uniform ring settle at exactly V_TARGET.
#
# Inverting IDM's equilibrium condition rather than searching for it: at a steady gap the
# bracket is zero, so (v/v0)^4 = 1 - ((s0 + vT)/s)^2 and v0 follows. It is finite only while
# s0 + v T < s — a driver who wants more room at this speed than the ring has cannot be given a
# desired speed that fixes it, which is a real statement about the density and not an edge case
# to guard.
DESIRED <- local({
  wanted <- MIN_GAP + V_TARGET * HEADWAY
  if (wanted >= EQUILIBRIUM_GAP) {
    stop("this density cannot hold V_TARGET at this headway; the ring is over capacity")
  }
  V_TARGET / (1 - (wanted / EQUILIBRIUM_GAP)^2)^(1 / DELTA)
})

# --- the run ------------------------------------------------------------------------------

#' One recording of the ring.
#'
#' `nudge` displaces a single car backwards from perfect uniformity, in metres, and is the only
#' asymmetry in the whole system. At `nudge = 0` the uniform ring is an exact fixed point —
#' `uniform_is_fixed()` checks that analytically — so everything the film shows is the
#' instability acting on ten centimetres, and none of it is the initial condition.
#'
#' Positions are cumulative rather than wrapped: a car at 245 m has gone once round and is 15 m
#' along. Wrapping is a drawing concern and belongs to whoever draws, not to the arithmetic.
run_ring <- function(nudge = NUDGE, duration = DURATION) {
  steps <- as.integer(round(duration / DT))
  lag <- as.integer(round(TAU / DT))

  x <- (seq_len(CARS) - 1) * SPACING
  x[1] <- x[1] - nudge
  v <- rep(V_TARGET, CARS)

  # The delay line, primed with the state the drivers would have seen had the ring always been
  # uniform. A ring-buffer rather than a growing history: constant memory, and the read and the
  # write are the same slot, which is what makes "TAU seconds ago" exact rather than nearly.
  past_x <- matrix(rep((seq_len(CARS) - 1) * SPACING, each = lag), lag, CARS)
  past_v <- matrix(V_TARGET, lag, CARS)
  slot <- 1L

  X <- matrix(0, steps, CARS)
  V <- matrix(0, steps, CARS)
  closest <- Inf

  for (i in seq_len(steps)) {
    X[i, ] <- x
    V[i, ] <- v
    closest <- min(closest, min(c(x[-1], x[1] + TRACK) - x - CAR_LENGTH))

    seen_x <- past_x[slot, ]
    seen_v <- past_v[slot, ]
    gap <- c(seen_x[-1], seen_x[1] + TRACK) - seen_x - CAR_LENGTH
    closing <- seen_v - c(seen_v[-1], seen_v[1])

    wanted <- MIN_GAP + pmax(0, seen_v * HEADWAY + seen_v * closing / (2 * sqrt(ACCEL * BRAKE)))
    accel <- ACCEL * (1 - (v / DESIRED)^DELTA - (wanted / pmax(gap, 0.05))^2)

    v <- pmax(0, v + DT * accel)
    x <- x + DT * v

    past_x[slot, ] <- x
    past_v[slot, ] <- v
    slot <- slot %% lag + 1L
  }

  list(
    t = (seq_len(steps) - 1) * DT,
    x = X,
    v = V,
    gap = closest
  )
}

#' Whether the perfectly even ring is a fixed point of the model.
#'
#' The control, and it is analytic rather than a long simulation on purpose.
#'
#' A simulated control would be the wrong test and would eventually give the wrong answer. The
#' uniform ring is a fixed point *and it is unstable*, which is the entire subject — so in
#' floating point the last-bit asymmetry of the wrap (car 22 looks at `x[1] + TRACK`, and nobody
#' else adds anything) is itself a perturbation, and given long enough it grows into a jam of its
#' own. Running the even ring for five minutes and watching it hold proves nothing except that
#' five minutes was short.
#'
#' What can be checked exactly is the thing that actually matters: at even spacing and the
#' equilibrium speed, every car's acceleration is zero. Nothing is pushing. Whatever the film
#' shows was put there by `NUDGE`.
uniform_is_fixed <- function() {
  gap <- rep(EQUILIBRIUM_GAP, CARS)
  speed <- rep(V_TARGET, CARS)
  wanted <- MIN_GAP + speed * HEADWAY # no closing rate: every car matches the one ahead
  accel <- ACCEL * (1 - (speed / DESIRED)^DELTA - (wanted / gap)^2)
  max(abs(accel)) < 1e-12
}

#' Whether the jam is the perturbation's doing rather than the arithmetic's.
#'
#' The companion to the fixed-point check, and the one that puts a number on "given long enough".
#'
#' Returns how many times sooner the nudged ring loses its uniformity than a ring nudged by
#' nothing at all, where the only seed is the wrap's last-bit asymmetry. The control is run well
#' past the film's own length so the answer is a measurement rather than a floor: stopping it at
#' `DURATION` would report "at least 3.9" and read like a result. Below about five, the film is
#' partly a picture of rounding error and the run is not fit to show.
nudge_dominance <- function(patience = 900) {
  onset <- function(nudge) {
    run <- run_ring(nudge = nudge, duration = patience)
    spread <- apply(run$v, 1, function(row) max(row) - min(row))
    i <- which(spread > 1)[1]
    if (is.na(i)) {
      return(NA_real_)
    }
    run$t[i]
  }
  noise <- onset(0)
  if (is.na(noise)) {
    return(Inf)
  } # never went at all, in fifteen minutes
  noise / onset(NUDGE)
}

# --- what the run reaches -------------------------------------------------------------------

#' The four states worth stopping on, in seconds of the run.
#'
#' Thresholds, not timestamps: each one is the first moment a measured quantity crosses a line
#' that means something out loud. Change a model parameter and these move with it, which is the
#' point — nothing downstream may hold a number that the run does not still produce.
states_of <- function(run) {
  slowest <- apply(run$v, 1, min)
  tightest <- apply(run$x, 1, function(row) {
    min(c(row[-1], row[1] + TRACK) - row) - CAR_LENGTH
  })

  first <- function(hit, what) {
    i <- which(hit)[1]
    if (is.na(i)) stop(sprintf("the run never reached %s; the model has gone stable", what))
    i
  }

  # Even. Far enough in that a viewer has settled, early enough that nothing is measurable yet.
  even <- first(run$t >= 12, "twelve seconds")

  # Closing. The first gap in the ring to fall fifteen centimetres below the even gap — which is
  # the smallest departure that is a fact rather than a rounding, and is still nothing anybody
  # would notice from inside a car.
  closing <- first(tightest < EQUILIBRIUM_GAP - 0.15, "a gap fifteen centimetres below even")

  # Stopped. A car at a standstill on an open road.
  stopped <- first(slowest < STANDSTILL, "a car at a standstill")

  # Travelling. Far enough past the standstill that the wave has stopped growing and is only
  # moving, which is what the last sentence is about, and no further — every second past that is
  # a second of film the deck has to talk over.
  wave <- first(run$t >= run$t[stopped] + 40, "forty seconds past the first standstill")

  c(even = even, closing = closing, stopped = stopped, wave = wave)
}

# --- how fast the jam goes backwards --------------------------------------------------------

#' The jam's position on the ring at one instant, as an angle.
#'
#' Circular statistics rather than "the slowest car": the jam is a region several cars wide, and
#' its centre moves smoothly between cars while any single car's position jumps. Each car is
#' weighted by how far below the instructed speed it is, and the weighted mean direction is
#' where the slowness is.
jam_angle <- function(x, v) {
  weight <- pmax(0, V_TARGET - v)^2
  if (sum(weight) <= 0) {
    return(NA_real_)
  }
  theta <- (x %% TRACK) / TRACK * 2 * pi
  atan2(sum(weight * sin(theta)), sum(weight * cos(theta)))
}

#' How fast the jam travels, in metres per second, negative against the traffic.
#'
#' Measured over the settled window only, where the wave is travelling rather than growing. The
#' angle is unwrapped before it is fitted, because a jam that crosses the start line would
#' otherwise read as an instantaneous jump of a whole ring.
wave_speed <- function(run, from, to) {
  rows <- seq(from, to, by = 10L)
  theta <- vapply(rows, function(i) jam_angle(run$x[i, ], run$v[i, ]), numeric(1))
  if (anyNA(theta)) stop("the jam has no centre in the settled window; is there a jam?")

  step <- diff(theta)
  step <- step - 2 * pi * round(step / (2 * pi))
  unwrapped <- cumsum(c(theta[1], step))

  fit <- coef(lm(unwrapped ~ run$t[rows]))[[2]]
  fit / (2 * pi) * TRACK
}

#' Everything the deck is allowed to say a number about, measured off one recorded run.
measurements_of <- function(run, states) {
  speed <- wave_speed(run, states[["stopped"]], nrow(run$x))
  tightest <- apply(run$x, 1, function(row) {
    min(c(row[-1], row[1] + TRACK) - row) - CAR_LENGTH
  })
  list(
    wave_ms = speed,
    wave_kmh = abs(speed) * 3.6,
    lap_seconds = TRACK / abs(speed),
    even_at = run$t[states[["even"]]],
    closing_at = run$t[states[["closing"]]],
    closed_by = EQUILIBRIUM_GAP - tightest[states[["closing"]]],
    stopped_at = run$t[states[["stopped"]]],
    forming = run$t[states[["stopped"]]] - run$t[states[["closing"]]],
    closest = run$gap,
    slowest = min(run$v),
    still = sum(run$v[states[["wave"]], ] < 0.5)
  )
}
