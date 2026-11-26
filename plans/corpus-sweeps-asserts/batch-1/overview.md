<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: sweeps with assertions on, triage, close-out

The tasks run in order, and one orchestrator owns all of them. T2 depends on what T1 finds. T3 needs the final tree.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-run-sweeps.md) | Run the 13 sweeps with assertions on at stride 1; collect every `AssertionError` with its case and site | orchestrator | journal; temporary probe under `test/corpus/` (never committed) | — | [x] |
| [T2](T2-triage.md) | Triage each firing site per D4: `-ea` oracle run, then a comment plus `needs-ruling`, a fix, or a comment plus `follow-up` | orchestrator | the firing site's `src/` file and its colocated test (only if a site fires); journal | T1 | [x] |
| [T3](T3-close-out.md) | Queue gates 1-7, records, #116 comment, squash | orchestrator | `plans/roadmap.md` (appended), `.agent-notes/corpus-sweeps-asserts.md`, journal, README status | T2 | [x] |

If T1 finds no `AssertionError`, T2 is a single journal row, `no firing site`, and the mission makes no change under
`src/`.
