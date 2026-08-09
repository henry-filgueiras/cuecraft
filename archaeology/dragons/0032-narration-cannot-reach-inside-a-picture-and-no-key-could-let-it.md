---
id: drg_01KZKPYZK7NCN0XMT9KSDR15JA
sequence: 32
kind: dragon
status: open
created: 2026-08-09
---

# Narration cannot reach inside a picture, and no key could let it

## Context

`activates:` is the whole of how narration reaches content: a bullet, a formula line, an entity, a
state, a mark inside a specimen. It works because cuecraft laid the content out and therefore knows
where every part of it is.

An exhibit has no parts. Narration cannot reach the third bar, the Asia Pacific panel, or the
gridline at 150, and there is no key an author could write that would let it — `bodyElements`
returns nothing for an exhibit and `bodyAddresses` returns nothing, deliberately.

## Question

This is the first body where the *format's central mechanism does not apply at all*. Every other
gap in the anchoring vocabulary is a gap in coverage — idea:15 wants to reach a phrase inside a
line, idea:19 wants to reach a word — and each of those is a matter of subdividing something
cuecraft already measured. This one is different in kind: the thing to point at exists only inside
a file cuecraft cannot read.

The demo deck works around it and the workaround is invisible: the narration says "Asia Pacific
doubles across the year" while the whole picture sits there, and nothing lights up. It reads fine.
It also means the one composition that most obviously wants a pointer is the one that cannot have
one, and a viewer who has to find the right panel themselves is being asked to do work every other
cuecraft slide does for them.

## Constraints

## Candidate direction

- **Nothing.** An exhibit is opaque by definition, and a format that cannot point inside one is
  telling the truth about what it knows. This is the position `decision:55` takes today.
- **Let the program declare regions**, in its own coordinates, alongside its output. That is an
  extension of the output protocol, not of the anchoring vocabulary, and it would let cuecraft draw
  a mark on a picture whose contents it still cannot read. It is also the first step onto a road
  that ends in a plotting API.
- **Let the program declare several outputs and the narration choose between them** — a build-up of
  three charts rather than one annotated chart. `materializePresentation` refuses more than one
  output today, and that refusal is one line.

## Resolution criteria

A deck whose narration needs to point at one part of a computed picture and visibly cannot. Until
one exists, the opacity is honest rather than limiting.
