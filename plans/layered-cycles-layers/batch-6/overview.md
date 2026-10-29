<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Anchored unit tests

Three parallel tasks after T11: colocated unit cases for every T9 branch, each literal equal to a `layered-phases.json`
row (6c D1), comment `// oracle: <row id>; <Java file:line>`. Write-sets are disjoint by directory; the tasks read the
JSON through T3's loader and never edit a `src/` file (a port defect found here is a stop with a diagnosis).

| ID   | Description | Agent | Writes | Depends On | Done |
| ---- | ----------- | ----- | ------ | ---------- | ---- |
| T12a | p1cycles anchored tests ([brief](T12a-p1cycles-tests.md)) | typescript-pro | src/alg/layered/p1cycles/*.test.ts except BasicCycleBreakerTest, src/alg/layered/options/CycleBreakingStrategy.test.ts | T11 | [x] |
| T12b | p2layers anchored tests ([brief](T12b-p2layers-tests.md)) | typescript-pro | src/alg/layered/p2layers/*.test.ts except the two Basic* files, src/alg/layered/options/LayeringStrategy.test.ts | T11 | [x] |
| T12c | processor anchored tests ([brief](T12c-processor-tests.md)) | typescript-pro | src/alg/layered/intermediate/*.test.ts for the 10 classes and the enum | T11 | [x] |

The batch is done when every S row is anchored, the README gates are green and coverage is ≥ 90/90/90/90 for every
7b class, the U list excepted (else stop 10).
