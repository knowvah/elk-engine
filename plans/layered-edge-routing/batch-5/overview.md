<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Wire the arms; replay every row; the three JUnit ports

One task after batch 4, in the main session or a typescript-pro agent: the factory, the entry-point fitness entry,
the generic replay of both refs through the real factories, the un-skips batch 2 left, and the three JUnit invariants.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T10 | `EdgeRouterFactory`, fitness entry, generic replay, JUnit ports ([brief](T10-wire-and-replay.md)) | typescript-pro | src/alg/layered/p5edges/EdgeRouterFactory.ts + test, test/architecture/layered-entry-points.fitness.test.ts, src/alg/layered/LayeredRoutingVectors.test.ts, test/helpers/edge-route-orthogonal.ts + test, src/alg/layered/p5edges/BasicEdgeRouterTest.test.ts, src/alg/layered/issues/Issue726Test.test.ts, src/alg/layered/intermediate/LayerSizeAndGraphHeigthCalculatorTest.test.ts, the `it.skip` cases of T4/T5 tests | T9 | [x] |

The batch is done when T10's acceptance criteria pass and the README gates are green (the entry-point test included).
