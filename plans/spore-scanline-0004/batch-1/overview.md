<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: patch 0004 and the patched oracle

One task, orchestrator only (oracle writes and JVM runs).

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-patch-and-oracle.md) | Make `0004` from the PR head, apply in place, rebuild, class diff, patched JUnit run | orchestrator | `tools/oracle/patches/0004-*.patch`, `plans/spore-scanline-0004/java-baseline.md`, journal | — | [x] |

Exit: `oracle-build.json` names 0001-0004; class diff confined to `ScanlineOverlapCheck*` + spore test classes;
`java-tests.sh org.eclipse.elk.alg.spore.test.ScanlineOverlapRemovalTest` prints `runs=4 failures=0`.
