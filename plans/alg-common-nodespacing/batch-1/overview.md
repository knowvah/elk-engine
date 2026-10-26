<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Oracle recorder, cell system

Both tasks depend only on `main`, and their write-sets are disjoint, so they run in parallel. T1 records **before**
any consumer exists (AD-13); T7 is its only consumer.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | Oracle recorder `NodeMicroLayoutVectors` (NS1–NS4, NS6) | java-architect | tools/vectors/{NodeMicroLayoutVectors.java,node-micro-layout-vectors.sh}, test/golden/refs/java/node-micro-layout.json | — (oracle) | [x] |
| T2 | Cell system + `NodeLabelLocation` | typescript-pro | src/alg/common/nodespacing/cellsystem/*.ts, src/alg/common/nodespacing/internal/NodeLabelLocation.ts (+ tests) | — | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green. The orchestrator's
coverage gate runs after T1's recordings are finished, never concurrently with the JVM.
