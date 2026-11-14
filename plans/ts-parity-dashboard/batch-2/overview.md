<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: full oracle sweep, TS sweep, residual re-runs

One task, run by the orchestrator itself, because it starts detached JVM and TS runs and polls them. It needs T1 (the sharded
runner). T2 and T3 are not needed until batch 4.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T4](T4-sweeps.md) | Fresh full oracle sweep (TP1); sharded TS sweep of every algorithm (TP2); the 13 residual cases; a second TS run for the determinism check | orchestrator | scratch only; journal rows | T1 | [x] |

There is no commit unless the batch changed a file (it should not). Journal the counts as `sweep` rows.
