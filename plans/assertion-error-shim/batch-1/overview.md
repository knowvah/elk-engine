<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: migrate the three stand-ins, then close out

The orchestrator runs both tasks in order, with no subagents. T1's files depend on one another: the fitness test imports all
three classes.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-migrate-stand-ins.md) | Move the three sites onto `AssertionError`; additive tests; fitness test; docs row | orchestrator | the eight `src/`, `test/` and `docs/` files of the README table | — | [x] |
| [T2](T2-close-out.md) | Queue gates 1-7, roadmap, notes, squash | orchestrator | `plans/roadmap.md`, `.agent-notes/assertion-error-shim.md`, journal, README | T1 | [x] |

**Exit.** T1 is one commit (`refactor(java): move the assertionerror stand-ins onto the shim`). T2 squashes the mission into one
commit on the base.
