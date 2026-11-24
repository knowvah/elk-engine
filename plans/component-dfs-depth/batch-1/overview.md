<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: mission start, probe harness, baseline measurements

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-baseline-and-probe.md) | Harness, oracle grid, TS brackets, D5 references | orchestrator | journal, README table, `$TMPDIR/component-dfs-depth/**` | — | [x] |

T2 and T3 (batch 2) need only the deep-case depth (20,000, D4), so they may start once T1's harness smoke run passes. The
oracle grid keeps running in the background, as the queue rules allow.
