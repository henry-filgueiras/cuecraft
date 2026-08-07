---
id: tsk_01KZEFMY2PNXJTVWPS5Z8WN1J6
sequence: 21
kind: task
status: closed
sprint: spr_01KZEFJJVPNCDAJ6MJHYZCN95M
created: 2026-08-07
closed: 2026-08-07
---

# Add the enter cue, and flatten the narration tree into one stream

## Objective

Add the call site, and compile the tree of narrations into one serial stream.

    say:
      - speech: "Most of the work happens in the paying step."
        activates: payment
      - enter: payment

`enter:` is the third cue kind, and it is the only new word in the narration language. There is no
`exit:`. The child's `say` running out is the return, because the thing this experiment is about
is whether *lexical completion* is the right unwind rule — a world may cycle, fork, or have no
terminal node, and none of that should decide when the camera comes back up.

Flattening happens in the parser, so that everything downstream keeps working on one ordered list
of cues and knows nothing about modules. Synthesis is untouched. Timing is untouched. The only
thing that changes underneath is how an `activates` finds its element: by address rather than by
first matching name, so that two scopes may both call something `check`.

Entry and exit become real pauses on the narration track. That is not a detail — it is the whole
of "the parent must not continue underneath the child", and it falls out of using the mechanism
`pause` already established rather than inventing a second clock.

## Acceptance criteria

- `enter: <id>` is accepted only where `<id>` names an entity, in this scope's world, that carries
  a module. Every other spelling fails with the declared entities listed.
- An entity may be entered at most once per scope.
- A cue may reach anything addressed in its own scope, including an inline `detail`'s elements,
  and may not reach anything inside a child module. The message names the scope.
- `AuthoredSlide.say` is the flattened stream: parent cues, an `enter`, the child's cues, an
  `exit`, and the parent's remaining cues, in that order, each tagged with the scope it was spoken
  in.
- A speech cue that activates something carries the resolved address, and `buildTimeline` resolves
  against addresses rather than names.
- Entry and exit each occupy a fixed, non-zero duration on the narration track, and are the only
  silence between the parent's last word and the child's first.
- Existing decks parse to exactly what they parsed to before, in one scope named `root`.
