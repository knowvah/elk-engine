<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Framework recorder, plain option enums

Two independent tasks, run in parallel. T1 records every framework expectation from the oracle before any TS
consumer exists (AD-13); T2 ports the option enums that reference no graph type, which T3 needs.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T1  | `LayeredFrameworkVectors` recorder and its vectors | java-architect | tools/vectors/{LayeredFrameworkVectors.java,layered-framework-vectors.sh}, test/golden/refs/java/layered-framework.json | — | [x] |
| T2  | 27 graph-free option classes and `ComponentOrderingStrategy` | typescript-pro | src/alg/layered/options/<27 files>.ts + tests, src/alg/layered/components/ComponentOrderingStrategy.ts + test | — | [x] |

The batch is done when both tasks' acceptance criteria pass and the README gates are green. The orchestrator's
coverage gate runs after T1's recording has finished, never concurrently with the JVM.
