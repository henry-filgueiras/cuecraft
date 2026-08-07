import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { parsePresentation } from "../presentation/parse.ts";
import { SourceError, type RepositoryReader } from "../presentation/source.ts";
import { compilePresentation, type SynthesizeNarration } from "./compile.ts";
import {
  buildTimeline,
  narrativeStack,
  stackProblem,
  type Scene,
  type Timeline,
} from "./timeline.ts";

/**
 * The compiled call stack, from YAML to frames.
 *
 * Parse, compile and time together rather than in three unit tests, because the property that
 * matters is an *interleaving* and no single layer can be wrong about it on its own: the parser
 * decides the order, the compiler decides the offsets, and the timeline decides the frames.
 * Each of the three can be individually correct while the child ends up speaking over its own
 * parent, which is the only failure that would actually be visible in the video.
 *
 * Narration is a stand-in, as everywhere else in this suite (`./compile.test.ts`): the seam
 * exists so that dragon:1's ordering constraint can be exercised in milliseconds.
 */

const workspaces: string[] = [];
after(() =>
  Promise.all(workspaces.map((path) => rm(path, { recursive: true, force: true }))),
);

/** One second of speech per five characters, and a file written to prove it ran. */
const narrator: SynthesizeNarration = async (request) => {
  await writeFile(request.output, "not really a wav");
  return {
    durationSeconds: request.text.length / 5,
    leadingSilenceSeconds: 0.3,
    voice: request.voice ?? "af_heart",
    speed: request.speed ?? 1,
  };
};

const FILES: Record<string, string> = {
  "decks/paying.yaml": `
world:
  entities:
    asks: The shop asks
    check:
      label: The check
      child: ./check.yaml
    answer: Yes or no
  relations:
    - asks -> check
    - check -> answer
say:
  - speech: "The shop asks the bank."
    activates: asks
  - speech: "First it runs a check."
    activates: check
  - enter: check
  - speech: "Then it answers."
    activates: answer
`,
  "decks/check.yaml": `
world:
  entities:
    known: What is known
    allowed: Allowed
  relations:
    - known -> allowed
say:
  - speech: "It starts from what it knows."
    activates: known
  - speech: "Almost always, allowed."
    activates: allowed
`,
};

const ROOT = `
title: A deck
slides:
  - slide:
      title: One
      world:
        entities:
          buy: You press Buy
          paying:
            label: Paying
            child: ./paying.yaml
          done: It turns up
        relations:
          - buy -> paying
          - paying -> done
    say:
      - speech: "You press Buy."
        activates: buy
      - enter: paying
      - speech: "And it turns up."
        activates: done
`;

const read: RepositoryReader = (file) => {
  const text = FILES[file];
  if (text === undefined) {
    throw new SourceError(
      `file ${JSON.stringify(file)} does not exist in the repository`,
    );
  }
  return text;
};

async function compile(source: string = ROOT): Promise<Timeline> {
  const workspace = await mkdtemp(join(tmpdir(), "cuecraft-stack-"));
  workspaces.push(workspace);
  const presentation = parsePresentation(source, "order.yaml", {
    read,
    origin: "decks/order.yaml",
  });
  const compiled = await compilePresentation(presentation, {
    workspace,
    synthesize: narrator,
  });
  return buildTimeline(compiled);
}

function only(timeline: Timeline): Scene {
  const scene = timeline.scenes[0];
  assert.ok(scene !== undefined);
  return scene;
}

/** The stack as a transcript, which is what most of these assert on. */
function transcript(scene: Scene): string[] {
  return narrativeStack(scene).map((event) =>
    event.kind === "narrate"
      ? `narrate ${event.scope}`
      : `${event.kind} ${event.kind === "enter" ? `${event.scope} -> ${event.into}` : `${event.into} -> ${event.scope}`} (${event.target})`,
  );
}

test("the compiled timeline descends two levels and unwinds through the same scopes", async () => {
  assert.deepEqual(transcript(only(await compile())), [
    "narrate root",
    "enter root -> root/paying (paying)",
    "narrate root/paying",
    "narrate root/paying",
    "enter root/paying -> root/paying/check (check)",
    "narrate root/paying/check",
    "narrate root/paying/check",
    "exit root/paying/check -> root/paying (check)",
    "narrate root/paying",
    "exit root/paying -> root (paying)",
    "narrate root",
  ]);
});

test("the descent nests: every enter is matched, and the stack ends empty", async () => {
  assert.equal(stackProblem(only(await compile())), undefined);
});

test("nothing overlaps: every event begins where the last one ended", async () => {
  const scene = only(await compile());
  let cursor = scene.narrationFrom;
  for (const event of narrativeStack(scene)) {
    assert.ok(
      event.frame >= cursor,
      `${event.kind} at ${event.frame} begins before ${cursor}`,
    );
    cursor = event.frame + event.durationInFrames;
  }
  assert.ok(cursor <= scene.from + scene.durationInFrames);
});

test("the parent does not speak underneath the child", async () => {
  const scene = only(await compile());
  const events = narrativeStack(scene);
  const enter = events.findIndex((event) => event.kind === "enter");
  const exit = events.findLastIndex((event) => event.kind === "exit");
  const inside = events.slice(enter + 1, exit);
  assert.ok(inside.length > 0);
  assert.ok(!inside.some((event) => event.kind === "narrate" && event.scope === "root"));
});

test("the entry occupies real frames, and the child's first word waits for them", async () => {
  const scene = only(await compile());
  const enter = scene.calls.find((call) => call.into === "root/paying");
  assert.ok(enter !== undefined);
  assert.ok(enter.durationInFrames > 0);

  const first = scene.clips.find((clip) => clip.scope === "root/paying");
  assert.ok(first !== undefined);
  assert.equal(first.from, enter.frame + enter.durationInFrames);
});

test("the exit occupies real frames, and the parent's next word waits for them", async () => {
  const scene = only(await compile());
  const exit = scene.calls.find(
    (call) => call.kind === "exit" && call.into === "root/paying",
  );
  assert.ok(exit !== undefined);

  const resumed = scene.clips.findLast((clip) => clip.scope === "root");
  assert.ok(resumed !== undefined);
  assert.equal(resumed.from, exit.frame + exit.durationInFrames);
});

test("an anchor three modules down resolves to its own element, by address", async () => {
  const scene = only(await compile());
  const anchor = scene.anchors.find(
    (entry) => entry.address === "root/paying/check/allowed",
  );
  assert.ok(anchor !== undefined);
  assert.equal(anchor.id, "allowed");
  // Entities first, then interiors in entity order, recursively: root's three, then paying's
  // three, then check's two. The address is what found it; the index is what it found.
  assert.equal(anchor.elementIndex, 3 + 3 + 1);
});

test("compiling the same source twice produces the same stack, frame for frame", async () => {
  const [first, second] = await Promise.all([compile(), compile()]);
  assert.deepEqual(narrativeStack(only(first)), narrativeStack(only(second)));
  assert.equal(first.totalFrames, second.totalFrames);
});

test("a deck that never descends carries no calls and no stack", async () => {
  const flat = `
title: A deck
slides:
  - slide:
      title: One
      bullets:
        - id: a
          text: First
    say:
      - speech: "First."
        activates: a
`;
  const scene = only(await compile(flat));
  assert.deepEqual(scene.calls, []);
  assert.deepEqual(transcript(scene), ["narrate root"]);
  assert.equal(stackProblem(scene), undefined);
  assert.deepEqual(
    scene.clips.map((clip) => clip.scope),
    ["root"],
  );
});
