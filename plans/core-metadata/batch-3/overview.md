<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Algorithm/category data, option model

Two independent tasks (disjoint write-sets). T10 completes the hand-ported data layer the emitted
code builds; T11 starts the generator's model and is checked against the JVM dump for all 13 files.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T10 | `LayoutCategoryData`, `LayoutAlgorithmData`, `AbstractLayoutProvider`, `IGraphLayoutEngine`, `ILabelManager`, `ITopdownSizeApproximator` | typescript-pro | src/core/data/{LayoutCategoryData,LayoutAlgorithmData}.ts, src/core/{AbstractLayoutProvider,IGraphLayoutEngine}.ts, src/core/labels/ILabelManager.ts, src/core/options/ITopdownSizeApproximator.ts (+ .test.ts) | T3, T4, T5, T8 | [ ] |
| T11 | Model: options + categories (ids, groups, visibility, descriptions, defaults, bounds) | typescript-pro | tools/melk/model*.ts, tools/melk/expr.ts, test/melk/model-options.test.ts, test/melk/helpers.ts | T1, T2, T3, T7, T9 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
