---
id: dec_01KZMB5895NDB24PV0250AKC2M
sequence: 63
kind: decision
status: accepted
created: 2026-08-09
---

# Keep one producer of presentation time, and lower any yield onto its cursor

## Context

sprint:30 asked whether cuecraft's timeline is best understood as the execution trace of
cooperatively scheduled temporal producers — and whether making that scheduler explicit would let a
temporal medium yield presentation time back to the narration and resume from where it stopped.

The archaeology says the first half is nearly true, the second half does not follow from it, and the
useful part of the idea is somewhere else entirely.

### How time is actually constructed

The pipeline is not the assumed one. Correcting it matters, because two of the stages are where the
answer lives:

    read
      -> parsePresentation      nest.ts splices `enter:` into `enter, <callee cues>, exit`
                                recall.ts resolves each `recall:` to a slide ordinal
                                beat.ts lowers a silent step into a `dwell` with a derived length
      -> materializePresentation  R runs; a PNG, an SVG or a table comes back. No time at all.
      -> compilePresentation    synthesize each speech cue, measure it, accumulate `offsetSeconds`
                                sceneMs = max(min_slide, pre_say + narration + post_say)
      -> buildTimeline          framesFor(); ONE cursor per slide over the merged track;
                                scene.from is a prefix sum; anchors/spans/beats/recalls resolved;
                                facts frozen; subtitles derived
      -> render                 React reads absolute frames; camera plans are built in the browser

**Relative seconds become absolute frames in exactly one place**: `buildTimeline`. Everything
before it is local — `offsetSeconds` is measured from the start of a slide's own narration — and
everything after it is a pure function of absolute frames. So the briefing's local/logical/global
distinction is not a proposal for cuecraft. It is a description of cuecraft, with the boundary at
`timeline.ts:518`.

### There is exactly one producer, and this was checked by enumeration

Presentation time is extended by exactly two things: a slide's flattened cue list, and three
authored per-slide paddings (`pre_say`, `post_say`, `min_slide`). Nothing else can lengthen the
film. The cue list has five occupant kinds and their durations come by four different routes —
**measured** (speech), **authored** (pause), **derived** (dwell, from label length, `beat.ts`),
**constant** (`ENTER_MS`/`EXIT_MS`) and **borrowed** (recall, from a clip measured on an earlier
slide). All five are known before the cursor reaches them.

Everything else in cuecraft is a *consumer* that fits into time the narration already created, and
that cannot ask for more of it: the camera plan (`cameraPlan` takes a `span` and clamps into it),
portal passes, anchor transients, attention handovers, spans, beats, subtitles, facts, scene fades.
A camera move's length is asked of `interpolateZoom` and then squeezed into the gap; it never
lengthens a shot by a frame.

### Nothing blocks, and BLOCKED is unreachable

Modelled against READY / BLOCKED / DONE, every construct collapses to *run to completion*:

| construct | maps to | how |
| --- | --- | --- |
| speech clip | run | duration measured before placement |
| pause, dwell | run | silence with a length |
| `enter`/`exit` | **already lowered** | `bindNarration` splices the callee's cues into the caller's list at parse time |
| recall | run (leaf) | root's own cursor advances by a borrowed duration |
| camera, portals, attention | not a producer | consumes a window, cannot request one |
| scene extent | run | `max(min_slide, pre + narration + post)` |

There is no construct anywhere that waits on another, because there is nothing whose duration is
unknown when the cursor arrives. The one genuine block in the whole system is at **build** time, not
presentation time: `compilePresentation` awaits the synthesizer, which is dragon:1's ordering
constraint and not a scheduling one.

Two findings inside that table are worth stating outright.

**The call stack is a compile-time fiction, deliberately.** `bindNarration` inlines a descent before
anything is measured; by the time `buildTimeline` runs there is no stack, only a flat list.
`stackProblem` reconstructs the balanced-parenthesis structure *to assert that flattening preserved
it*, and it is reachable only from tests. So the coroutine in cuecraft was already compiled away, at
the earliest possible stage, in the round that introduced it (decision:31).

**Recall is not a call, whatever its docstring says.** `cue.ts` claims a recall borrows call
semantics — "the callee owns the stream, and completion returns." The implementation is a leaf:
`compile.ts` advances `offsetSeconds` by the source clip's measured duration and root keeps the
floor throughout. What is genuinely there, and is more interesting than a scope transfer, is in
`RecalledCanvas`: the renderer draws an *earlier interval of the film* at a remapped local time,
`sourceFrom + (frame - from)`, and sprint:15 proved that frame byte-identical to its original. That
is a working, tested time-remap primitive. A freeze is the same expression with a slope of zero.

### The cluster hypothesis failed

The round's main job was to test whether four open dragons are one symptom. They are not:

- **dragon:12** (`ENTER_MS` is neither authored nor derived). A scheduler decides *who* owns time,
  never *how long* a threshold takes. Untouched.
- **dragon:15** (a fill and its boundary on different clocks). This is the camera needing time it
  cannot ask for. A scheduler that fixed it would have to make the camera a producer — which
  inverts the dependency decision:22 spent a round refusing and breaks decision:9's rule that
  nothing downstream changes derived timing. Made *worse*, not better.
- **dragon:24** (two narrators cannot interrupt). Interruption is preemption over a shared audio
  channel. Cooperative yielding is explicitly not that, and the dragon has already named the danger
  in the project's own words: two parallel narration tracks are "a timeline engine, and decision:5
  says cuecraft does not build one of those."
- **dragon:27** (a body can be introduced but not concluded). A lowering and ordering question in
  the parser. Nothing to do with ownership.

Four for four. The dragons are better characterised for having been asked — dragon:15 and dragon:12
are both instances of *a consumer with no way to request time*, which is a sharper statement than
either carried before — but no scheduler closes any of them.

### There is no temporal medium to schedule

Decisively: cuecraft contains no video, no animation, and nothing with a time axis of its own. No
`<Video>`, no `OffthreadVideo`, no frame sequence. An exhibit is a still PNG, an SVG or a table
(decision:55). The abstraction was being evaluated for a producer that does not exist, and the scene
type that would supply one sits inside idea:1 and idea:2, parked behind decision:2.

## Decision

**The verdict is YELLOW, and it splits cleanly along the seam the investigation found.**

**The runtime scheduler is refused.** Making READY / BLOCKED / DONE explicit would add ownership
vocabulary to describe a straight line with one producer, no blocking, and a call stack that is
already inlined before frame zero. It would be a second description of `timeline.ts:518`, and a
second description of a cursor is a second thing to keep in step. Applied to the one place it
appears to promise something — letting the camera negotiate for the frames it needs — it inverts a
dependency two decisions exist to hold.

**The lowering is adopted as the design, and is not built.** If a temporal medium ever arrives, it
does not get a scheduler and does not get a clock. It lowers, before frames exist, to ordinary leaf
occupants of the one cursor:

    medium 20s, semantic events A@5s and B@14s, narration subscribing to both

      ->  slice[0,5]   aside(A)   slice[5,14]   aside(B)   slice[14,20]

Five cues on the existing track, each with a known duration, walked by the existing cursor under the
existing rounding rule. Nothing downstream of `buildTimeline` learns a new concept, and
`framesFor` stays the only conversion in the codebase.

**Where it lowers is settled by what is known when.** The *structure* lowers in `bindNarration`,
beside the descent it resembles. The *timestamps* cannot: a medium's duration and the local times of
its semantic events are measurements, and they belong at the `materializePresentation` stage for
exactly the reason exhibits are there — a broken medium should not cost a minute of Kokoro. The
compiler then places slices by borrowed duration exactly as it places a recall. That ordering is the
whole feasibility argument, and it holds.

**Rendezvous is the right semantic idea and survives.** `activates:` is narration → representation;
a medium reaching a state and handing back the floor is the dual. Because compilation has complete
foreknowledge, the set of yields is `media annotations ∩ narrative subscriptions` — a medium may be
densely annotated while only subscribed events become boundaries, and several cues subscribed to one
event produce one rendezvous with an ordered queue. None of that needs a runtime; it is a set
intersection at compile time.

**What is refused permanently, not just for now:** anything that lets a consumer extend the
timeline, any second clock, any overlap, and any absolute timestamp authored in the source.

## Consequences

- sprint:30 closes without implementation, which is the outcome its non-goals were written to make
  possible. No production code changed.
- The design is parked as idea:27 with the gate that would unpark it. It is deliberately parked
  behind a *scene type* decision rather than behind this one: the scheduling question turned out to
  be the small part, and "cuecraft can show a medium with a time axis" is the large one that
  decision:2 requires a decision for.
- The four dragons stay open and are cited here so the failed hypothesis is not re-run. dragon:15
  and dragon:12 gain a shared characterisation — a consumer that cannot request time — which is
  where a future round should look instead.
- `cue.ts`'s claim that a recall borrows call semantics is now known to be aspirational. It is not
  corrected here because the *authoring* semantics it describes are true and the implementation note
  belongs where somebody would look for it; this decision is that place.
- The renderer cost of the parked design was priced rather than guessed, and it is small: Remotion
  already exports `OffthreadVideo`, `Freeze` and `Sequence`, so a frozen-then-resumed medium is
  three sequences over one source with no new timing machinery — decision:5's bargain, unchanged.
- Instant replay, if it is ever wanted, is architecturally already present under a different noun.
  `RecalledCanvas` remaps an earlier interval of the film to a shifted local time and was proven
  byte-identical; replaying an interval of a medium is that mapping with a different source.
- The strongest thing the round can claim is narrower than the hypothesis and better evidenced than
  it: the final timeline **is** the deterministic execution trace of a declarative temporal program,
  and that program is straight-line. Every call is inlined before frame zero, every duration is
  known before its cursor arrives, and the trace is a prefix sum. That is why there is no scheduler
  to expose — not because one is hiding, but because the compiler already ran it.
