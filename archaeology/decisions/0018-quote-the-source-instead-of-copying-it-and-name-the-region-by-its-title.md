---
id: dec_01KZCDZTT38CCYD23Z939F5471
sequence: 18
kind: decision
status: accepted
created: 2026-08-06
---

# Quote the source instead of copying it, and name the region by its title

## Context

Every specimen in the self-demo was a hand-written copy of something that already existed in
this repository. idea:10 called that the worst defect this product can have, and it is: a copy
that has drifted looks completely authoritative while asserting something false, and there is
nothing anywhere that can tell. The whole claim of a specimen scene is *this is the source*, and
that claim was being kept true by an author being careful.

So a specimen should be able to name a file and a region of it instead of carrying a copy.

The interesting part was not fetching the text. It was addressing the region.

**The mark grammar does not scale from an excerpt to a file, and finding that out was the
useful part of this round.** decision:16 addresses a mark by what its line *says* — `line: "say:"`
means "the line where `say:` begins" — and idea:10 assumed a `section:` selector could reuse it
directly. It cannot. That grammar works inside a specimen because a specimen is an excerpt
chosen to be unambiguous; a real presentation file has four `- slide:` lines and four `say:`
lines, and every structural opener in it is ambiguous by construction. Requiring the selector to
match exactly one line — which is the right rule — means no structural region of a real deck is
addressable that way at all.

Line numbers were never a candidate (they are the coordinates decision:14 exists to reject). A
YAML path is a line number wearing a hat. A general selector language is the thing CLAUDE.md
says not to build.

## Decision

**A specimen may quote a slide of a presentation file, named by its title.**

```yaml
code:
  file: examples/witnessglass.yaml
  slide: "Coding agents are black boxes"
  marks:
    - id: link
      line: "activates:"
```

`source:` and `file:` are the two forms a specimen can take, and exactly one per specimen. The
inline form is unchanged, because text with no home in the repository is still a legitimate
thing to show.

**Why a slide is the unit.** decision:16 lets a deck set one language, YAML, and the only YAML
cuecraft understands is a presentation. So the space of quotable things is exactly "part of a
deck", and the part of a deck with a durable, author-chosen, structural name is a slide. This is
not a general region selector narrowed for now; it is the only selector this format can honestly
support, and widening it is a decision rather than a knob.

**`language` is not authorable on a quoted specimen.** The extension says what the file is.
Letting the author restate it would create a second place for the truth to live, which is the
defect being fixed.

**The text is verbatim.** Everything from the entry's first key to its last value, comments
included, dedented exactly as YAML's own block scalar dedents an inline specimen. Nothing is
reformatted, summarized or filtered. When the extracted region is ugly, the *file* is ugly, and
the fix is in the file — both example decks moved comments out of the entries they document, and
that was the correct direction of repair.

**Everything fails at parse time, loudly**: a file outside the repository, a file that is not
there, a file that is not a presentation, a title matching zero slides (the error lists the ones
that exist) or two, an extraction that does not re-parse as a slide, and a mark that no longer
matches a line of the quoted text.

**The repository is the boundary.** Relative paths only, resolved against the checkout root,
realpath'd at both ends so a symlink out of the tree is refused rather than followed. No network
source. A deck that can read an arbitrary path is a deck nobody should run on a file they were
sent, and reproducibility from a checkout is a property worth more than the flexibility.

## Consequences

- **A mark on a quoted specimen is a drift detector.** `line: "activates:"` is now a live
  assertion about `examples/witnessglass.yaml`; delete that line from the file and the render
  fails naming the slide and the mark. The specimen cannot lie, and the marks make it check.
- **The closing slide's recursion is now complete.** It used to be a copy that stopped one level
  short: the block that displayed the block was not itself displayed. A quote *names* its source
  instead of containing it, so there is no regress to cut — the frame shows the slide's entire
  source, including the two lines that put it on the frame.
- **Parsing reads the repository, and is no longer pure.** That is the "truthful extraction"
  step, and it belongs before synthesis so a moved file costs nothing. The reader is an argument
  (`ParseOptions.read`), so every test stays deterministic and offline.
- **`SlideBody` moved to its own module.** Once `parse.ts` imported `node:fs`, the Remotion
  bundle inherited it through a chain that existed only to reach `bodyElements`, and webpack
  refused the build. `presentation/body.ts` is the shared content vocabulary; `parse.ts` is the
  validator. That separation was overdue and this forced it.
- **Real source is longer than the excerpt an author would have written.** The self-demo's
  specimen went from ten hand-picked lines to fourteen real ones, and `fitSpecimen` dropped it
  from 44px to 30px. Still presentation type, and a real cost. Quoting trades legibility for
  truth, and the answer is to make the *file* worth quoting rather than to trim the quote.
- **The smallest quotable region is a whole slide.** The self-demo wanted a `say:` block on its
  own and could not ask for one. Sub-slide granularity would need a second addressing mechanism,
  and one was not worth inventing for a want.
