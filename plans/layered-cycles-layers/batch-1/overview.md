<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Phase recorder, enum skeleton, replay foundation

Three independent tasks, run in parallel. T1 records every 7b expectation from the oracle before any TS consumer
exists (AD-13, B1–B5); T2 ports the `IntermediateProcessorStrategy` enum with every arm throwing (B9), which the
phases reference; T3 builds the TS replay helpers with injected factories, so batch 2's per-class tests can run a
scenario row against one class without the enum or the other classes.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T1  | `LayeredPhaseVectors` recorder, `models/*` and `scenarios/*` rows, vendored `.elkt` inputs ([brief](T1-phase-recorder.md)) | java-architect | tools/vectors/{LayeredPhaseVectors.java,layered-phase-vectors.sh}, test/golden/refs/java/layered-phases.json, test/golden/inputs/tests/layered/**, test/golden/inputs/tickets/layered/*, test/golden/inputs/manifest.json | — | [x] |
| T2  | `IntermediateProcessorStrategy`, all arms throwing ([brief](T2-processor-enum.md)) | typescript-pro | src/alg/layered/intermediate/IntermediateProcessorStrategy.ts + test | — | [x] |
| T3  | Replay foundation: rows, normalise, phase dump, step ops, compare ([brief](T3-replay-foundation.md)) | typescript-pro | test/helpers/layered-phase-replay-{rows,normalise,dump,ops,compare}.ts + tests | — | [x] |

The batch is done when all three tasks' acceptance criteria pass and the README gates are green. The orchestrator's
coverage gate runs after T1's recording has finished, never concurrently with the JVM.
