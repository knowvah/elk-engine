<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Wire the processor arms; replay every row; invariant tests

One task after batch 4: the integration point (7b's T8).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T8  | Ten processor arms, generic replay, ten `LayoutTestRunner` invariants ([brief](T8-wire-and-replay.md)) | typescript-pro | src/alg/layered/intermediate/IntermediateProcessorStrategy.ts (+ test), src/alg/layered/LayeredOrderVectors.test.ts, the ten invariant test files | T4a, T4b, T5, T7 | [x] |
