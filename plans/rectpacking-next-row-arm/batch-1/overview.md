<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: proof and evidence

One task, [T1](T1-proof-and-evidence.md), run by the orchestrator, with no subagents. Its result picks the branch of batch 2:

| T1 result | Batch 2 records | Decision |
| --------- | --------------- | -------- |
| N1-N4 proven, supports clean | `U` row 20, docs, journal | D3 |
| A lemma false, or the arm hit | a shrunk input, `rectpacking-extra.json`, a replay test, docs | D4 |
| Neither within the budget | the narrowed state, docs "still open", a comment on #107 | D5 |

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T1 | Prove or break N1-N4; search, mutant control, cross-check | orchestrator | journal rows, `evidence.md`, `$TMPDIR/rectpacking-next-row-arm/**` | — | [[x] |

**Exit.** One `result` row in the journal that names the branch, with links into `evidence.md`. No commit from T1 except journal
rows and `evidence.md` (they may ride with T2's commit).
