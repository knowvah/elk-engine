<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Wire the enum, replay every row, invariant tests

One task after batch 2: the integration point. T8 wires the ten 7b enum arms, replays every `models/*` and
`scenarios/*` row by name through the real factories (the 6c D1 authority), and ports the eight JUnit invariant tests
over the replayed graphs.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T8  | Enum arms, generic replay, invariant tests ([brief](T8-wire-and-replay.md)) | typescript-pro | src/alg/layered/intermediate/IntermediateProcessorStrategy.ts (+ test), src/alg/layered/LayeredPhaseVectors.test.ts, the 8 invariant test files | T2, T4, T5, T6, T7 | [x] |

The batch is done when every row replays and the README gates are green.
