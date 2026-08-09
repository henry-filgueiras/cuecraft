---
id: tsk_01KZJDMQNHAXA2DGNN1ANHYSRF
sequence: 99
kind: task
status: closed
sprint: spr_01KZJDK32M4VSS1AC8R169WAWK
created: 2026-08-08
closed: 2026-08-08
---

# Audition the layout

## Objective

Audition layout policies for cyclic labelled graphs rather than tuning one. Generate several
deterministic candidates, score them on stated signals, elect a winner, and make the audition
visible.

## Acceptance criteria

- More than one credible candidate policy is generated deterministically from the same input, and
  the incumbent is one of them.
- Scoring covers at least: node overlap, label overlap, node/label collision, edge crossings,
  parallel and bidirectional ambiguity, scenario-weighted and total routed edge length, recurrent-
  core compactness, area and 16:9 utilization against the ledger-reduced viewport, and predicted
  legibility at the canonical overview.
- Node-layout defects are scored separately from routing and label-placement defects.
- Selection is deterministic and the scores are inspectable from the command line.
- A visible audition artifact for leases: labelled candidate stills or a contact sheet with the
  diagnostics beside them.
- No state name, transition identity, coordinate or example topology is special-cased. The elevator
  is checked against every candidate policy as the control.
