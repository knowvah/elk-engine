<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Cell creators, configurator, label placer, node size calculator

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port nodespacing cell creators and node sizing`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`; `A` =
`J/nodespacing/internal/algorithm`.

## Context
Mission 6b (README). These classes build the per-node cell system and size the node:
- **`NodeLabelCellCreator`:** inside and outside node label cells (`FORCE_TABULAR_NODE_LABELS`).
- **`InsidePortLabelCellCreator`:** inside port label cells.
- **`CellSystemConfigurator`:** which cells contribute to the minimum size (`MINIMUM_SIZE_ACCOUNTS_FOR_PADDING`,
  `OUTSIDE_NODE_LABELS_OVERHANG`) and the vertical inside port label padding.
- **`NodeSizeCalculator`:** sets the node width and height.
- **`LabelPlacer`:** applies the label layout.

T2 and T3 landed the cell system and the contexts; don't edit them (stop 1).

## Task
1. Port to `src/alg/common/nodespacing/internal/algorithm/`:
   - `CellSystemConfigurator.ts`: `configureCellSystemSizeContributions` (`A/CellSystemConfigurator.java:46`),
     `updateVerticalInsidePortLabelCellPadding` (`:142`).
   - `NodeLabelCellCreator.ts`: `createNodeLabelCells` (`A/NodeLabelCellCreator.java:56`) and its helpers.
   - `InsidePortLabelCellCreator.ts`: `createInsidePortLabelCells` (`A/InsidePortLabelCellCreator.java:47`).
   - `LabelPlacer.ts`: `placeLabels` (`A/LabelPlacer.java:40`).
   - `NodeSizeCalculator.ts`: `setNodeWidth`, `setNodeHeight` (`A/NodeSizeCalculator.java:46,100`).
2. Keep every branch, the Java method boundaries and the side-effect order. Split for complexity only at Java method
   or section boundaries (Q1), and journal each split.
3. Tests, with expectations derived from the Java source before the code, on nodes run through T3's `NodeContext` +
   `PortContextCreator`:
   - `NodeLabelCellCreator`: every inside `NodeLabelLocation` and every outside side; `FORCE_TABULAR_NODE_LABELS`
     on/off; the resulting cell tree (which `LabelCell` sits in which container area);
   - `CellSystemConfigurator`: contributions with `MINIMUM_SIZE_ACCOUNTS_FOR_PADDING` and `OUTSIDE_NODE_LABELS_OVERHANG`
     on/off;
   - `NodeSizeCalculator`: the size constraints `{}`, `{MINIMUM_SIZE}`, `{PORTS}`, `{NODE_LABELS}`,
     `{PORTS, PORT_LABELS, NODE_LABELS, MINIMUM_SIZE}`, with a fixed starting size; the expected width and height;
   - `LabelPlacer`: inside and outside node labels end at the Java-derived positions after the cells are laid out.

## Write-set
`src/alg/common/nodespacing/internal/algorithm/{CellSystemConfigurator,NodeLabelCellCreator,InsidePortLabelCellCreator,LabelPlacer,NodeSizeCalculator}*.ts`
(+ their `.test.ts`).

## Read-set
- `A/{CellSystemConfigurator,NodeLabelCellCreator,InsidePortLabelCellCreator,LabelPlacer,NodeSizeCalculator}.java`.
- T2's `cellsystem/*.ts` and `internal/NodeLabelLocation.ts`; T3's contexts and `NodeLabelAndSizeUtilities.ts` (read
  only).
- `src/core/options/{SizeConstraint,SizeOptions,NodeLabelPlacement}.ts`, `src/core/util/ElkUtil.ts`.
- `decisions.md#pre-made` (Q1, Q2, Q5).

## Interface contracts (outputs, consumed by T7)
Static methods with Java names: `CellSystemConfigurator.configureCellSystemSizeContributions(nodeContext)`,
`updateVerticalInsidePortLabelCellPadding(nodeContext)`, `NodeLabelCellCreator.createNodeLabelCells(nodeContext,
onlyInside, horizontalLayoutMode)`, `InsidePortLabelCellCreator.createInsidePortLabelCells(nodeContext)`,
`LabelPlacer.placeLabels(nodeContext)`, `NodeSizeCalculator.setNodeWidth/setNodeHeight(nodeContext)`. Parameter lists
are exactly the Java ones; check them in the source.

## Acceptance criteria
- Given a node with `NODE_SIZE_CONSTRAINTS` `{NODE_LABELS, MINIMUM_SIZE}`, an inside label and a minimum size, when the
  cells are created and configured and `setNodeWidth`/`setNodeHeight` run, then the node size equals the
  Java-derived value.
- Given `FORCE_TABULAR_NODE_LABELS` on, when node label cells are created, then the inside container is tabular, as in
  Java.
- Given outside node labels on all four sides, when `LabelPlacer.placeLabels` runs after layout, then every label
  position equals the Java-derived value.
- Given the files, when `npm run complexity` runs, then it is clean.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
