import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bodyBox,
  CASCADE,
  cascadeHeight,
  codeBox,
  CODE,
  COLORS,
  FIGURE,
  FRAME,
  fitCascade,
  fitIndex,
  indexHeight,
  INDEX,
  fitHeading,
  fitQuote,
  fitSpecimen,
  fitSubtitle,
  fitTerm,
  frameBottom,
  headingLines,
  HEADING_WIDTH,
  mix,
  quoteHeight,
  quoteLines,
  SPACE,
  SPEAKER_COLORS,
  SUBTITLE,
  subtitleBand,
  TYPE,
} from "./theme.ts";

/**
 * Sizing is derived from content, which is the whole reason authors never set it. That makes
 * these rules ordinary functions with ordinary failure modes — a specimen that overflows the
 * frame, a heading whose second line is not accounted for — and worth pinning here rather than
 * discovering in a render.
 */

const BOX = { width: 1622, height: 644 };

test("a specimen never exceeds its box in either direction", () => {
  for (const lines of [1, 5, 10, 24, 60]) {
    for (const longest of [10, 46, 90, 200]) {
      const size = fitSpecimen(lines, longest, BOX);
      // The floor wins over fitting when a specimen is genuinely too big for the frame, and
      // that is deliberate: silently setting code at 9px would be worse than overflowing
      // visibly. Only check the fit where the size was not clamped.
      if (size > CODE.minSize) {
        assert.ok(
          lines * size * CODE.lineHeight <= BOX.height + 1,
          `${lines} lines at ${size}px overflows vertically`,
        );
        assert.ok(
          longest * size * CODE.charWidth <= BOX.width + 1,
          `${longest} columns at ${size}px overflows horizontally`,
        );
      }
    }
  }
});

test("a specimen is never set smaller than presentation scale, or larger than the cap", () => {
  assert.equal(
    fitSpecimen(1, 1, BOX),
    CODE.maxSize,
    "a tiny specimen still stops at the cap",
  );
  assert.equal(
    fitSpecimen(400, 400, BOX),
    CODE.minSize,
    "and an enormous one stops at the floor",
  );
});

test("the self-demo's two specimens are set at readable sizes", () => {
  // Ten lines of 46 columns, and nine of 49 — the two blocks in examples/cuecraft.yaml.
  assert.ok(fitSpecimen(10, 46, BOX) >= 38);
  assert.ok(fitSpecimen(9, 49, BOX) >= 38);
});

test("a heading that wraps is known to wrap", () => {
  const short = "One slide, in full";
  assert.equal(headingLines(short.length, fitHeading(short.length, TYPE.title), 1500), 1);

  const long = "Author relationships. Derive mechanics.";
  assert.equal(
    headingLines(long.length, fitHeading(long.length, TYPE.title), 1500),
    2,
    "the close slide's title takes two lines, and the specimen under it has to know",
  );
});

test("heading line counts are at least one, for any input", () => {
  for (const length of [0, 1, 400]) {
    for (const size of [1, 104, 400]) {
      assert.ok(headingLines(length, size, 1500) >= 1);
    }
  }
});

test("headings step down as they lengthen, and never up", () => {
  let previous = Number.POSITIVE_INFINITY;
  for (let length = 1; length <= 120; length += 1) {
    const size = fitHeading(length, TYPE.title);
    assert.ok(size <= previous, `heading grew at length ${length}`);
    previous = size;
  }
});

/* ------------------------------------------------- a spoken sentence, set whole */

/** The measure the anchors figure sets a row's sentence to, at 1920x1080. */
const ROW_MEASURE = bodyBox("Semantic anchors").width - 590;

test("a specimen's box is the body's, less the gutter it keeps for its marks", () => {
  const title = "Author relationships. Derive mechanics.";
  assert.equal(codeBox(title).width, bodyBox(title).width - CODE.gutter);
  assert.equal(codeBox(title).height, bodyBox(title).height);
});

test("a sentence too long for its measure takes another line, never fewer words", () => {
  const width = 1000;
  assert.equal(quoteLines(40, width, FIGURE.quote), 1);
  // Twice the characters at the same size is twice the lines, not the same line truncated.
  assert.ok(quoteLines(200, width, FIGURE.quote) > quoteLines(100, width, FIGURE.quote));
  // And a narrower column costs lines rather than words.
  assert.ok(quoteLines(100, 400, FIGURE.quote) > quoteLines(100, 1200, FIGURE.quote));
});

test("the type steps down before the lines do, and stops at the readable floor", () => {
  assert.equal(fitQuote(["short one"], ROW_MEASURE).size, FIGURE.quote);

  // Every sentence the observatory's narration puts on screen fits in the preferred number of
  // lines at full size — which is the measurement that says the ellipsis was never necessary.
  const observatory = [
    "“Because the author never writes a time. They write which sentence is about which thing.”",
    "“On the left, what somebody typed. On the right, the frame cuecraft worked out it becomes true on.”",
    "“Every span is a sentence that was actually synthesized, and every width is how long it really took.”",
  ];
  const fitted = fitQuote(observatory, ROW_MEASURE);
  assert.ok(fitted.size >= FIGURE.quoteMin);
  assert.equal(fitted.lines, FIGURE.quoteLines);

  // A sentence nothing can fit in two lines is set at the floor and given the lines it needs,
  // because unreadably small is another way of throwing the words away.
  const enormous = fitQuote(["x".repeat(4000)], ROW_MEASURE);
  assert.equal(enormous.size, FIGURE.quoteMin);
  assert.ok(enormous.lines > FIGURE.quoteLines);
});

test("a fitted quote always has room for every line it was measured at", () => {
  for (const length of [10, 60, 120, 400]) {
    const fitted = fitQuote(["x".repeat(length)], ROW_MEASURE);
    assert.ok(quoteLines(length, ROW_MEASURE, fitted.size) <= fitted.lines);
    assert.ok(quoteHeight(fitted.size, fitted.lines) >= fitted.size * fitted.lines);
  }
});

test("the anchors figure has room for a neighbourhood of whole sentences", () => {
  const box = bodyBox("Semantic anchors");
  const fitted = fitQuote(["x".repeat(90)], ROW_MEASURE);
  const rowHeight = quoteHeight(fitted.size, fitted.lines) + 48;
  const budget = box.height - 96 - 44 - 40;
  const rows = Math.floor(budget / rowHeight);
  assert.ok(rows >= FIGURE.minRows, `only ${rows} rows fit under the heading`);
  assert.ok(rows <= FIGURE.rows);
});

/* -------------------------------------------- the room a subtitle takes, or does not */

test("a deck without subtitles is laid out exactly as it always was", () => {
  const title = "Author relationships. Derive mechanics.";
  assert.deepEqual(bodyBox(title, 0), bodyBox(title));
  assert.deepEqual(codeBox(title, 0), codeBox(title));
  assert.equal(subtitleBand(undefined), 0);
});

test("the band replaces the bottom margin rather than stacking on top of it", () => {
  // sprint:14. This used to assert `- band`, and `Frame` padded `marginY + band` to match, so a
  // subtitled composition gave up 108px of margin *underneath* a band that already ends in
  // `SUBTITLE.gap`. Free while nothing was laid out against what was left; not free once
  // `fitIndex` was.
  const title = "Author relationships. Derive mechanics.";
  const band = subtitleBand({ size: SUBTITLE.maxSize, lines: SUBTITLE.lines });
  assert.ok(
    band > FRAME.marginY,
    "a real band is always deeper than the margin it replaces",
  );
  assert.equal(frameBottom(0), FRAME.marginY);
  assert.equal(frameBottom(band), band);
  assert.ok(
    Math.abs(
      bodyBox(title, band).height - (bodyBox(title).height - (band - FRAME.marginY)),
    ) < 0.001,
  );
  assert.equal(
    bodyBox(title, band).width,
    bodyBox(title).width,
    "the measure is untouched",
  );
});

test("a band shallower than the margin never pulls the composition past it", () => {
  assert.equal(frameBottom(10), FRAME.marginY);
  assert.equal(bodyBox("A title", 10).height, bodyBox("A title").height);
});

test("the band reserves the metadata row whether or not anybody was named", () => {
  // sprint:13. The band used to be a function of whether the deck happened to change speaker,
  // which put a single-narrator sentence one row closer to the composition above it — close
  // enough, on `index`, to read as another list row. The room is now unconditional, so the only
  // input left is the sentences themselves.
  const fit = { size: SUBTITLE.maxSize, lines: SUBTITLE.lines };
  assert.equal(
    subtitleBand(fit),
    SUBTITLE.bottom +
      Math.ceil(SUBTITLE.maxSize * SUBTITLE.lineHeight * SUBTITLE.lines) +
      SUBTITLE.labelGap +
      Math.ceil(SUBTITLE.label * 1.1) +
      SUBTITLE.gap,
  );
});

test("a subtitle steps its type down before it takes a third line", () => {
  assert.equal(fitSubtitle(["Short."], HEADING_WIDTH).size, SUBTITLE.maxSize);
  assert.equal(fitSubtitle(["Short."], HEADING_WIDTH).lines, SUBTITLE.lines);

  // Fitted across the whole deck, so one long sentence sets the size for every sentence.
  const deck = ["Short.", "x".repeat(220)];
  assert.ok(fitSubtitle(deck, HEADING_WIDTH).size < SUBTITLE.maxSize);
  assert.equal(
    fitSubtitle(deck, HEADING_WIDTH).size,
    fitSubtitle([deck[1] ?? ""], HEADING_WIDTH).size,
  );

  // And below the readable floor it takes the lines instead, because unreadably small is
  // another way of discarding an utterance (decision:28).
  const enormous = fitSubtitle(["x".repeat(4000)], HEADING_WIDTH);
  assert.equal(enormous.size, SUBTITLE.minSize);
  assert.ok(enormous.lines > SUBTITLE.lines);
  assert.ok(
    subtitleBand(enormous) >
      subtitleBand({ size: SUBTITLE.minSize, lines: SUBTITLE.lines }),
    "a deck that needs more lines reserves more room, rather than overflowing into the frame",
  );
});

test("a fitted subtitle always has room for every line it was measured at", () => {
  for (const length of [10, 60, 120, 400]) {
    const fitted = fitSubtitle(["x".repeat(length)], HEADING_WIDTH);
    assert.ok(quoteLines(length, HEADING_WIDTH, fitted.size) <= fitted.lines);
  }
});

/* ------------------------------- a stacked composition inside the box it was given */

/**
 * The four decks that mattered, at the shapes that mattered.
 *
 * `witnessglass` is the case that always fitted — a one-line title over four short rows — and its
 * job here is to prove the fitters give a deck with room to spare the full size and the full air.
 * The other three are the shapes that overflowed: a wrapped title over a full-width stack, which
 * is what `index` and `cascade` had never been given before a subtitle took a strip out of the
 * bottom of the frame. sprint:14.
 */
const STACKS = [
  {
    title: "WitnessGlass records the work",
    rows: [
      "Which tool the agent invoked",
      "How long the call took",
      "What the tool returned",
      "Why it was called at all",
    ],
  },
  {
    title: "Risk posture: circulated at 08:00",
    rows: [
      "Data loss — low",
      "Rollback duration — medium",
      "Operator fatigue — low",
      "Unknown dependencies — not observed",
    ],
  },
  {
    title: "The decision the exercise is supposed to inform",
    rows: [
      "Preserve customer writes",
      "Meet the recovery objective",
      "Verify one primary region",
      "Authorize automated failover",
    ],
  },
  {
    title: "Reconciliation findings at 14:30, 14:19, and Tuesday",
    rows: [
      "Customer balances — consistent",
      "Order identifiers — mostly unique",
      "Incident commander — active in both regions",
      "Lunch — consumed twice",
    ],
  },
] as const;

/** Every band these decks actually produce, plus none at all. */
const BANDS = [0, 197, 206, 238] as const;

test("a numbered list is laid out inside the box, at every band", () => {
  for (const band of BANDS) {
    for (const deck of STACKS) {
      const box = bodyBox(deck.title, band);
      const fitted = fitIndex(deck.rows, box);
      assert.ok(
        indexHeight(deck.rows, fitted, box.width) <= box.height,
        `${deck.title} at band ${band} overflows by ` +
          `${indexHeight(deck.rows, fitted, box.width) - box.height}px`,
      );
      assert.ok(fitted.size >= INDEX.minSize);
      assert.ok(fitted.pad >= INDEX.minPad);
    }
  }
});

test("the overflow this round fixed is the one the renders showed", () => {
  // What the archetype did before it asked: `TYPE.row` and `SPACE.lg`, unconditionally. Pinned
  // rather than described, because "it used to overflow" is the claim the fix rests on, and the
  // frames that proved it are not in the repository.
  const deck = STACKS[2];
  if (deck === undefined) throw new Error("fixture missing");
  const box = bodyBox(deck.title, 206);
  assert.ok(
    indexHeight(deck.rows, { size: TYPE.row, pad: SPACE.lg }, box.width) > box.height,
    "the unfitted constants must not fit, or this test is not watching the defect",
  );
  assert.ok(indexHeight(deck.rows, fitIndex(deck.rows, box), box.width) <= box.height);
});

test("a deck with room to spare keeps full size and full air", () => {
  const deck = STACKS[0];
  if (deck === undefined) throw new Error("fixture missing");
  const fitted = fitIndex(deck.rows, bodyBox(deck.title, 0));
  assert.equal(fitted.size, TYPE.row, "nothing steps down until something has to");
  assert.equal(fitted.pad, INDEX.pad);
});

test("a staircase is laid out inside the box, at every band", () => {
  const stairs = [
    {
      title: "Assumptions requiring confirmation",
      stages: [
        "All write paths are known",
        "The schema migration is reversible",
        "The on-call team will remain conscious",
        "Time stays linear during the freeze window",
      ],
    },
    {
      title: "Risk posture after consulting the version of us from tomorrow",
      stages: [
        "Data loss remains low",
        "Causality loss is unquantified",
        "Rollback may create another Wednesday",
        "Operator fatigue has achieved replication",
      ],
    },
    {
      title: "Approved recovery sequence and one unauthorized event",
      stages: [
        "Freeze writes in West",
        "Promote the East replica",
        "Shift customer traffic east",
        "Reconcile and fail back",
      ],
    },
  ];
  for (const band of BANDS) {
    for (const deck of stairs) {
      const box = bodyBox(deck.title, band);
      const step = deck.stages.length > 4 ? SPACE.xxl : SPACE.huge;
      const fitted = fitCascade(deck.stages, box, step);
      assert.ok(
        cascadeHeight(deck.stages, fitted, box.width, step) <= box.height,
        `${deck.title} at band ${band} overflows by ` +
          `${cascadeHeight(deck.stages, fitted, box.width, step) - box.height}px`,
      );
      assert.ok(fitted.size >= CASCADE.minSize);
    }
  }
});

test("the bottom stage is the one that wraps, because it is the most indented", () => {
  // Which is also the stage sitting closest to the narration, so this is the measurement the
  // fitter most needs to get right.
  const stages = [
    "A stage long enough that the measure it is given decides how many lines it takes",
    "A stage long enough that the measure it is given decides how many lines it takes",
  ];
  const fitted = { size: TYPE.stage, gap: SPACE.md };
  assert.ok(
    cascadeHeight(stages, fitted, 1656, SPACE.huge) >
      cascadeHeight(stages, fitted, 1656, 0),
    "indenting a staircase costs measure, and measure costs lines",
  );
});

test("every narrator colour is one of the deck's own, and they are distinct", () => {
  assert.equal(
    SPEAKER_COLORS[0],
    COLORS.accent,
    "the first voice is the deck's own voice",
  );
  assert.equal(new Set(SPEAKER_COLORS).size, SPEAKER_COLORS.length);
  for (const color of SPEAKER_COLORS) assert.match(color, /^#[0-9a-fA-F]{6}$/);
});

test("a matrix of four terms is set larger than a matrix of six", () => {
  assert.ok(fitTerm(4) > fitTerm(6));
  assert.equal(fitTerm(6), TYPE.term);
  assert.equal(
    fitTerm(2),
    fitTerm(4),
    "the threshold is the row count, not the item count",
  );
});

test("mixing colours returns the endpoints exactly", () => {
  assert.equal(mix(COLORS.accent, COLORS.flare, 0), COLORS.accent.toLowerCase());
  assert.equal(mix(COLORS.accent, COLORS.flare, 1), COLORS.flare.toLowerCase());
});

test("mixing clamps rather than extrapolating past the palette", () => {
  assert.equal(mix(COLORS.dormant, COLORS.paper, -5), COLORS.dormant.toLowerCase());
  assert.equal(mix(COLORS.dormant, COLORS.paper, 5), COLORS.paper.toLowerCase());
});

test("a mix is always a six-digit hex colour", () => {
  for (let step = 0; step <= 10; step += 1) {
    const blended = mix("#000000", "#ffffff", step / 10);
    assert.match(blended, /^#[0-9a-f]{6}$/);
  }
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
});
