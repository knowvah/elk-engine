<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Entry points and oracle replay

One task. It needs T1's recording and the batch 3 algorithm classes. It is the mission's conformance evidence.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T7 | `NodeLabelAndSizeCalculator`, `NodeDimensionCalculation`, `NodeMicroLayout` + oracle replay | typescript-pro | src/alg/common/nodespacing/{NodeLabelAndSizeCalculator,NodeDimensionCalculation}*.ts, src/alg/common/NodeMicroLayout.ts, src/alg/common/NodeMicroLayoutVectors.test.ts, test/helpers/node-micro-layout-replay.ts (+ tests) | T1, T4, T5, T6 | [x] |

The batch is done when every `node-micro-layout.json` row replays and the README gates (including the nodespacing
branch-coverage check, stop 10) are green.
