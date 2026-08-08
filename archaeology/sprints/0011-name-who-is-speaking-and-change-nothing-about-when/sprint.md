---
id: spr_01KZHF7205JE9TQ1HJRVMCXM6H
sequence: 11
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
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

## Outcome

Every success criterion was met except one, and the exception is an act rather than a result: the
rendered example has been measured but **not yet listened to by a person**. Everything below the
perceptual gate is verified; the gate itself is described honestly at the end.

    src/presentation/narrator.ts     159   what a narrator is, and what a bad one is told
    src/presentation/parse.ts       +232   three lexical scopes, one resolution, four refusals
    src/compile/compile.ts           +58   one lookup, and two more fields on a clip
    beat.ts, cue.ts, cli.ts          +35   a protocol's steps, a cue's field, a printed line
    examples/aside.yaml               82   the film
    tests                           +720

No change to the renderer, to the timeline, to the camera, to the anchor model, or to decision:4's
synthesis seam.

### 1. Did adding identity cost anything in time?

**Nothing, and this is checkable rather than argued.** Three shipped decks were compiled at the
commit before this round and again after it, with the real Kokoro and the WAVs hashed:

    examples/witnessglass.yaml   12 clips    byte-identical, same offsets, same sceneMs
    examples/tap.yaml            10 clips    byte-identical
    examples/order/order.yaml    20 clips    byte-identical

`examples/tap.yaml` exercises the changed `protocolCues` signature and `examples/order/` exercises
the changed module resolver, so the two paths most likely to have drifted are the two with the
strongest evidence. A unit test makes the same claim on the compiled record: two decks differing
only in who speaks produce the same clips at the same offsets with the same scene length.

### 2. Was the schema shape right?

**Yes, and the two refusals were the load-bearing parts.** A narrator id never becomes a structural
key, so the grammar is still statically readable and `SPEECH_CUE_KEYS` still enumerates what a cue
may contain. A cue carries a *name* and not a voice, so `examples/aside.yaml` mentions `af_heart`
once, in the cast, and changing the second voice is one edit.

What made it small was that the three scopes already existed. `defaults.narrator` sits beside
`defaults.voice`, a slide's `narrator:` sits beside its `pre_say:`, and a cue's sits beside its
`activates:`, so nothing new had to be invented about *where* an author says things — only about
what they say there.

### 3. Was lexical resolution actually simpler than the stateful rule?

**Yes, and by more than expected.** Resolution is one expression evaluated per cue, with no state
to carry and nothing to reset at a slide boundary. The stateful alternative would have needed a
carrier through `bindNarration`'s splice — which is where a module's cues are spliced into the
parent's list — and would have had to answer what a descent does to the current speaker. The
lexical rule answers that by construction and needed no code to do it.

### 4. What did the rule cost at the one scope it does not fit?

**A module.** decision:31 refuses to let a module declare `defaults`, so a module cannot say who
speaks it, and its cues take the narrator of the slide that entered them. That is the one place in
the chain where a cue's meaning depends on something outside its own file, which is precisely the
property the lexical rule exists to provide. Recorded as dragon:20 rather than solved: the case that
distinguishes the two candidate rules — one module entered from two slides — does not exist in any
deck, so choosing between them now would be choosing without evidence.

### 5. Was the temptation to infer a speaker real?

**Very.** `examples/tap.yaml` has five named actors and each narrated step already knows which one
sent it; wiring `from:` to a narrator is about four lines and would have produced a demo that sounds
impressive immediately. It is refused in `beat.ts` with the reason in the source: an actor is a
party to an exchange and a narrator is who is telling you about it, and a protocol whose lanes
started speaking for themselves is a dialogue system with no way to turn it off. A protocol's steps
take their slide's narrator, like every other cue.

### 6. Does the film prove what it was built to prove?

**Measured yes; heard, not yet.** `examples/aside.yaml` renders in 53.1s, two slides, seven clips,
`index` and `statement` layouts, at 1920x1080/h264+aac. Its narration was analysed rather than
listened to:

    reader (af_heart)   median f0   195, 198, 197, 202 Hz
    aside  (bm_george)  median f0   141, 142, 142 Hz

A separation of about half an octave, consistent within each narrator across both slides and across
two different layouts — plus an accent difference the pitch does not capture. Whatever else is true,
these are two speakers and not one.

And the handovers cost nothing in pacing. Silence between consecutive clips, measured from the
audio:

    reader -> aside     726 ms          aside -> reader     841 ms
    aside  -> reader    757 ms          reader -> reader    852 ms
    reader -> aside     893 ms

The one same-voice boundary sits *inside* the range of the four speaker changes, which is the whole
claim: the variation at a handover is Kokoro's ordinary per-utterance edge silence (277-329 ms
leading, 445-564 ms trailing, decision:11's numbers) and nothing about a change of speaker adds to
it. Two frames were inspected and the composition is unchanged, as it should be — a viewer must not
be able to see who is speaking.

**What remains is the listen.** The aesthetic gate this project holds itself to is a person watching
the film end to end, and that has not happened. `out/aside.mp4` is where the round left it.

### 7. What was deliberately not built

`@aside` inline sugar (idea:18), narrator-aware visual treatment of any kind, overlapping or
concurrent speech, per-narrator anything beyond voice and speed (dragon:3), a provider-level narrator
abstraction, and any inference of a speaker from content. The cast is also not addressable by the
renderer: nothing downstream of `compile.ts` knows a narrator exists.

### Recommendation

**Retain.** It cannot make an existing deck worse — three of them are byte-identical — and it is one
argument to one synthesis call, chosen by one expression. The two things worth watching are dragon:20
and whether the object form starts to read as configuration in a deck that alternates more than this
one does (idea:18).
