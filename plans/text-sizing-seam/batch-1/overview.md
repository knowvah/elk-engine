<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: patch 0003 and the oracle rebuild

Everything else depends on the patched oracle, so this batch runs first and alone. The orchestrator does it itself: it
touches the shared oracle worktree, which no subagent may write.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T1](T1-oracle-patch.md) | Author `0003`, apply it in place, rebuild, prove the default unchanged (TX7) | orchestrator | `tools/oracle/patches/0003-alg.test-pluggable-label-text-measurer.patch`; `$ELK_ORACLE_DIR` via `build.sh` | — | [x] |

Gate after the batch: `oracle-build.json` names `ELK_COMMIT` and patches `0001`, `0002` and `0003`; every TX7 check is
journaled as equal. If any TX7 check fails, stop 4 halts the mission.
