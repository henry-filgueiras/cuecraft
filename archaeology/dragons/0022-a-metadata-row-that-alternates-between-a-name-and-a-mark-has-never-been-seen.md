---
id: drg_01KZHNRHNK563YDMHJ13Z6TCV2
sequence: 22
kind: dragon
status: open
created: 2026-08-08
---

# A metadata row that alternates between a name and a mark has never been seen

## Context

decision:41 makes the metadata row unconditional and gives it two possible contents: the narrator's
declared name when there is one, and the deck's opening mark when there is not. In every deck that
exists, one of those two holds for the whole film — `witnessglass`, `tap` and `onscreen` are uniform
either way, and `aside` names a narrator on every single cue.

The mixed case is reachable and nothing has rendered it. `subtitleTrack` attaches a `speaker` only
when the *film* changes speaker **and** that particular clip resolved to a narrator, so a deck that
declares two narrators, uses both, and leaves some cues to no narrator at all produces a track where
consecutive cues alternate between a name and a mark.

## Question

Does the metadata row swapping between a name and a mark read as a designed distinction — "this
sentence is attributed, this one is not" — or as the label failing to load?

## Constraints

- Filling it with a stand-in name is refused by decision:41 and decision:40 both: the subtitle layer
  does not invent facts about the film, and "nobody was named" is a fact.
- Suppressing the mark on labelled decks would make the row empty for those cues, which is the
  variant sprint:13 rendered and rejected on its own — and worse here, because the empty row would
  appear only sometimes.
- Making a whole labelled deck fall back to marks would throw away the identity the film needs, for
  the sake of consistency with cues that have none.

## Candidate direction

Leave it. The mark means "a block begins here" whether or not the block is signed, so the mixed film
is saying something true both times, and the alternation is the same information the audio carries.
Watch for it in a real deck rather than building an example to provoke it.

## Resolution criteria

- **A film that actually mixes them, watched.** The two-narrator explainer decision:40 was built for
  is the first plausible one, and only if it leaves cues unattributed — which it has no reason to.
- If the alternation reads as breakage, the answer is probably that `subtitleTrack` should attach the
  deck's default narrator to those cues rather than that the renderer should paper over it, since
  the missing fact is upstream of the projection.
