<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: records and close-out

Two tasks, run one after the other by the orchestrator:

- [T2](T2-records.md) writes the records of the branch T1 named.
- [T3](T3-close-out.md) runs queue gates 1-7, then writes the roadmap revision and the agent notes, then squashes.

T2 starts only after T1's `result` row. T3 starts only after T2's commit.

**Exit.** One squashed commit on the base, with `Refs: #81`. Gates 1-7 are green and journaled. #81 has a comment, and its labels
are unchanged (the issue closes when the branch merges).
