<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1b — Oracle recorder, Issue475, polyomino structures

Runs together with batch 1a; all tasks depend only on `main` and their write-sets are disjoint. T4 records **before**
any consumer exists (AD-13); the orchestrator's coverage gate waits until T4's recordings are done.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T4 | Oracle recorder `AlgCommonVectors` (AC3, P6) | java-architect | tools/vectors/{AlgCommonVectors.java,alg-common-vectors.sh}, test/golden/refs/java/alg-common.json | — (oracle) | [x] |
| T5 | `Issue475Test` port (P4) | typescript-pro | src/alg/common/issues/Issue475Test.test.ts | — | [x] |
| T6 | Polyomino structures + `ProfileFill` + `UniqueTriple` | typescript-pro | src/alg/common/polyomino/structures/*.ts, src/alg/common/polyomino/ProfileFill.ts, src/alg/common/utils/UniqueTriple.ts (+ tests) | — | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green.
