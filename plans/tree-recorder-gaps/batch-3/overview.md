<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: outcomes and docs; close-out and squash

The orchestrator works alone, in sequence. Before T5, the orchestrator audits each batch 2 report against its tool output:
the `cmp` lines, the coverage lines and the `killed`/`survived` lines. Then it reruns every new test file itself and fills
[items.md](../items.md).

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T5](T5-outcomes-docs.md) | Append outcomes to 8a's `unreached.md`, one closing journal row, three doc tables | orchestrator | `plans/alg-trees/unreached.md`, `plans/alg-trees/decision-journal.md`, `docs/conformance.md`, `docs/architecture/alg-trees.md`, `docs/architecture/elk-upgrade.md` | T2, T3, T4 | [x] |
| [T6](T6-close-out.md) | Final regeneration, queue gates 1-7, roadmap, notes, summary, squash | orchestrator | `plans/roadmap.md`, `.agent-notes/tree-recorder-gaps.md`, this brief | T5 | [x] |
