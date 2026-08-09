import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { compilePresentation, type SynthesizeNarration } from "../compile/compile.ts";
import { buildTimeline, recallAt, type Timeline } from "../compile/timeline.ts";
import { parsePresentation } from "../presentation/parse.ts";
import { subtitleAt, type SubtitleCue } from "./subtitle.ts";
import { SPEAKER_COLORS } from "./theme.ts";

/**
 * Subtitles, tested through the pipeline that produces them rather than against a hand-built
 * track.
 *
 * The claim under test is not "this function returns these objects" — it is that *the frames a
 * subtitle occupies are the frames the compiler already assigned to a clip*, and a fixture that
 * asserts both halves by construction cannot say anything about that. So these compile real
 * sources with the stand-in narrator that `../compile/compile.test.ts` uses, lay them on a
 * timeline, and check the track against the clips beside it.
 */

const workspaces: string[] = [];
after(() =>
  Promise.all(workspaces.map((path) => rm(path, { recursive: true, force: true }))),
);

/** One second of speech per five characters, and 300ms of silence in front of it. */
function fakeNarrator(): SynthesizeNarration {
  return async (request) => {
    await writeFile(request.output, "not really a wav");
    return {
      durationSeconds: request.text.length / 5,
      leadingSilenceSeconds: 0.3,
      voice: request.voice ?? "af_heart",
      speed: request.speed ?? 1,
    };
  };
}

async function compile(source: string): Promise<Timeline> {
  const workspace = await mkdtemp(join(tmpdir(), "cuecraft-subtitle-"));
  workspaces.push(workspace);
  return buildTimeline(
    await compilePresentation(parsePresentation(source, "test.yaml"), {
      workspace,
      synthesize: fakeNarrator(),
    }),
  );
}

const SOLO = `title: A deck
defaults:
  subtitles: true
  pre_say: 500ms
  post_say: 900ms
slides:
  - slide: { title: One }
    say:
      - "Alpha alpha alpha."
      - pause: 600ms
      - "Beta beta beta beta."
  - slide: { title: Two }
    say:
      - "Gamma gamma."
`;

const DUET = `title: A deck
narrators:
  ada: { voice: af_heart }
  meta: { voice: am_adam, speed: 0.9 }
defaults:
  narrator: ada
  subtitles: true
slides:
  - slide: { title: One }
    say:
      - "Alpha alpha alpha."
      - speech: "Beta beta beta."
        narrator: meta
      - "Gamma gamma gamma."
`;

/* ------------------------------------------------- the deck decides whether */

test("a deck that says nothing about subtitles gets none", async () => {
  const timeline = await compile(SOLO.replace("  subtitles: true\n", ""));
  assert.deepEqual(timeline.subtitles, []);
});

test("subtitles change nothing at all about timing", async () => {
  // The invariant the whole feature is built to keep, and the reason it is stated here rather
  // than promised in a comment: a subtitle is a *projection* of compiled timing, so it must be
  // impossible for adding one to move a clip, a scene, an anchor or a total.
  const [off, on] = await Promise.all([
    compile(SOLO.replace("  subtitles: true\n", "")),
    compile(SOLO),
  ]);

  assert.deepEqual(
    { ...on, subtitles: [] },
    { ...off, subtitles: [] },
    "the timeline differs in the subtitle track and in nothing else",
  );
  assert.ok(
    on.subtitles.length > 0,
    "...and the track is not empty, so this proves something",
  );
});

test("the synthesizer is asked for exactly the same audio either way", async () => {
  const requests: { text: string; voice?: string; speed?: number }[][] = [];
  for (const source of [SOLO, SOLO.replace("  subtitles: true\n", "")]) {
    const seen: { text: string; voice?: string; speed?: number }[] = [];
    const workspace = await mkdtemp(join(tmpdir(), "cuecraft-subtitle-"));
    workspaces.push(workspace);
    await compilePresentation(parsePresentation(source, "test.yaml"), {
      workspace,
      synthesize: async (request) => {
        seen.push({
          text: request.text,
          ...(request.voice === undefined ? {} : { voice: request.voice }),
          ...(request.speed === undefined ? {} : { speed: request.speed }),
        });
        await writeFile(request.output, "not really a wav");
        return {
          durationSeconds: request.text.length / 5,
          leadingSilenceSeconds: 0.3,
          voice: request.voice ?? "af_heart",
          speed: request.speed ?? 1,
        };
      },
    });
    requests.push(seen);
  }
  assert.deepEqual(requests[1], requests[0]);
});

/* --------------------------------------------------------------- the clock */

test("a cue begins on exactly the frame its clip was placed at", async () => {
  const timeline = await compile(SOLO);
  const placed = timeline.scenes.flatMap((scene) => scene.clips.map((clip) => clip.from));
  assert.deepEqual(
    timeline.subtitles.map((cue) => cue.from),
    placed,
    "not recomputed from seconds, not offset by the measured onset, not rounded again",
  );
  assert.deepEqual(
    timeline.subtitles.map((cue) => cue.text),
    ["Alpha alpha alpha.", "Beta beta beta beta.", "Gamma gamma."],
  );
  assert.deepEqual(
    timeline.subtitles.map((cue) => cue.ordinal),
    [1, 2, 3],
    "numbered deck-wide, in the order they are heard",
  );
});

test("every frame of a clip's measured interval selects that clip's cue", async () => {
  const timeline = await compile(SOLO);
  const clips = timeline.scenes.flatMap((scene) => scene.clips);
  clips.forEach((clip, index) => {
    const expected = timeline.subtitles[index];
    for (let frame = clip.from; frame < clip.from + clip.durationInFrames; frame += 1) {
      assert.equal(
        subtitleAt(timeline.subtitles, frame),
        expected,
        `frame ${frame} is inside clip ${index + 1}`,
      );
    }
  });
});

test("one cue hands over to the next on the frame the next clip starts", async () => {
  const timeline = await compile(SOLO);
  const [first, second] = timeline.subtitles;
  assert.ok(first !== undefined && second !== undefined);
  assert.equal(first.until, second.from, "no gap and no overlap between them");
  assert.equal(subtitleAt(timeline.subtitles, second.from - 1), first);
  assert.equal(subtitleAt(timeline.subtitles, second.from), second);
});

test("an authored pause is bridged rather than blinked through", async () => {
  const timeline = await compile(SOLO);
  const scene = timeline.scenes[0];
  const [first, second] = timeline.subtitles;
  assert.ok(scene !== undefined && first !== undefined && second !== undefined);

  const clip = scene.clips[0];
  assert.ok(clip !== undefined);
  const silent = clip.from + clip.durationInFrames;
  assert.ok(silent < second.from, "the fixture really does have a gap here");
  assert.equal(
    subtitleAt(timeline.subtitles, silent),
    first,
    "the sentence just spoken stays up across the 600ms pause",
  );
});

test("nothing is shown before the first word, and nothing survives the slide", async () => {
  const timeline = await compile(SOLO);
  const [one, two] = timeline.scenes;
  assert.ok(one !== undefined && two !== undefined);

  assert.equal(
    subtitleAt(timeline.subtitles, one.from),
    undefined,
    "a film opens on its title, not on a caption",
  );
  assert.equal(subtitleAt(timeline.subtitles, one.narrationFrom - 1), undefined);

  const narrationEnds = one.narrationFrom + one.narrationDurationInFrames;
  assert.equal(
    subtitleAt(timeline.subtitles, narrationEnds),
    undefined,
    "post_say is where the slide starts to leave; nothing is read over it",
  );
  assert.equal(
    subtitleAt(timeline.subtitles, two.from),
    undefined,
    "and nothing crosses into the next slide",
  );
  assert.equal(timeline.subtitles[1]?.until, narrationEnds);
});

test("a cue is selected before the first and after the last by nothing at all", () => {
  const cues: readonly SubtitleCue[] = [
    { ordinal: 1, text: "One.", from: 10, until: 20 },
    { ordinal: 2, text: "Two.", from: 30, until: 40 },
  ];
  assert.equal(subtitleAt(cues, 0), undefined);
  assert.equal(subtitleAt(cues, 9), undefined);
  assert.equal(subtitleAt(cues, 10), cues[0]);
  assert.equal(subtitleAt(cues, 19), cues[0]);
  assert.equal(subtitleAt(cues, 20), undefined, "an unbridged gap really is empty");
  assert.equal(subtitleAt(cues, 30), cues[1]);
  assert.equal(subtitleAt(cues, 39), cues[1]);
  assert.equal(subtitleAt(cues, 40), undefined);
  assert.equal(subtitleAt(cues, 4000), undefined);
});

/* -------------------------------------------------------------- who said it */

test("a named narrator reaches the subtitle as a name", async () => {
  const timeline = await compile(DUET);
  assert.deepEqual(
    timeline.subtitles.map((cue) => cue.speaker?.name),
    ["ada", "meta", "ada"],
  );
});

test("a provider voice name never appears anywhere in the track", async () => {
  const timeline = await compile(DUET);
  // `af_heart` is right there on every clip; a subtitle that reached for it would produce a
  // speaker label out of a Kokoro tensor name, which is not an identity and not a character.
  const serialized = JSON.stringify(timeline.subtitles);
  for (const voice of ["af_heart", "am_adam"]) {
    assert.ok(!serialized.includes(voice), `${voice} must not be in the subtitle track`);
  }
});

test("a deck with no cast labels nobody", async () => {
  const timeline = await compile(SOLO);
  assert.deepEqual(
    timeline.subtitles.map((cue) => cue.speaker),
    [undefined, undefined, undefined],
  );
});

test("a deck that declares a cast but only ever hears one of them labels nobody", async () => {
  // decision:37's stance: a derived notation is withheld rather than applied sometimes. A label
  // that says "ada" under every sentence of a film with one voice is noise with a colour on it.
  const timeline = await compile(`title: A deck
narrators:
  ada: { voice: af_heart }
  meta: { voice: am_adam }
defaults:
  narrator: ada
  subtitles: true
slides:
  - slide: { title: One }
    say:
      - "Alpha."
      - "Beta."
`);
  assert.deepEqual(
    timeline.subtitles.map((cue) => cue.speaker),
    [undefined, undefined],
    "declaring a second narrator is not the same as using one",
  );
});

test("a narrator's colour is stable, distinct, and one of the deck's own", async () => {
  const [one, two] = await Promise.all([compile(DUET), compile(DUET)]);
  const colors = (timeline: Timeline) =>
    timeline.subtitles.map((cue) => cue.speaker?.color);

  assert.deepEqual(colors(two), colors(one), "two compilations of a deck agree");
  const [first, second, third] = colors(one);
  assert.equal(
    first,
    third,
    "the same narrator is the same colour every time they speak",
  );
  assert.notEqual(first, second, "and two narrators are not the same colour");
  assert.equal(
    first,
    SPEAKER_COLORS[0],
    "whoever opens the film gets the deck's own accent",
  );
  assert.equal(second, SPEAKER_COLORS[1]);
});

test("the colour follows who is heard first, not who is declared first", async () => {
  const opened = await compile(
    DUET.replace(
      "  narrator: ada\n  subtitles: true",
      "  narrator: meta\n  subtitles: true",
    ).replace(
      '      - speech: "Beta beta beta."\n        narrator: meta\n',
      '      - speech: "Beta beta beta."\n        narrator: ada\n',
    ),
  );
  assert.deepEqual(
    opened.subtitles.map((cue) => [cue.speaker?.name, cue.speaker?.color]),
    [
      ["meta", SPEAKER_COLORS[0]],
      ["ada", SPEAKER_COLORS[1]],
      ["meta", SPEAKER_COLORS[0]],
    ],
  );
});

test("a fifth narrator shares a colour and keeps their name", async () => {
  const cast = ["a", "b", "c", "d", "e"];
  const timeline = await compile(`title: A deck
narrators:
${cast.map((id) => `  ${id}: { voice: af_heart }`).join("\n")}
defaults:
  subtitles: true
slides:
  - slide: { title: One }
    say:
${cast.map((id) => `      - speech: "Line ${id}."\n        narrator: ${id}`).join("\n")}
`);
  assert.deepEqual(
    timeline.subtitles.map((cue) => cue.speaker?.name),
    cast,
    "every one of them is still named, which is why the repeat is a limit and not a loss",
  );
  assert.equal(
    timeline.subtitles[4]?.speaker?.color,
    timeline.subtitles[0]?.speaker?.color,
    "the palette is four long and wraps",
  );
});

/* ------------------------------------------------------- what it never does */

test("an utterance reaches the subtitle whole, however long it is", async () => {
  const long =
    "This is a deliberately long sentence, written to run past any measure a subtitle " +
    "could reasonably be set to, so that the only way it can be shown is by wrapping it " +
    "and by stepping the type down until all of it is on the frame.";
  const timeline = await compile(`title: A deck
defaults:
  subtitles: true
slides:
  - slide: { title: One }
    say:
      - "${long}"
`);
  assert.equal(
    timeline.subtitles[0]?.text,
    long,
    "no ellipsis, no truncation, no window (decision:28)",
  );
});

test("a respelling is spoken, and the author's own words are shown", async () => {
  // decision:12: `pronounce:` tells the synthesizer how to say something. It is not a claim that
  // the word is spelled that way, so the respelling must never reach the screen.
  const timeline = await compile(`title: A deck
defaults:
  subtitles: true
slides:
  - slide: { title: One }
    say:
      - speech: "WitnessGlass records every call."
        pronounce:
          records: rekords
`);
  assert.equal(timeline.subtitles[0]?.text, "WitnessGlass records every call.");
});

/* -------------------------------------------------- a sentence heard twice */

const RECALLED = `title: A deck
narrators:
  ada: { voice: af_heart }
  meta: { voice: am_adam }
defaults:
  narrator: ada
  subtitles: true
  pre_say: 500ms
  post_say: 900ms
slides:
  - slide:
      title: One
      bullets: [{ id: settlement, text: Settled }]
    say:
      - speech: "Alpha alpha alpha."
        activates: settlement
  - slide: { title: Two, bullets: [a thing] }
    say:
      - speech: "Beta beta."
        narrator: meta
      - recall: settlement
      - pause: 700ms
      - speech: "Gamma gamma gamma."
        narrator: meta
`;

test("a recalled sentence is read in the words and the voice it was first said in", async () => {
  const timeline = await compile(RECALLED);
  const replay = timeline.subtitles[2];
  assert.ok(replay !== undefined);

  assert.equal(replay.text, "Alpha alpha alpha.");
  assert.equal(
    replay.speaker?.name,
    "ada",
    "the sentence belongs to whoever said it, not to whoever quoted it",
  );
  assert.equal(timeline.subtitles[1]?.speaker?.name, "meta", "the cue that quoted it");
});

test("the cue before a recall stops where the recall starts, rather than bridging it", async () => {
  const timeline = await compile(RECALLED);
  const [, scene] = timeline.scenes;
  assert.ok(scene !== undefined);
  const replay = scene.recalls[0];
  const live = timeline.subtitles[1];
  assert.ok(replay !== undefined && live !== undefined);

  // A pause between two sentences of one slide is a breath and is bridged; a replay is a cut to
  // another slide, and reading the previous sentence over it would caption the wrong picture.
  assert.equal(live.until, replay.from);
});

test("a recalled cue ends with the replay, so the silence after it is silent", async () => {
  const timeline = await compile(RECALLED);
  const [, scene] = timeline.scenes;
  assert.ok(scene !== undefined);
  const replay = scene.recalls[0];
  const cue = timeline.subtitles[2];
  const next = scene.clips[1];
  assert.ok(replay !== undefined && cue !== undefined && next !== undefined);

  assert.equal(cue.until, replay.from + replay.durationInFrames);
  assert.ok(cue.until < next.from, "the authored pause is not captioned");
  assert.equal(subtitleAt(timeline.subtitles, cue.until), undefined);
  assert.equal(subtitleAt(timeline.subtitles, next.from - 1), undefined);

  // ...and the film picks the thread back up on the frame the next clip was placed at.
  assert.equal(timeline.subtitles[3]?.from, next.from);
  assert.equal(timeline.subtitles[3]?.text, "Gamma gamma gamma.");
});

test("every frame of a replay selects the recalled cue", async () => {
  const timeline = await compile(RECALLED);
  const replay = timeline.scenes[1]?.recalls[0];
  assert.ok(replay !== undefined);
  for (
    let frame = replay.from;
    frame < replay.from + replay.durationInFrames;
    frame += 1
  ) {
    assert.equal(
      subtitleAt(timeline.subtitles, frame)?.text,
      "Alpha alpha alpha.",
      `frame ${frame}`,
    );
  }
});

test("a recall adds no subtitle to a deck that asked for none", async () => {
  const timeline = await compile(RECALLED.replace("  subtitles: true\n", ""));
  assert.deepEqual(timeline.subtitles, []);
  assert.equal(timeline.scenes[1]?.recalls.length, 1, "...and the replay still happens");
});

test("the deck band and the quotation card never both hold the cue", async () => {
  // The rule the renderer applies, checked where it is decidable without a browser: on exactly
  // the frames a replay owns, the deck-level band is suppressed and the card draws the cue
  // instead — so a viewer sees the sentence once, on the picture it belongs to.
  const timeline = await compile(RECALLED);
  const replay = timeline.scenes[1]?.recalls[0];
  assert.ok(replay !== undefined);

  for (const frame of [
    replay.from,
    replay.from + 40,
    replay.from + replay.durationInFrames - 1,
  ]) {
    assert.ok(recallAt(timeline.scenes, frame) !== undefined, `frame ${frame} is quoted`);
    assert.equal(
      subtitleAt(timeline.subtitles, frame)?.text,
      "Alpha alpha alpha.",
      "the card has a cue to draw",
    );
  }

  // Either side of it, the ordinary band owns whatever is being said — including nothing.
  assert.equal(recallAt(timeline.scenes, replay.from - 1), undefined);
  assert.equal(
    recallAt(timeline.scenes, replay.from + replay.durationInFrames),
    undefined,
  );
  assert.equal(
    subtitleAt(timeline.subtitles, replay.from + replay.durationInFrames),
    undefined,
    "and the authored pause after the replay is still nobody's",
  );
});
