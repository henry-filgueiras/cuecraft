import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CompiledPresentation,
  CompiledSlide,
  NarrationCall,
  NarrationDwell,
  NarrationRecall,
  SpeechClip,
} from "./compile.ts";
import type { AuthoredActor, AuthoredStep } from "../presentation/parse.ts";
import { childScope, ROOT_SCOPE, type Scope } from "../presentation/scope.ts";
import { buildTimeline, DEFAULT_FPS } from "./timeline.ts";
import {
  slugFor,
  symbolsPathFor,
  symbolTable,
  SYMBOLS_FORMAT,
  SYMBOLS_VERSION,
  type CuecraftSymbol,
  type SymbolTable,
} from "./symbols.ts";

/**
 * The rigid fixture: a deck whose every frame can be worked out on paper.
 *
 * Nothing here is measured. Every duration is stated, so the arithmetic below is the *whole*
 * derivation and a test that disagrees with it is reporting a real change rather than a wobble in
 * a synthesizer. That is the point of the fixture — the failure this round exists to prevent is a
 * frame-level one, and a frame-level assertion needs a frame-level fixture.
 *
 * At 30fps, and with `framesFor` rounding every duration up to the frames it touches:
 *
 *     Alpha   pre 500ms -> 15   two clips 2.0s + 3.0s -> 60 + 90   post 500ms -> 15
 *             [0, 180)      narration [15, 165)      clips at 15 and 75, onset 9
 *     Beta    pre 500ms -> 15   one clip 4.0s -> 120               post 500ms -> 15
 *             [180, 330)    narration [195, 315)     clip at 195, onset 9
 *     Gamma   pre 100ms -> 3    one clip 0.5s -> 15                post 100ms -> 3
 *             [330, 351)    narration [333, 348)     clip at 333, onset 3
 *
 * **Gamma is deliberately shorter than any sampling period anybody would choose.** It runs for
 * 0.7 seconds at the end of an 11.7-second film, and it is the whole reason for the round.
 */
const RIGID: readonly SlideSpec[] = [
  {
    ordinal: 1,
    title: "Alpha",
    preSayMs: 500,
    postSayMs: 500,
    speech: [2, 3],
    leadingSilence: 0.3,
    activates: ["", "one"],
  },
  {
    ordinal: 2,
    title: "Beta",
    preSayMs: 500,
    postSayMs: 500,
    speech: [4],
    leadingSilence: 0.3,
  },
  {
    ordinal: 3,
    title: "Gamma",
    preSayMs: 100,
    postSayMs: 100,
    speech: [0.5],
    leadingSilence: 0.1,
  },
];

interface SlideSpec {
  readonly ordinal: number;
  readonly title: string;
  readonly preSayMs: number;
  readonly postSayMs: number;
  /** Seconds per clip, laid end to end unless `offsets` says otherwise. */
  readonly speech: readonly number[];
  /** Where each clip starts, for a slide whose track has room made in it for a descent. */
  readonly offsets?: readonly number[];
  readonly leadingSilence: number;
  /** Per clip; an empty string means that clip reaches nothing. */
  readonly activates?: readonly string[];
  /** Per clip; an empty string means that clip fills nothing. */
  readonly fills?: readonly string[];
  /** Per clip, the scope it is spoken in. Root unless the slide descends. */
  readonly scopes?: readonly Scope[];
  /** Already measured, as the compiler would have handed them over. */
  readonly calls?: readonly NarrationCall[];
  readonly recalls?: readonly NarrationRecall[];
  readonly dwells?: readonly NarrationDwell[];
  /** A protocol body, for the tests about occurrences. */
  readonly protocol?: {
    actors: readonly AuthoredActor[];
    steps: readonly AuthoredStep[];
  };
}

function compiledSlide(spec: SlideSpec): CompiledSlide {
  let offset = 0;
  const clips = spec.speech.map((duration, index): SpeechClip => {
    const at = spec.offsets?.[index] ?? offset;
    offset = at + duration;
    const activates = spec.activates?.[index];
    const fills = spec.fills?.[index];
    const scope = spec.scopes?.[index] ?? ROOT_SCOPE;
    return {
      ordinal: index + 1,
      text: `${spec.title} sentence ${index + 1}`,
      path: `/tmp/${spec.ordinal}-${index + 1}.wav`,
      src: `narration/${spec.ordinal}-${index + 1}.wav`,
      offsetSeconds: at,
      durationSeconds: duration,
      leadingSilenceSeconds: spec.leadingSilence,
      scope,
      voice: "af_heart",
      speed: 1,
      ...(activates ? { activates, address: childScope(scope, activates) } : {}),
      ...(fills ? { fills, fillsAddress: childScope(scope, fills) } : {}),
    };
  });

  const named = [...(spec.activates ?? []), ...(spec.fills ?? [])].filter(
    (id) => id !== "",
  );
  return {
    ordinal: spec.ordinal,
    title: spec.title,
    body:
      spec.protocol !== undefined
        ? { kind: "protocol", ...spec.protocol }
        : { kind: "bullets", items: named.map((id) => ({ id, text: id })) },
    say: [{ kind: "speech", scope: ROOT_SCOPE, text: "Words." }],
    preSayMs: spec.preSayMs,
    postSayMs: spec.postSayMs,
    // No floor: the fixture's durations are the fixture's claim, and a minimum would silently
    // lengthen Gamma into exactly the slide this round is about not missing.
    minSlideMs: 0,
    modules: [],
    sceneMs: 0,
    narration: {
      clips,
      calls: spec.calls ?? [],
      dwells: spec.dwells ?? [],
      recalls: spec.recalls ?? [],
      playbacks: [],
      durationSeconds: offset,
      voice: "af_heart",
      speed: 1,
    },
  };
}

function compiled(specs: readonly SlideSpec[] = RIGID): CompiledPresentation {
  return {
    title: "Rigid",
    slides: specs.map(compiledSlide),
    publicDir: "/tmp/public",
    subtitles: false,
    typography: "default",
  };
}

function tableFor(specs: readonly SlideSpec[] = RIGID): SymbolTable {
  const presentation = compiled(specs);
  return symbolTable(presentation, buildTimeline(presentation), { file: "rigid.mp4" });
}

function slides(table: SymbolTable): readonly CuecraftSymbol[] {
  return table.symbols.filter((symbol) => symbol.kind === "slide");
}

function keyed(table: SymbolTable, key: string): CuecraftSymbol {
  const found = table.symbols.find((symbol) => symbol.key === key);
  assert.ok(found !== undefined, `no symbol keyed ${key}`);
  return found;
}

test("the document says what it is before it says anything else", () => {
  const table = tableFor();
  assert.equal(table.format, SYMBOLS_FORMAT);
  assert.equal(table.version, SYMBOLS_VERSION);
  assert.deepEqual(table.coordinates, {
    unit: "frame",
    interval: "[fromFrame, toFrame)",
    seconds: "derived",
  });
  assert.equal(table.presentation.title, "Rigid");
  assert.deepEqual(table.media, {
    file: "rigid.mp4",
    fps: 30,
    width: 1920,
    height: 1080,
    durationFrames: 351,
    durationSeconds: 11.7,
  });
});

test("every slide produces exactly one symbol, in order, and none is omitted", () => {
  const table = tableFor();
  assert.deepEqual(
    slides(table).map((symbol) => symbol.key),
    ["slide:alpha", "slide:beta", "slide:gamma"],
  );
  assert.deepEqual(
    slides(table).map((symbol) => symbol.ordinal),
    [1, 2, 3],
  );
  assert.deepEqual(
    slides(table).map((symbol) => symbol.label),
    ["Alpha", "Beta", "Gamma"],
  );
});

test("slide intervals are exactly the compiled frames", () => {
  const table = tableFor();
  assert.deepEqual(
    slides(table).map((symbol) => [symbol.fromFrame, symbol.toFrame]),
    [
      [0, 180],
      [180, 330],
      [330, 351],
    ],
  );
  assert.deepEqual(
    slides(table).map((symbol) => [symbol.contentFromFrame, symbol.contentToFrame]),
    [
      [15, 165],
      [195, 315],
      [333, 348],
    ],
  );
});

test("slide intervals tile the film: contiguous, non-overlapping, no gaps at either end", () => {
  const table = tableFor();
  const found = slides(table);
  assert.equal(found[0]?.fromFrame, 0, "the first slide starts at frame zero");
  assert.equal(
    found.at(-1)?.toFrame,
    table.media.durationFrames,
    "the last slide ends where the film does",
  );
  found.forEach((symbol, index) => {
    const next = found[index + 1];
    assert.ok(symbol.toFrame > symbol.fromFrame, `${symbol.key} is empty`);
    if (next !== undefined) {
      assert.equal(
        next.fromFrame,
        symbol.toFrame,
        `${symbol.key} and ${next.key} neither overlap nor leave a gap`,
      );
    }
  });
});

test("the symbol table agrees with the timeline it was projected from", () => {
  const presentation = compiled();
  const timeline = buildTimeline(presentation);
  const table = symbolTable(presentation, timeline, { file: "rigid.mp4" });

  assert.equal(table.media.durationFrames, timeline.totalFrames);
  assert.equal(table.media.fps, timeline.fps);
  slides(table).forEach((symbol, index) => {
    const scene = timeline.scenes[index];
    assert.ok(scene !== undefined);
    assert.equal(symbol.fromFrame, scene.from);
    assert.equal(symbol.toFrame, scene.from + scene.durationInFrames);
    assert.equal(symbol.contentFromFrame, scene.narrationFrom);
    assert.equal(
      symbol.contentToFrame,
      scene.narrationFrom + scene.narrationDurationInFrames,
    );
  });
});

test("every representative frame is inside its slide's inspectable window", () => {
  const table = tableFor();
  assert.deepEqual(
    slides(table).map((symbol) => symbol.snapshotFrame),
    // The last frame of each slide's last sentence: Alpha's runs [75, 165), Beta's [195, 315),
    // Gamma's [333, 348).
    [164, 314, 347],
  );
  for (const symbol of slides(table)) {
    assert.ok(
      symbol.snapshotFrame >= (symbol.contentFromFrame as number),
      `${symbol.key} would be sampled while it is still arriving`,
    );
    assert.ok(
      symbol.snapshotFrame < (symbol.contentToFrame as number),
      `${symbol.key} would be sampled while it is leaving`,
    );
  }
});

test("the short final slide is present, and its snapshot is before the end of the film", () => {
  const table = tableFor();
  const gamma = keyed(table, "slide:gamma");
  assert.equal(gamma.toFrame - gamma.fromFrame, 21, "Gamma runs for 0.7 seconds");
  assert.ok(gamma.snapshotFrame < table.media.durationFrames - 1, "before EOF");
  assert.ok(
    gamma.snapshotFrame >= gamma.fromFrame && gamma.snapshotFrame < gamma.toFrame,
  );
});

/**
 * The regression, stated as the failure that produced this round.
 *
 * Whatever period a fixed-interval sampler picks, it misses Gamma unless it happens to be finer
 * than 0.7 seconds. Walking the symbols cannot miss it, because there is one symbol per slide and
 * each carries its own frame.
 */
test("uniform sampling misses a slide the symbol table cannot", () => {
  const table = tableFor();
  const covered = (period: number): number => {
    const hit = new Set<string>();
    for (
      let frame = 0;
      frame < table.media.durationFrames;
      frame += period * DEFAULT_FPS
    ) {
      const slide = slides(table).find(
        (symbol) => frame >= symbol.fromFrame && frame < symbol.toFrame,
      );
      if (slide !== undefined) hit.add(slide.key);
    }
    return hit.size;
  };

  assert.equal(covered(5), 2, "sampling every five seconds sees two of the three slides");
  assert.equal(covered(1), 3, "a fine enough sampler happens to get away with it");
  assert.equal(
    slides(table).length,
    3,
    "and walking the symbols sees all three at any film length",
  );
});

test("seconds are derived from frames and fps, and nothing else", () => {
  const table = tableFor();
  for (const symbol of table.symbols) {
    assert.equal(symbol.fromSeconds, Number((symbol.fromFrame / 30).toFixed(6)));
    assert.equal(symbol.toSeconds, Number((symbol.toFrame / 30).toFixed(6)));
    assert.equal(symbol.snapshotSeconds, Number((symbol.snapshotFrame / 30).toFixed(6)));
  }
  assert.equal(keyed(table, "slide:beta").fromSeconds, 6);
  assert.equal(
    keyed(table, "slide:gamma").snapshotSeconds,
    Number((347 / 30).toFixed(6)),
  );
});

test("projection is deterministic to the byte", () => {
  assert.equal(JSON.stringify(tableFor()), JSON.stringify(tableFor()));
});

test("keys survive a re-compilation that moves every frame", () => {
  const before = tableFor();
  // Every duration changed; nothing renamed. A key that moved would be an ordinal or a timestamp
  // wearing a name.
  const after = tableFor(
    RIGID.map((spec) => ({
      ...spec,
      preSayMs: spec.preSayMs + 200,
      speech: spec.speech.map((duration) => duration * 1.37),
    })),
  );

  assert.deepEqual(
    before.symbols.map((symbol) => symbol.key),
    after.symbols.map((symbol) => symbol.key),
  );
  assert.notDeepEqual(
    before.symbols.map((symbol) => symbol.fromFrame),
    after.symbols.map((symbol) => symbol.fromFrame),
    "the fixture was supposed to move",
  );
});

test("an anchor is exported at the frame it becomes audible, and stays until its slide ends", () => {
  const table = tableFor();
  const anchor = keyed(table, "anchor:alpha/one");
  assert.equal(anchor.kind, "anchor");
  assert.equal(anchor.label, "one");
  assert.equal(anchor.slide, "slide:alpha");
  // Alpha's second clip opens at 75 with 0.3s of leading silence: 75 + 9.
  assert.equal(anchor.fromFrame, 84);
  assert.equal(anchor.toFrame, 180);
  assert.equal(anchor.snapshotFrame, 84);
});

test("utterances carry what was said, on the frames it was said", () => {
  const table = tableFor();
  assert.deepEqual(
    table.symbols
      .filter((symbol) => symbol.kind === "utterance")
      .map((symbol) => [symbol.key, symbol.fromFrame, symbol.toFrame]),
    [
      ["utterance:alpha/1", 15, 75],
      ["utterance:alpha/2", 75, 165],
      ["utterance:beta/1", 195, 315],
      ["utterance:gamma/1", 333, 348],
    ],
  );
  assert.equal(keyed(table, "utterance:beta/1").label, "Beta sentence 1");
});

test("every symbol's own frame is inside its own interval", () => {
  for (const symbol of tableFor().symbols) {
    assert.ok(
      symbol.snapshotFrame >= symbol.fromFrame && symbol.snapshotFrame < symbol.toFrame,
      `${symbol.key} points outside itself`,
    );
    assert.ok(symbol.toFrame > symbol.fromFrame, `${symbol.key} is an empty interval`);
    assert.ok(
      symbol.toFrame <= 351 && symbol.fromFrame >= 0,
      `${symbol.key} runs outside the film`,
    );
  }
});

test("symbols are ordered by frame, and every key is unique", () => {
  const table = tableFor();
  const keys = table.symbols.map((symbol) => symbol.key);
  assert.equal(new Set(keys).size, keys.length, "keys collide");
  table.symbols.forEach((symbol, index) => {
    const next = table.symbols[index + 1];
    if (next !== undefined) assert.ok(next.fromFrame >= symbol.fromFrame);
  });
});

test("a slide key comes from its title, and collisions resolve deterministically", () => {
  assert.equal(slugFor("Architecture & Data"), "architecture-data");
  assert.equal(slugFor("  Trailing —  "), "trailing");
  assert.equal(slugFor("...!"), "");

  const table = tableFor([
    { ...(RIGID[0] as SlideSpec), title: "Results" },
    { ...(RIGID[1] as SlideSpec), title: "Results" },
    { ...(RIGID[2] as SlideSpec), title: "!!!" },
  ]);
  assert.deepEqual(
    slides(table).map((symbol) => symbol.key),
    ["slide:results", "slide:results-2", "slide:slide-3"],
  );
  assert.equal(
    keyed(table, "utterance:results-2/1").slide,
    "slide:results-2",
    "a symbol is prefixed with the slug its own slide got",
  );
});

test("a population's symbol is the range it accumulates over, not a moment", () => {
  const table = tableFor([
    {
      ordinal: 1,
      title: "Evidence",
      preSayMs: 500,
      postSayMs: 500,
      speech: [4],
      leadingSilence: 0.3,
      fills: ["failures"],
    },
  ]);
  const span = keyed(table, "span:evidence/failures");
  assert.equal(span.kind, "span");
  assert.equal(span.label, "failures");
  // The clip opens at 15 with nine frames of leading silence, and runs for 120 frames.
  assert.equal(span.fromFrame, 24);
  assert.equal(span.toFrame, 24 + (120 - 9));
});

test("a descent is one symbol per balanced pair, not two thresholds to pair up", () => {
  const inside = childScope(ROOT_SCOPE, "payment");
  const table = tableFor([
    {
      ordinal: 1,
      title: "Outside",
      preSayMs: 500,
      postSayMs: 500,
      speech: [1, 1, 1],
      // Speak, enter, speak inside, exit, speak: the track has room made in it for both
      // thresholds, exactly as `nest.ts` splices them.
      offsets: [0, 2, 4],
      leadingSilence: 0,
      scopes: [ROOT_SCOPE, inside, ROOT_SCOPE],
      calls: [
        {
          kind: "enter",
          scope: ROOT_SCOPE,
          into: inside,
          target: "payment",
          offsetSeconds: 1,
          durationSeconds: 1,
        },
        {
          kind: "exit",
          scope: ROOT_SCOPE,
          into: inside,
          target: "payment",
          offsetSeconds: 3,
          durationSeconds: 1,
        },
      ],
    },
  ]);

  // 500ms of pre-say is 15 frames; each second is 30.
  const scope = keyed(table, "scope:outside/payment");
  assert.equal(scope.kind, "scope");
  assert.equal(scope.label, "payment");
  assert.equal(scope.fromFrame, 15 + 30, "the threshold opens after the first sentence");
  assert.equal(scope.toFrame, 15 + 120, "and closes when the return has finished");
  assert.equal(
    keyed(table, "utterance:outside/2").fromFrame,
    15 + 60,
    "and the child's sentence lands between the two thresholds",
  );
  assert.equal(
    table.symbols.filter((symbol) => symbol.kind === "scope").length,
    1,
    "one symbol for the descent, not one per threshold",
  );
});

test("a recall says where it plays and where it is quoting from", () => {
  const table = tableFor([
    {
      ordinal: 1,
      title: "Claim",
      preSayMs: 500,
      postSayMs: 500,
      speech: [2],
      leadingSilence: 0.3,
    },
    {
      ordinal: 2,
      title: "Conclusion",
      preSayMs: 500,
      postSayMs: 500,
      speech: [1],
      leadingSilence: 0.3,
      recalls: [
        {
          id: "the-claim",
          sourceOrdinal: 1,
          sourceClipIndex: 0,
          src: "narration/1-1.wav",
          scope: ROOT_SCOPE,
          offsetSeconds: 1,
          durationSeconds: 2,
        },
      ],
    },
  ]);

  // Claim: 15 + 60 + 15 = 90 frames, its clip at 15. Conclusion opens at 90, narration at 105.
  const recall = keyed(table, "recall:conclusion/the-claim");
  assert.equal(recall.kind, "recall");
  assert.equal(recall.fromFrame, 105 + 30);
  assert.equal(recall.toFrame, 105 + 30 + 60);
  assert.equal(
    recall.sourceFromFrame,
    15,
    "the clip it replays, not the anchor inside it",
  );
  assert.equal(recall.slide, "slide:conclusion");
});

test("an occurrence is current until its successor starts", () => {
  const step = (index: number): Scope => childScope(ROOT_SCOPE, `step-${index}`);
  const table = tableFor([
    {
      ordinal: 1,
      title: "Handshake",
      preSayMs: 500,
      postSayMs: 500,
      speech: [4],
      leadingSilence: 0,
      protocol: {
        actors: [
          { id: "client", text: "Client" },
          { id: "server", text: "Server" },
        ],
        steps: [
          { from: "client", to: "server", message: "hello" },
          { from: "server", to: "client", message: "hello back" },
        ],
      },
      // Two silent steps, already placed by the compiler at one and three seconds in.
      dwells: [
        { address: step(1), scope: ROOT_SCOPE, offsetSeconds: 0, durationSeconds: 0.001 },
        { address: step(2), scope: ROOT_SCOPE, offsetSeconds: 4, durationSeconds: 0.001 },
      ],
    },
  ]);

  const first = keyed(table, "beat:handshake/step-1");
  const second = keyed(table, "beat:handshake/step-2");
  assert.equal(first.kind, "beat");
  assert.equal(first.label, "step-1");
  assert.equal(
    first.toFrame,
    second.fromFrame,
    "a step owns the stage until the next one takes it",
  );
  assert.equal(
    second.toFrame,
    keyed(table, "slide:handshake").contentToFrame,
    "and the last runs to the end of the narration",
  );
});

test("the sidecar's name comes from the film's", () => {
  assert.equal(symbolsPathFor("out/demo.mp4"), "out/demo.symbols.json");
  assert.equal(symbolsPathFor("presentation.mp4"), "presentation.symbols.json");
  assert.equal(symbolsPathFor("/a/b.c/film"), "/a/b.c/film.symbols.json");
  assert.equal(symbolsPathFor("out/.hidden"), "out/.hidden.symbols.json");
});
