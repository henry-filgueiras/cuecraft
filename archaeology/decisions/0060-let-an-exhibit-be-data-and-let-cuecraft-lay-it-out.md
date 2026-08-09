---
id: dec_01KZKZGCEHPW3EM8AYF2ZKE1C2
sequence: 60
kind: decision
status: accepted
created: 2026-08-09
---

# Let an exhibit be data, and let cuecraft lay it out

## Context

decision:55 defines an exhibit as content cuecraft cannot read: "a rectangle of pixels produced by
a program in another language, and there is nothing in it to read." Every refusal in that decision —
no `image:` key, no checked-in asset, no fallback — is about **pixels**, and specifically about a
picture that could be stale, hand-edited, or committed.

None of those objections survives the artifact being **data**. A CSV a program computed on this run
cannot be stale for the same reason its PNG cannot; it cannot be hand-edited into the repository for
the same reason; and unlike a picture, it is something cuecraft can *read*. So the boundary
decision:55 actually draws is not "content cuecraft cannot understand". It is **content cuecraft did
not compute**, and the picture was only ever the first instance of it.

## Decision

**A program may hand back structured data, and cuecraft lays it out itself.**

`csv` is a third output type in decision:56's protocol, and it is deliberately the most boring part
of this round: R writes a file, declares it with the same one-line `cat()`, and every existing
guarantee — the emptied output directory, declared-not-scanned, containment, existence, non-empty —
applies unchanged. cuecraft parses it into strings and **acquires no types**: it does not know a
column is numeric, does not parse a date, and does not format a number. R formatted them, because R
is the half that knows what they mean.

**The composition is chosen from what came back, not from what the deck wrote.** A slide says `run:`
and `with:`; whether it becomes a picture or a table is decided by what the program declares. That
is decision:10's rule — composition from the shape of the content — reaching one step further out
than it ever has, because here the shape is not knowable until a subprocess has finished. There is
no `table:` key and no `svg:` key, and adding one would be an author choosing a layout.

**Identities are generated from the data.** A row addresses as `row-<key>` and a column as
`column-<header>`, both slugged. The prefix is load-bearing: `row-west` and `column-west` are
different objects on one table. Two rows that slug to one identity is a refusal, not a merge.

**`activates:` addresses identities and will never take a query.** No `#id=`, no predicate, no CSS
selector, no column expression, no SQL. The reason is not taste: an anchor resolves at *parse time*
against a list of names, and a query is a thing that would have to be *evaluated* against data that
does not exist yet. Identities are the only addressing this format can have without giving the
compiler a runtime.

**One key is added to `exhibit:` and it is a name, not a mechanism.** `key: segment` says which
column the deck intends to address rows by. It does not select, filter, order or compute. Guessing
was the alternative — "the first column is the key" is true of every pivot R will ever write — and a
guess that is right most of the time produces identities that silently change meaning the day a
program's output gains a column. It is authored rather than declared by the program for decision:57's
reason: reading the YAML should tell you what the slide can be asked about without running R.

**`shows:` is checked one way for a table**, for the same reason as decision:59's drawing: a hundred
rows produce a hundred names, the set changes when the data does, and a deck cannot be asked to
enumerate them. A name the deck shows and the data does not generate is still a refusal, because
that is the half that stops a highlight landing on nothing.

**The exhibit owns its viewport.** Narration says `activates: row-south-ember` and means *pay
attention to South's Ember line*. Whether that row is on screen is not the author's problem and
there is no key with which it could be made one — the table works out that it has to move, and by
how much, and does it. The position on a frame is folded over the *claims* rather than over the
frames, so it is a pure function of the narration: a still at frame 900 is the same still whether it
was rendered alone or after 899 others. Minimum movement, one row of air, no inertia, no history.

**A row is a fixed height, chosen from the worst cell in the table, and anything that still does not
fit is elided.** dragon:26 is a composition that let a wrapped cell draw through the subtitle band;
the defence here is arithmetic rather than vigilance, because the bound is computed from the content
before a single row is drawn. Uniform height is also what makes "reveal row 73" a multiplication
rather than a running sum.

## Consequences

- **cuecraft is now laying out content it did not compute**, which is new and is the point. It
  chooses the type size, the column widths, the alignment, the elision and the viewport — and an
  author writes none of them and has no key for any of them.
- **One inference exists and it is about setting type, not about data.** A column whose every value
  reads as a figure is set right, with tabular figures. cuecraft still does not parse the number.
- **The ceilings are where the promise breaks.** Two hundred rows, because past that a table is not
  something narration could walk through; eight columns, because an eighth of the content box is
  about twelve characters, which is where a column stops holding a value.
- **A long cell is expensive for every row.** The row height comes from the worst cell in the table,
  so one prose column costs the whole table its row count. That is the price of a viewport whose
  arithmetic is a multiplication, and it is a real cost — see the dragon.
- **The register keeps no residue.** A row narration has left is drawn from the same expressions as
  a row narration never reached. decision:58 keeps a quiet mark on a chart region deliberately; four
  marked regions is an annotated chart and forty marked rows is a mess.
- **The table says what it is not showing.** "rows 11–16 of 24", derived from the same viewport the
  rows are drawn from. A table that silently shows six of twenty-four is asserting that there are
  six, which is the failure `series` was added to fix for counts.
- **Still no cache, still no `data:` key, still one output per slide.** Everything decision:55
  refused about pixels is refused about data, and for the same reasons.
