<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Wire the arms; replay every row; the invariant test

One task after batch 2. Batches 1–2 proved each class on its rows with the class injected through T3's factories;
T8 proves the whole set the way the pipeline uses it: the five `NodePlacementStrategy` arms and the five 7d
`IntermediateProcessorStrategy` arms instantiate, every row of `layered-placement.json` replays through the real
factories, and the one `LayoutTestRunner` suite of P4 runs as an invariant over the replayed rows of its
configurations.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T8  | Wire the 5 + 5 arms, replay every row, port `BasicNodePlacementTest` ([brief](T8-wire-and-replay.md)) | typescript-pro | src/alg/layered/options/NodePlacementStrategy.ts + .test.ts, src/alg/layered/intermediate/IntermediateProcessorStrategy.ts + .test.ts, src/alg/layered/LayeredPlacementVectors.test.ts, src/alg/layered/p4nodes/BasicNodePlacementTest.test.ts | T4, T5, T6, T7 | [x] |

The batch is done when every row replays by name, the invariant passes over its 14 configurations, the entry-point
fitness test is green after wiring (stop 15 otherwise) and the README gates are green. Agents never run
`npm run coverage` and never commit.
