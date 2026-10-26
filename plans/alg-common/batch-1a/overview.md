<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1a — Options codegen, primitives, network simplex graph

Runs together with batch 1b. All six tasks depend only on `main` and their write-sets are disjoint. T4 (1b) runs JVM
jobs, so the orchestrator's coverage gate waits until T4's recordings are done.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | `compaction/options` enums + `PolyominoOptions` codegen (P3) | typescript-pro | src/alg/common/compaction/options/{TraversalStrategy,LowLevelSortingCriterion,HighLevelSortingCriterion,PolyominoOptions}.ts (+ tests), tools/melk/*.ts (only if generation needs it), test/melk/polyomino-options.test.ts | — | [x] |
| T2 | Geometry primitives + utils (`TEdge`, `TTriangle`, `Point`, `Tree`, `ICostFunction`, `Utils`, `SVGImage`, `compaction/Scanline`, `spore/InternalProperties`) | typescript-pro | src/alg/common/{TEdge,TTriangle,Point,Tree,ICostFunction}.ts, src/alg/common/utils/{Utils,SVGImage}.ts, src/alg/common/compaction/Scanline.ts, src/alg/common/spore/InternalProperties.ts (+ tests) | — | [x] |
| T3 | Network simplex graph (`NEdge`, `NNode`, `NGraph`) | typescript-pro | src/alg/common/networksimplex/{NEdge,NNode,NGraph}*.ts (+ tests) | — | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green.
