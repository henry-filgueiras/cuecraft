---
id: dec_01KZCADSVNE4D5ZG5XVPZCN8VR
sequence: 16
kind: decision
status: accepted
created: 2026-08-06
---

# Delegate the tokenizing, own the palette

## Context

The self-demo shows cuecraft source on screen twice, and those two scenes carry its whole
argument. Unhighlighted, a specimen is a grey wall: the eye has no way to separate the structure
of the document from the prose inside it, and the viewer's first job — "which part of this is
the slide and which part is the narration?" — gets no help at all.

Two things pulled in opposite directions.

CLAUDE.md says not to implement media machinery that mature libraries already own, and a YAML
tokenizer is exactly that even though it looks like an afternoon.

The design language says one accent and four greys. Every syntax theme ships six or eight hues
chosen to look good in an editor on a light background, and dropping one onto this deck makes
the frame look like a screenshot someone pasted into a presentation — which is the single
impression a specimen must not give, because the claim being made is that this *is* the source.

## Decision

**Delegate the tokenizing. Own the palette.**

`highlight.js` core plus the YAML grammar only, and none of its themes. Token classes are mapped
onto `theme.ts` in one place:

    hljs-attr    -> paper, 600      the structure of the specimen
    hljs-string  -> muted           values, which here are mostly the author's own prose
    hljs-bullet  -> dim             list dashes: present, never read
    hljs-number  -> accent

Monochrome plus the one accent. Hierarchy is carried by weight and brightness, exactly as it is
in every other archetype. The result reads as *this deck's* rendering of code rather than as a
transplant, and the accent stays reserved for the thing it means everywhere else in the design:
narration has been here.

**One language.** `language:` accepts `yaml` and rejects everything else with a message saying
why. cuecraft bundles one grammar; a deck asking for another would otherwise render
unhighlighted and look like a styling bug rather than an unsupported language.

**Tokenizing is per line.** The archetype needs a DOM element per line to hang a region's tint
and mark on, and splitting highlight.js's block output apart means re-balancing spans that cross
a newline. The cost is that a construct spanning several lines is tokenized as if each line stood
alone — parked as idea:9.

## Consequences

- One dependency, at 5 MB unpacked, of which the bundle uses the core and one grammar.
- The mapping is the only place in the renderer where CSS is written as a string rather than as
  inline styles, because the tokens arrive as markup. `dangerouslySetInnerHTML` is used on text
  the library has already escaped, and the input is the author's own file.
- Adding a second language costs an import, a grammar registration, and one entry in the accepted
  list. Adding a *second look* is not possible without changing `CODE_COLORS`, which is the
  intent — typography and colour are decisions cuecraft makes (decision:10).
- A specimen the deck cannot highlight is a hard error rather than a quiet fallback, which is the
  same stance the format takes everywhere else.
