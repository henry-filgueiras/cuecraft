---
id: tsk_01KZC8RZ8265E4336MX2YW4CNY
sequence: 17
kind: task
status: closed
sprint: spr_01KZC8JTE9C5CST3JCV1DNSQ3J
created: 2026-08-06
closed: 2026-08-06
---

# Add a code role and the specimen composition

## Objective

Let a slide say that its content is *source code*, and let narration reach parts of it.

Code is not a bullet. Its indentation carries meaning, its line breaks are not reflowable, and
it is the only evidence that can prove the self-demo's central claim. The self-demo needs it
twice and cannot be made without it (task:15, scenes 2 and 6).

    code:
      language: yaml
      source: |
        ...
      marks:
        - id: say
          line: "say:"

A **mark** names a part of the specimen by the line that opens it, not by a line number, and
covers that line plus anything indented beneath it — "the `say:` section", which is how a
reader would say it aloud. A mark that matches no line, or more than one, is a hard error.

Highlighting is delegated, not written here. Token classes are mapped onto the deck's existing
palette rather than a vendor theme: this deck has one accent and four greys, and a rainbow
would destroy the visual system it took three rounds to build.

One composition: **specimen**. A heading above, the block full width beneath it, monospace at
presentation scale.

## Acceptance criteria

- `code` is accepted as a slide's content, alongside `bullets`, and at most one may appear.
- No key in the source names a font, a size, a width, a line number, or a colour.
- A mark's `line` resolves deterministically; zero matches and ambiguous matches both fail
  loudly, naming the slide and the mark.
- Marks are anchor targets exactly as bullets are: `activates` reaches them, timing is derived
  from measured audio, and the same three-state treatment applies.
- Syntax highlighting comes from an established library, is mapped onto `theme.ts`, and is
  recorded as a decision along with the dependency it costs.
- Code is legible at presentation scale on a 1080p frame from across a room.
- Resolution of marks to line spans is unit-tested without a browser.
- The composition is chosen from the role, never named by the author.
