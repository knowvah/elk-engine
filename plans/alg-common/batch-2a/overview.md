<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2a — NetworkSimplex, root algorithms, compaction.oned

Runs together with batch 2b, after batches 1a and 1b. The write-sets are disjoint.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T7 | `NetworkSimplex` + `NetworkSimplexTest` | typescript-pro | src/alg/common/networksimplex/NetworkSimplex*.ts, src/alg/common/networksimplex/NetworkSimplexTest.test.ts | T3 | [x] |
| T8 | `BowyerWatsonTriangulation`, `NaiveMinST`, `RectilinearConvexHull` + hull JUnit + triangulation replay (exit) | typescript-pro | src/alg/common/{BowyerWatsonTriangulation,NaiveMinST,RectilinearConvexHull}*.ts, src/alg/common/RectilinearConvexHullTest.test.ts, src/alg/common/TriangulationVectors.test.ts | T2, T4 | [x] |
| T9 | `compaction/oned` (13 files) + `compaction/DebugUtil` + `OneDimensionalCompactorTest` | typescript-pro | src/alg/common/compaction/oned/*.ts, src/alg/common/compaction/DebugUtil.ts, src/alg/common/compaction/oned/OneDimensionalCompactorTest.test.ts | T2 | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green.
