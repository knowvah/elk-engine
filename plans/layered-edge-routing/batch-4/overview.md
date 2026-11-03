<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Final spline bend points

One task after batch 3: the after-P5 calculator that turns T8's segments into bend points; its rows run the spline
router in their prefix.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T9  | `FinalSplineBendpointsCalculator` and its arm ([brief](T9-final-spline-bendpoints.md)) | typescript-pro | src/alg/layered/intermediate/FinalSplineBendpointsCalculator*.ts + tests, src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts (one arm), IntermediateProcessorStrategy.test.ts (ported-set case) | T8 | [x] |

The batch is done when T9's acceptance criteria pass and the README gates are green.
