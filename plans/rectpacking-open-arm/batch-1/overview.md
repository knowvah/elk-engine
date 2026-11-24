<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: proof and evidence

One task, [T1](T1-proof-and-evidence.md), run by the orchestrator. It has no subagents. Its result picks the branch of batch 2:

| T1 result | Batch 2 records | Decision |
| --------- | --------------- | -------- |
| L1-L5 proven, supports clean | `U` row 19, docs, journal | D3 |
| A lemma false, or the arm hit | a shrunk input, `rectpacking-extra.json`, a replay test, docs | D4 |
| Neither within the budget | the narrowed state, docs "still open", a comment on #81 | D5 |

**Exit.** One `result` row in the journal that names the branch, with the evidence links. A scratch harness under
`$TMPDIR/rectpacking-open-arm/`, journaled verbatim enough to rerun. No commit from T1 except journal rows (they may ride with T2's
commit).
