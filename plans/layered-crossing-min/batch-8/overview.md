<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 8 — Anchored unit tests

Three parallel tasks after T11 (7b's batch 6): one colocated case per S and J item of `unreached.md`, literals equal
to a `layered-order.json` row (6c D1), comment `// oracle: <row id>; <Java file:line>`. Write-sets are disjoint by
directory; the tasks never edit a `src/` non-test file (a port defect found here is a stop with a diagnosis). `sites/*`
rows are branch probes: the invariant `*Test.test.ts` files stay restricted to pipeline/scenario rows.

| ID   | Description | Agent | Writes | Depends On | Done |
| ---- | ----------- | ----- | ------ | ---------- | ---- |
| T12a | p3order + counting anchored tests ([brief](T12a-p3order-tests.md)) | typescript-pro | src/alg/layered/p3order/*.test.ts and p3order/counting/*.test.ts except the three `*Test.test.ts`; options/CrossingMinimizationStrategy.test.ts | T11 | [x] |
| T12b | greedyswitch + preserveorder anchored tests ([brief](T12b-greedyswitch-tests.md)) | typescript-pro | src/alg/layered/intermediate/greedyswitch/*.test.ts, intermediate/preserveorder/*.test.ts | T11 | [x] |
| T12c | processor + enum anchored tests ([brief](T12c-processor-tests.md)) | typescript-pro | src/alg/layered/intermediate/<the eight C2 classes>.test.ts, IntermediateProcessorStrategy.test.ts | T11 | [x] |

The batch is done when every S row is anchored, the README gates are green and per-class branch coverage is ≥ 90 %
except U-explained shortfalls (else stop 10).
