<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Recorder and allocation, stages and tally, helpers

Three tasks with disjoint write-sets; T1 and T3 run in parallel, T2 is a short orchestrator task that lands before batch
2 ports anything. T1 records every expectation first (AD-13), runs the F4 hash check before anything else (stop 19) and
writes the suite allocation. T2 writes the stage classes and moves the enum tally and the `7f2` naming (F1, F9). T3 builds
the TS twin of T1's row format; it consumes T1's **header contract**, not its output, and runs on 7e rows until T1 lands.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T1  | Oracle recorder `LayeredPipelineVectors`, the ref, vendored inputs, plan dump, allocation ([brief](T1-pipeline-recorder.md)) | java-architect | tools/vectors/{LayeredPipelineVectors.java,layered-pipeline-vectors.sh}, test/golden/refs/java/layered-pipeline.json, test/golden/inputs/**, test/golden/inputs/manifest.json, test/golden/algorithm-refs.test.ts, plans/layered-pipeline/suite-allocation.md | — | [x] |
| T2  | Stage classes, enum tally, `7f2` naming ([brief](T2-stages-and-tally.md)) | orchestrator (main session) | src/alg/layered/components/ComponentsCompactor.ts, src/alg/layered/compound/CompoundGraph{Pre,Post}processor.ts, test/architecture/staged-classes.{json,fitness.test.ts}, src/alg/layered/intermediate/{IntermediateProcessorStrategyCreate,LabelDummySwitcher}.ts, src/alg/layered/intermediate/IntermediateProcessorStrategy.test.ts, src/alg/layered/DebugUtil.{ts,test.ts}, src/alg/layered/p4nodes/LinearSegmentsNodePlacer.test.ts | — | [x] |
| T3  | Pipeline replay helpers ([brief](T3-pipeline-replay.md)) | typescript-pro | test/helpers/layered-pipeline-replay-{rows,ops,names}.ts + tests | — | [x] |

The batch is done when all three tasks pass their acceptance criteria and the README gates are green. Agents never run
`npm run coverage` and never commit; the orchestrator commits per task.
