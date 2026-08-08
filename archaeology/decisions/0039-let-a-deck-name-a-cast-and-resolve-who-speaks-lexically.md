---
id: dec_01KZHG43X5014KF0HQSNZC3W7S
sequence: 39
kind: decision
status: accepted
created: 2026-08-08
---

# Let a deck name a cast, and resolve who speaks lexically

## Context

A deck could reach exactly one of Kokoro's twenty-eight voices. `defaults.voice` is deck-wide, and
decision:11 made narration an ordered list of cues without giving a cue anything to say about who
says it.

Everything a second voice needs was already in the pipeline. The synthesis seam takes a voice per
call and `compilePresentation` was passing the same one every time; each speech cue is already its
own call, its own clip, and its own measured length. What was missing was a name.

The question was therefore never "can two voices be synthesized" — it was what the *format* should
say, and what the addition must not be allowed to become. Three shapes were available and two of
them were refused:

- **A voice on a cue** (`speech: "...", voice: am_adam`). Works, and puts a vendor tensor name in
  the middle of the narration, once per utterance, so that changing the second voice is a
  find-and-replace and moving providers is a rewrite of every deck.
- **A narrator id as a YAML key** (`- meta: "Hello."`). Reads beautifully and destroys the grammar:
  the set of structural keys becomes whatever names an author invented, so a parser can no longer
  say what a cue may contain, and no future key can be added without colliding with somebody's
  cast.
- **A narrator id as a value of a known key**, which is what was built.

The second question was **when** selection resolves. "The last narrator wins until somebody changes
it" reads like a screenplay and is a state machine hiding in a data format: inserting a sentence
changes who speaks the sentence after it, and no cue can be read without reading everything above
it.

## Decision

A deck declares a **cast** and cues **select** from it. A narrator is an identity; a voice is how
that identity is currently realised.

```yaml
narrators:
  reader: { voice: af_heart }
  aside: { voice: bm_george, speed: 0.95 }

defaults:
  narrator: reader

slides:
  - slide: { title: "..." }
    narrator: aside          # this slide
    say:
      - "Spoken by aside."
      - speech: "By reader, once."
        narrator: reader     # this sentence, and not the next one
      - "By aside again."
```

**Resolution is lexical and evaluated per cue**: the cue's own narrator, else its slide's, else the
deck's, else the deck's `voice` — which is the whole of what every deck written before this used and
keeps using. Nothing is inherited from the *preceding* cue. A slide is a scope for the same reason
`pre_say` is: it is where an author states something once about a slide rather than about a
sentence.

Two further placements fall out of that rule rather than being chosen:

- **A protocol's steps take their slide's narrator.** An actor is a party to an exchange; a narrator
  is who is telling you about it. Nothing maps one onto the other (decision:34, decision:38).
- **A child module takes the narrator of the slide that entered it.** A module may declare no
  `defaults` of its own (decision:31), so it has no cast and no narrator to declare; its cues may
  still name one of the deck's, one at a time. This is the one place selection is not textually
  local, and dragon:20 holds the question.

**A narrator is a voice and a speed**, because that is the whole of Kokoro's control surface
(dragon:3). Speed falls back to the deck's. Nothing else may be declared: no emphasis, no style, no
delivery instruction, on decision:6's unchanged argument that a control the provider cannot honour
is worse than no control.

**Voice names are not validated by the parser.** A narrator id is a fact about the document and is
checked there, with the cast listed; a voice name is the provider's and is checked by the synthesis
seam, which already rejects an unknown one by name with the full list. `defaults.voice` was never
parser-checked either, and teaching the presentation layer Kokoro's voice table would be the parser
importing the provider to duplicate a check.

## Consequences

- **Narration is still one totally ordered stream, and the timing arithmetic did not change.** Clip
  offsets, scene lengths and anchor frames are computed from measured audio exactly as before, and
  no branch in that arithmetic mentions a narrator. Two decks differing only in who speaks compile
  to the same track — there is a test that says so. This is the invariant the whole design exists to
  keep, and it is what makes the feature cheap: a narrator is one argument to one synthesis call.
- **decision:4's seam is unwidened.** `SynthesizeNarration` keeps its signature. A narrator is a
  name for arguments that interface already accepted.
- **A `SpeechClip` now records who spoke it as well as what it was synthesized at**, which is the
  `activates`/`address` split applied to identity: the name survives a change of provider and the
  voice does not.
- **`Narration.voice` is now the slide's *opening* voice** rather than its only one, and the clips
  are authoritative. `cuecraft render` prints every voice a slide used.
- **Cache keys, when decision:3's cache is built, must include the resolved voice and speed.** Two
  cues with the same words and different narrators are different audio, and a cache keyed on text
  alone would return the wrong speaker rather than a stale one.
- **A narrator is not a character.** No avatar, no per-speaker visual treatment, no camera behaviour,
  no concurrency, and no automatic inference of a speaker from anything in the content. Adding
  identity to a serial stream cost one word in the grammar; a cast that could appear on screen is a
  different project and would have to argue for itself.
- **Inline `@aside some dialogue` is deliberately deferred.** cuecraft has no inline syntax anywhere,
  decision:11 refused it once, and a shorthand should be designed against the whole family of
  anchors, triggers and shorthands rather than one at a time. See idea:18.
