---
id: dec_01KZC5SEX4XAZ2CJ1K8WYYBYK7
sequence: 12
kind: decision
status: accepted
created: 2026-08-06
---

# Repair pronunciation one occurrence at a time, by respelling

## Context

"WitnessGlass records the work" was spoken as *REK-erdz* — the plural noun, as in vinyl records —
rather than *ri-KORDZ*, the verb.

The diagnostic matrix locates it precisely. Phonemizing variants through the same eSpeak NG build
kokoro-js uses:

| text | `records` |
| --- | --- |
| `It records the work.` | `ɹᵻkˈoːɹdz` — verb |
| `She records every call.` | `ɹᵻkˈoːɹdz` — verb |
| `WitnessGlass, which records the work.` | `ɹᵻkˈoːɹdz` — verb |
| `The system records every operation.` | `ɹˈɛkɚdz` — **noun** |
| `The agent records the work.` | `ɹˈɛkɚdz` — **noun** |
| `Cuecraft records the work.` | `ɹˈɛkɚdz` — **noun** |
| `WitnessGlass records the work.` | `ɹˈɛkɚdz` — **noun** |

The unusual proper noun is not the cause. `WitnessGlass` phonemizes correctly and separately as
`wˈɪtnəs ɡlˈæs`, and `The system` fails identically. What decides the reading is the *subject*:
eSpeak resolves this heteronym to the verb after a pronoun or a relativizer, and to the noun after
any noun phrase. Its disambiguation is rule-based and pronoun-triggered, not a parser.

So the wrong phonemes are produced before Kokoro is involved. Kokoro receives `ɹˈɛkɚdz` and says
it faithfully. Nothing downstream of phonemization can fix this, and no voice or speed setting
touches it.

Every override mechanism the installed stack might have was checked:

- **eSpeak inline phonemes.** `[[rIk'o:dz]]` and a bare IPA string are both spelled out
  character by character (`ˈɑːɹ ˈɪkoʊ kˈoʊlən...`). The escape is not reachable: the
  `phonemizer` package's entire surface is `phonemize(text, language)` — no SSML flag, no
  phoneme mode, no options object at all.
- **A pronunciation dictionary.** eSpeak supports one; nothing in the JS stack exposes a way to
  supply it, and the wasm build embeds its own data files.
- **Phoneme input to Kokoro.** This one exists. `KokoroTTS.generate_from_ids()` is public and
  `tokenizer` is a public instance field, and feeding it IPA works — `tokenizer("ɹᵻkˈoːɹdz")`
  produces sensible ids. What is missing is a supported way to obtain the *rest* of the
  utterance's phonemes: kokoro-js's normalizer is a module-private function, and reproducing it
  means reimplementing text normalization, punctuation-run splitting, and a dozen phoneme fixups
  that could drift on any upstream release.
- **Targeting a word inside a phoneme string.** Not reliable either way: `WitnessGlass` is one
  text word and two phoneme words, so phoneme position does not track word position.

## Decision

A speech cue may carry `pronounce`: a map from a word appearing in that cue to the spelling used
when synthesizing *that cue only*.

```yaml
- speech: "WitnessGlass records every tool call as a structured event."
  pronounce:
    records: rekords
```

The authored text is left untouched. `spokenText()` derives what is synthesized; `text` stays what
the source says, so the two remain separately inspectable for a future caption or frozen asset.
Substitution is whole-word and case-insensitive, so `recordings` is not touched and `re-records`
is.

Validation rejects a `pronounce` key whose word does not appear in the cue, because such an entry
does nothing and looks like it does something.

## Consequences

- **This is occurrence-scoped by construction, and that is the point.** `records` legitimately has
  two pronunciations, so a deck-wide entry mapping it to one of them would be wrong on the next
  slide. There is no global dictionary and no place to put one.
- **It is a respelling, not a phoneme.** The author is handing eSpeak different letters and
  trusting its letter-to-sound rules, so the result must be verified by listening. `rekords`,
  `recordz` and `rəcords` all produce exactly `ɹᵻkˈoːɹdz`; `re-cords` and `rikordz` do not.
  Recorded here so the next person does not have to search again.
- **It does not scale to systematic pronunciation.** A deck with a recurring product name
  eSpeak mangles would need the entry repeated in every cue. That is the honest cost of refusing
  a dictionary, and the point at which the phoneme route through `generate_from_ids` becomes worth
  its reimplementation risk. Not yet.
- The alternative that was rejected outright: silently rewording the specimen to avoid the
  heteronym. It would have hidden a real limitation behind a prettier artifact.
