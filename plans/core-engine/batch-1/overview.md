<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Types, monitors, ElkUtil part 1, golden data, Property seam

No dependencies. Write-sets are disjoint; all five run in parallel. T4 runs the oracle (JVM): run it first and give it
the most time; the orchestrator runs `npm run coverage` only after T4's oracle work has finished.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | Exceptions, small interfaces, `AlgorithmFactory`; fitness list | typescript-pro | src/core/{Unsupported{Configuration,Graph}Exception,ITopdownLayoutProvider}.ts, src/core/validation/GraphValidationException.ts, src/core/testing/IWhiteBoxTestable.ts, src/core/alg/ILayoutProcessor.ts, src/core/util/AlgorithmFactory.ts (+ tests), test/architecture/exception-hierarchy.fitness.test.ts | — | [x] |
| T2 | `BasicProgressMonitor`, `NullElkProgressMonitor` | typescript-pro | src/core/util/{BasicProgressMonitor,NullElkProgressMonitor}.ts (+ tests) | — | [x] |
| T3 | `ElkUtil` part 1 (Java :84-706) + `ElkRectangle` (M10, M11) | typescript-pro | src/core/util/ElkUtil.ts, src/core/util/ElkUtil{Ports,Sizing,Junctions,Labels}.ts, src/core/math/ElkRectangle.ts (+ tests) | — | [x] |
| T4 | Golden data: algorithm golden set, variant, vendored inputs, refs, `applyOverlay` | typescript-pro | tools/oracle/regen-goldens.sh, test/golden/algorithms.json, test/golden/algorithm-refs.test.ts, test/corpus/variants.json, test/golden/inputs/**, test/golden/refs/elk-algorithms/**, test/helpers/graph-overlay.ts (+ test) | — | [x] |
| T5 | `Property.test.ts` seam → `LayoutMetaDataService.getInstance()` | typescript-pro | src/graph/properties/Property.test.ts | — | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green, including
both `regen-goldens.sh` sets byte-stable on a second run.
