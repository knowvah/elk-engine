<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: match the six arms to the Java, then close out

The orchestrator runs both tasks in order, with no subagents. T1's three source files share D3's widened types.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-match-java-arms.md) | Proofs (D5), red tests (D4), the six arms (D1-D3), records (D6) | orchestrator | the seven files of the README table marked T1 | — | [x] |
| [T2](T2-close-out.md) | Queue gates 1-7, roadmap, notes, squash | orchestrator | `plans/roadmap.md`, `.agent-notes/self-loop-assert-arms.md`, journal, README | T1 | [x] |

**Exit.** T1 is one commit (`fix(layered): let six self-loop assert-false arms return as in java`). T2 squashes the
mission into one commit on the base.
