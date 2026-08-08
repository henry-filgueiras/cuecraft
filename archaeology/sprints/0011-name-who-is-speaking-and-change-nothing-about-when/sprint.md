---
id: spr_01KZHF7205JE9TQ1HJRVMCXM6H
sequence: 11
kind: sprint
status: active
created: 2026-08-08
---

# Name who is speaking, and change nothing about when

## Goal

Let a deck name more than one narrator and choose which one speaks an utterance, **without the
narration stream becoming anything other than one totally ordered sequence of clips whose measured
durations set the timing**.

The invariant is the experiment: *narrator selection changes who synthesizes an utterance, not how
narration participates in time.* Two voices never overlap, nothing is mixed, no clip moves, and a
deck that names no narrator renders exactly the audio it renders today.

## Rationale

**Kokoro already has 28 voices and cuecraft can reach exactly one of them per deck.** `defaults.voice`
is deck-wide, and decision:11 made narration an ordered list of cues without giving a cue anything
to say about who says it. Everything needed for a second voice is already in the pipeline — the
synthesis seam takes a voice per call (`compile.ts` passes the same one every time), and each cue is
already its own synthesis call and its own clip. What is missing is a name.

**Why identity rather than a voice string on a cue.** `voice: am_adam` on a cue would work and would
be the wrong shape: it puts a vendor tensor name in the narration, repeats it at every utterance,
and makes changing the second voice a find-and-replace. decision:38 separated *who an actor is* from
*where the picture puts it* for exactly this reason, and the same split applies here — a narrator is
an identity the deck declares once; a Kokoro voice is how that identity is currently realised. It is
also the precedent decision:14 set for `activates`/`address`: the author names a thing, the compiler
resolves it.

**Why resolution must be lexical.** The tempting rule is "the last narrator wins until somebody
changes it", because it reads like a screenplay. It is a state machine hiding in a data format:
inserting a sentence changes who speaks the sentence after it, and a cue can no longer be read
without reading everything above it. Cuecraft has refused this shape once already — decision:9 says
nothing downstream changes derived timing, and the same argument applies to derived identity. So a
cue's narrator comes from the cue, or from its slide, or from the deck, and from nowhere else.

**Why this is not a dialogue system.** The thing under test is whether *identity* can be added to
the existing serial narration stream at the cost of one word in the grammar. Concurrency, turn
taking, characters, per-speaker visual treatment and inline `@name` sugar are all separately
interesting and all separately expensive, and each of them would make the answer to this round's
question unrecoverable. A protocol's actors are especially tempting — `examples/tap.yaml` has five
of them and they are already named — and mapping actors to narrators automatically is precisely the
inference this round refuses.

## Success criteria

**Grammar**

- A deck declares a cast: `narrators: { ada: { voice: af_heart } }`, top level, ids checked the way
  every other identity in the format is checked.
- Selection is available at three lexical scopes — deck (`defaults.narrator`), slide, and
  utterance — and an utterance's `narrator:` is a key on the existing speech-cue object, not a new
  cue kind and not an author-named YAML key.
- No arbitrary narrator id ever becomes a structural key. The grammar stays statically readable.

**Semantics**

- `utterance ?? slide ?? deck ?? the deck's existing voice` and nothing else. An explicit narrator on
  one utterance never reaches the next one.
- An unknown narrator id is a parse error naming the declared cast, at every one of the three
  scopes, including inside a child module.
- A deck that declares no narrators compiles to byte-identical synthesis requests. `defaults.voice`
  remains the whole story for every existing deck, and no deck has to declare a narrator to keep
  working.

**Time**

- Clip count, clip order, offsets, scene lengths and anchor frames are unchanged by narrator
  selection. Two decks differing only in which narrator speaks a cue produce the same timeline shape
  for the same measured durations.

**Evidence**

- Tests covering: no narrators declared, deck-level selection, slide-level override, per-utterance
  override, the return to the lexical narrator after an override, unknown ids, distinct voices
  reaching the synthesizer, and unchanged sequential timing. Tested on resolved state — cues, clips
  and synthesis requests — not only on whether the YAML parsed.
- A small example rendered through the ordinary pipeline in which primary → other → primary is
  audible, and in which nothing about the pacing sounds different from any other cuecraft film.

**Engineering**

- `npm run check` and `scarp doctor` clean.

## Non-goals

**`@meta some dialogue` inline sugar.** Deferred on purpose: cuecraft has no inline syntax anywhere
(decision:11 refused it once), and a shorthand should be designed against the whole family of
anchors, triggers and shorthands at once rather than one at a time.

**Automatic speaker inference.** No mapping from protocol actors, world entities, or anything else
to narrators. A protocol's step narration takes its slide's narrator like every other cue.

**Overlapping speech, dialogue concurrency, turn-taking policy.** One stream, one speaker at a time.
This is the invariant, not an omission.

**Avatars, characters, per-speaker camera or visual treatment.** Nothing in the renderer changes. If
a viewer can see who is speaking, this round did something wrong.

**Emotion, style, acting direction.** dragon:3 still holds: Kokoro's control surface is voice and
speed, and a control that silently does nothing is worse than no control.

**Persistent "last narrator wins" state.** Refused above, in the rationale, and it is the single
most likely thing to be asked for.

**A provider-level narrator abstraction.** decision:4's interface is unchanged and unwidened. A
narrator is a name for arguments that seam already accepts.
