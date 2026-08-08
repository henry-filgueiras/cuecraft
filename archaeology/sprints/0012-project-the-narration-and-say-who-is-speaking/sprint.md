---
id: spr_01KZHJ3XFBSNP18B8VHNSZRCTC
sequence: 12
kind: sprint
status: closed
created: 2026-08-08
closed: 2026-08-08
---

# Project the narration, and say who is speaking

## Goal

Put the narration on screen as **subtitles that are a projection of the compiled timeline and nothing
else** — no second clock, no authored timestamp, no scheduler — and make **who is speaking** legible
when a deck has named a cast.

The invariant is the experiment, and it is decision:9's argument applied one layer further out:
*a subtitle reads the timeline; it never participates in deriving it.* Two decks differing only in
`subtitles:` must produce identical synthesis requests, clips, offsets, measured durations, scene
lengths, anchor frames, calls, beats and totals.

## Rationale

**The next film is a two-narrator technical explainer, and a voice alone does not say who is
talking.** decision:39 gave a deck a cast and refused, deliberately and correctly, to let a viewer
*see* who was speaking — sprint:11's non-goals say "if a viewer can see who is speaking, this round
did something wrong". That was the right refusal for a round whose whole claim was that identity
costs one argument to one synthesis call. It is not a permanent one: the reason it held is that
nothing downstream of `compile.ts` knew a narrator existed, and the question this round asks is
whether a **screen-space projection** of what the compiler already knows is worth having.

**Everything the feature needs is already compiled.** A `SpeechClip` carries its text, its narrator's
declared name, its measured duration and its offset; `buildTimeline` places it at an absolute frame
for a measured length; `freezeFacts` already freezes exactly this and `clipAt()` already answers
"which clip owns this frame". There is no scheduling problem here at all — there is a *selection*
problem over a list that is already final, which is what makes this cheap and what makes a second
timeline the one thing that must not be built.

**decision:28 already settled the hard part of the visual rule.** The observatory's figures put
narration on screen while it is spoken and behave like captions whether or not they were meant to;
decision:28 says an utterance projected as text is lossless — it may wrap, it may resize, it may not
drop a word. A subtitle is that rule's natural home, and `fitQuote` is the mechanism, already pure
and already tested without a browser.

**Whole-cue display is the honest first approximation.** `duration / word count` is available, cheap,
and a lie: speech timing is not uniform across words, punctuation or phonemes. cuecraft's whole
position is that derived timing is measured rather than estimated (decision:13 measures the *onset*
rather than assuming it), and a subtitle that highlights the wrong word at 30fps is worse than one
that does not try. Word timing needs an aligner, and an aligner is a different round.

**Placement is the real design question.** decision:36 took the camera out of the world; a subtitle
must be outside it too, or the thing explaining the picture will move with the picture. But a fixed
bottom band over compositions that fill their frame is how captions cover content, and cuecraft has
seven archetypes that lay out against a margin plus two that deliberately bleed past it. The round
should try the simplest treatment, look at real frames, and record what it finds rather than build a
collision solver.

## Success criteria

**Configuration**

- Opt-in, deck-wide, one key, in a location the format already has. Nothing per-slide, nothing
  per-cue, no styling surface, no positioning surface, no colour surface.
- A deck that does not ask for subtitles renders exactly as it renders today.

**Derivation**

- Subtitle state is derived from the already-final timeline, at or after the freeze boundary
  (decision:27), by a pure function testable without a browser.
- Exactly one clock. No module computes a subtitle's frame from anything except where the compiler
  already put the clip.
- The correct cue is on screen for frames inside its clip's measured interval; the transition from
  one clip to the next happens where the compiler put the boundary; a subtitle never outlives the
  narration of the scene that owns it.

**Identity**

- A cue with a declared narrator reaches the subtitle as a **name**, never as a provider voice
  string. A deck that names no cast never displays `af_heart` or anything derived from it.
- Speaker identity is carried by *text and colour together*, so grayscale or colour-blind viewing
  loses nothing. Colour comes from a palette cuecraft already owns, assigned deterministically.
- Whether labels appear at all is derived from whether the deck actually changes speaker
  (decision:37's stance: withhold a derived notation rather than apply it sometimes).

**Timing invariant**

- A test that compiles the same deck with and without subtitles and asserts equality of synthesis
  requests, clips, offsets, measured durations, scene lengths, anchors, spans, beats, calls and
  total frames.

**Evidence**

- Rendered and *watched*: a focused subtitle example, one ordinary single-narrator film, and
  `examples/aside.yaml`. Stills inspected during development, not only at the end.
- Written answers to: can a viewer tell who is speaking; does the label read as useful or noisy;
  does the subtitle compete with the explanation; is it perceptually stable under camera movement;
  are short and long utterances both acceptable; is `aside.yaml` materially easier to follow.

**Engineering**

- `npm run check` and `scarp doctor` clean.

## Non-goals

**Word-level synchronization of any kind.** No karaoke, no per-word reveal, no uniform fake word
timings, no forced alignment, no recognition. `word duration = clip duration / word count` is
refused explicitly and by name: it is the thing that looks like synchronization and is not one. If
the compiled representation exposes a seam a future aligner would use, that is an idea, not a build.

**A subtitle styling DSL.** No size, colour, position, font, alignment, or per-cue placement in the
format. Typography is a decision cuecraft makes (decision:10), and a subtitle is the last place to
start offering knobs.

**An elaborate narrator colour API.** Stable and distinguishable within one deck is the bar.
Authored narrator colours are refused unless the implementation produces evidence that the derived
assignment fails, and "there is no clean automatic treatment" is a documented limitation rather than
a licence to build a colour system.

**Narrator portraits, avatars, animated characters, lip sync, speaker-specific camera behaviour.**
decision:39's "a narrator is not a character" is unchanged. A label is not a character; a picture of
one is.

**A generalized overlay layout or collision engine.** If a modest reserved region does not solve
placement, that is a dragon.

**Subtitle timestamp authoring, in any spelling.** There is no route from the source to a frame, and
this round does not open one.

**WebVTT/SRT export**, unless a track that already exists makes it fall out in a few lines — and if
it does, it is a consequence, not a goal.

**Changing anything about narration.** No new cue kind, no change to the synthesis seam, no change
to `spokenText`, no change to how a narrator resolves (decision:39), and nothing that makes a
subtitle able to alter what is said or when.

## Outcome

Every success criterion was met, and the one thing worth saying up front is that the round found
**less** than it expected to. The hard parts were supposed to be selection and placement; selection
turned out to be five lines over a list that was already final, and placement turned out to have
one honest answer that the existing archaeology had already argued for twice.

    src/render/subtitle.ts        191   what is on screen now, and who said it
    src/render/subtitles.tsx      171   where it goes, and how it is set
    src/render/theme.ts          +142   one type scale, one palette, one derived band
    parse.ts, compile.ts,          +40   one boolean, carried the way `title` is
      timeline.ts, cli.ts
    layouts.tsx, figures.tsx       +14   five call sites that learn the band from a context
    examples/onscreen.yaml         107   the film
    tests                         +474

No change to synthesis, to the narration seam, to `spokenText`, to the anchor model, to the camera,
or to how a narrator resolves (decision:39).

### 1. Did it cost anything in time?

**Nothing, and it is checkable twice rather than argued.** `examples/witnessglass.yaml` compiled
with and without subtitles against the real Kokoro produces **byte-identical WAVs** for all twelve
clips, and the two timelines are identical in every field except the track — same scene starts,
durations, `narrationFrom`, anchors, spans, beats, calls, `facts` and 1289 total frames. The same
holds for `examples/aside.yaml`, which changes speaker. A unit test makes the claim on the whole
record rather than on a sample: `assert.deepEqual({...on, subtitles: []}, {...off, subtitles: []})`,
plus a second test that the synthesizer received the same requests in the same order.

### 2. Was there a scheduling problem?

**No, and finding that out was the point.** `Timeline` already placed every clip at an absolute
frame for a measured number of frames, and `facts.ts` already answered "which clip owns this frame"
for the observatory's figures. So "which sentence is on screen" is a *lookup*, not a schedule, and
the only genuinely new rule is where a cue stops: at the next utterance of the same scene, else at
the end of that scene's narration. That one rule buys two behaviours worth having — an authored
`pause:` is bridged rather than blinked through, and nothing is ever read over a slide that is
leaving. Both are visible on the contact sheets as the gap before each slide turn.

`subtitleAt` is deliberately *not* `clipAt`: a figure's marker must not vanish in a silence because
it is an instrument, and a subtitle must, because there is no honest thing for it to say when
nobody is speaking.

### 3. Was placement as hard as expected?

**No, because two earlier decisions had already done the work.** decision:36 had established that
the thing looking at a space belongs outside it, which settles screen space. decision:28 had
established that narration set as text is lossless, which settles wrapping and sizing. What was
left was the observation that cuecraft's compositions **fill** their box rather than leaving a gap
— so the room has to be subtracted before layout, not painted over afterwards. That is one derived
number, one extra argument on `bodyBox`, and a context.

The cost is real and was measured rather than assumed: on a one-line title the band takes 197–222px
of a 644px body, about a third. Specimens step down a size, the anchors figure loses a row, the
index list has more air between its rows. Every one of those is a composition doing what it already
does when given less room, and none of it happens to a deck that did not ask.

The two bleeding compositions cannot pay, and are overlaid — dragon:21, with the evidence, which is
that twenty-five sampled frames of `examples/tap.yaml` under an active camera never lost a message
to the overlay.

### 4. Was the label useful or noisy?

**Useful, and the reason is that it is usually absent.** The rule that decides it — labels appear
only when the film actually changes speaker — was written from decision:37 as a matter of
consistency and turned out to be the thing that makes the feature tolerable. `witnessglass.yaml`
with subtitles has no labels anywhere, and reads as a film with its narration written down.
`aside.yaml` has them on every line, and reads as two people.

The palette decision was checked from an unplanned direction. On a 5×6 contact sheet of
`aside.yaml` at quarter scale the names are illegible and the **gold/blue alternation is still
immediate** — you can see the handovers in a thumbnail. That is the argument for carrying identity
twice, arriving as a measurement rather than as a principle.

### 5. What did the renders actually change?

Four things, none of which was obvious in source:

- **Weight 500 was too heavy.** At 42px it was the brightest thing on a frame whose bullets had not
  been reached yet, and it competed with the slide. 400 sits under the composition where it belongs.
- **The first halo was a box.** Three stacked shadows with a 26px blur produced a visible dark
  rectangle behind a short cue — precisely the "gratuitous subtitle box" the brief refused, arrived
  at by accident. Two tighter shadows leave nothing to see.
- **Bottom-anchoring made the text move.** A one-line cue sat lower than a two-line one, so the
  first line a viewer reads shifted between sentences. Anchoring the block's top edge inside the
  band fixed it, and it is a two-word change that would never have been made from source.
- **A long sentence sets the whole deck's size.** `onscreen.yaml`'s longest cue is 167 characters,
  so all of it is set at 32px. A three-line cap at full size was worked out on paper and costs
  294px of every composition; 32px was checked on a rendered frame and reads. Fitting per cue is
  refused outright — type resizing under every full stop is the most distracting thing that could
  happen down there.

### 6. Is `aside.yaml` easier to follow?

**Yes, and less than expected, for a reason that is a finding rather than a disappointment.**
`aside.yaml` was written to prove the opposite claim — that a change of speaker is *audible* and
invisible — and it is a two-slide film whose subject is the handover itself. A viewer of that deck
was never confused about who was speaking, because the deck keeps telling them.

Where the subtitles help is the thing that deck cannot show: on a film about something *else*,
where the speaker change is incidental to the argument, a viewer has no cue to fall back on.
`onscreen.yaml` is the honest test — a handover in the middle of an explanation — and there the
label is the difference between noticing the change and having to work it out.

### 7. What this means for the two-narrator explainer

Three things, all of which change the plan:

- **Subtitles should be on**, and the deck should be written knowing the band exists. A third of
  the body box is not a surprise to absorb at the end.
- **Narrator ids are on screen now.** `reader` and `aside` are decent names for a demo and
  `BUILDER`/`REVIEWER` are what a viewer reads as a role. Naming the cast is now a writing decision
  rather than a configuration one.
- **Two speakers is the shape this is good at, and probably the limit.** Four colours exist and the
  fourth is a pale lavender; a film with three narrators would work and a film with five would be
  carried by the names alone.

### 8. What was deliberately not built

Word-level reveal, karaoke, uniform fake word timings, forced alignment (idea:19 holds the seam,
which is the post-synthesis *measurement* step rather than the synthesis seam), recognition,
subtitle timestamps in any spelling, a styling DSL, per-cue positioning, narrator fonts, an authored
colour API, portraits, avatars, lip sync, speaker-driven camera behaviour, and WebVTT/SRT export.
The last of those is now about fifteen lines over `Timeline.subtitles` and was still left alone,
because "it would be cheap" is not a reason and the round did not need it.

### Recommendation

**Retain, opt-in.** It cannot make an existing deck worse — every deck that does not ask for it is
byte-identical and pixel-identical — and where it is asked for it is one boolean, one pure
function and one overlay. The two things worth watching are dragon:21 and whether a deck with three
or more narrators makes the four-colour list start to look like a system that needs designing.
