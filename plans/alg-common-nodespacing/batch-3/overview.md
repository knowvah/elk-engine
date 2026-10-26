<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Port placement, port labels and margins, cell creators and sizing

Three parallel tasks. All three depend on T2 and T3 only and do not import each other's files: the Java cross-imports in
`internal/algorithm` stay inside one task (`Vertical…` → `Horizontal…` → `PortPlacementCalculator` in T4;
`PortLabelPlacementCalculator` and `NodeSizeCalculator` → `NodeLabelAndSizeUtilities`, which T3 landed). The
write-sets are disjoint.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T4 | Port placement and port placement size calculators | typescript-pro | src/alg/common/nodespacing/internal/algorithm/{PortPlacementCalculator,HorizontalPortPlacementSizeCalculator,VerticalPortPlacementSizeCalculator}*.ts (+ tests) | T3 | [x] |
| T5 | `PortLabelPlacementCalculator` + `NodeMarginCalculator` | typescript-pro | src/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator*.ts, src/alg/common/nodespacing/NodeMarginCalculator*.ts (+ tests) | T3 | [x] |
| T6 | Cell creators, configurator, label placer, node size calculator | typescript-pro | src/alg/common/nodespacing/internal/algorithm/{CellSystemConfigurator,NodeLabelCellCreator,InsidePortLabelCellCreator,LabelPlacer,NodeSizeCalculator}*.ts (+ tests) | T3 | [x] |

`*` covers the section-module files a task may create for its own classes (Q1); the files of one task never match
another task's prefix. The batch is done when every task's acceptance criteria pass and the README gates are green.
