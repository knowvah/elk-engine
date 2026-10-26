<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2b — Overlaps, spore, polyomino compactor

Runs together with batch 2a, after batches 1a and 1b. The write-sets are disjoint. Each task replays its section of
T4's `alg-common.json`.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T10 | `overlaps` + replay | typescript-pro | src/alg/common/overlaps/*.ts, src/alg/common/overlaps/OverlapsVectors.test.ts | T4 | [x] |
| T11 | `spore` (`Node`, `IOverlapHandler`, `ScanlineOverlapCheck`, `DepthFirstCompaction`) + replay | typescript-pro | src/alg/common/spore/{Node,IOverlapHandler,ScanlineOverlapCheck,DepthFirstCompaction}*.ts, src/alg/common/spore/SporeVectors.test.ts | T2, T4 | [x] |
| T12 | `PolyominoCompactor` + 6 `Successor*` + replay | typescript-pro | src/alg/common/polyomino/{PolyominoCompactor,Successor*}*.ts, src/alg/common/polyomino/PolyominoVectors.test.ts | T1, T4, T6 | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green.
