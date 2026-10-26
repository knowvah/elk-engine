<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Cell system and `NodeLabelLocation`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T2): port nodespacing cell system`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`; `N` = `J/nodespacing`.

## Context
Mission 6b (README). The cell system is the layout primitive under node label and port label placement: nested
cells that compute minimum sizes and lay out their children. It depends only on `src/core` (`ElkPadding`,
`ElkRectangle`, `KVector`, `PortSide`, `ElkLabel`) and on `NodeLabelLocation`, which this task also ports (`LabelCell`
imports it; it imports only the cellsystem enums). T3–T7 build on these classes.

## Task
1. Port, one class per file under `src/alg/common/nodespacing/`, with `@see` lines (AD-7):
   - `cellsystem/{HorizontalLabelAlignment,VerticalLabelAlignment,ContainerArea}.ts`: enums in the landed enum pattern
     (`src/core/options/Alignment.ts`), with `valueOf` throwing Java's `No enum constant …` text.
   - `cellsystem/{Cell,AtomicCell,LabelCell,ContainerCell,StripContainerCell,GridContainerCell}.ts`. The nested
     `StripContainerCell.Strip` goes to `cellsystem/StripContainerCellStrip.ts` (Q1, M15).
   - `internal/NodeLabelLocation.ts`: the enum with its `EnumSet.of(…)` placement sets (`N/internal/NodeLabelLocation.java:42-310`)
     through `src/java/util/EnumSet.ts` (Q2), and `fromNodeLabelPlacement` (`:371`), `getOutsideSide` (`:444`) and the
     accessors, verbatim.
2. Keep every branch, the Java method boundaries and the side-effect order.
   - `GridContainerCell` (474 lines) and `NodeLabelLocation` (470 lines) may exceed the complexity limits: split at
     Java method or section boundaries (Q1), keeping Java names and order.
   - Journal every split.
3. Abstract Java classes become TS `abstract class`. Fields default as in Java (zero, `null`, `false`), not
   `undefined`.
4. Tests (`*.test.ts` colocated), with expectations hand-derived from the Java source **before** the code (AD-13):
   - `StripContainerCell` and `GridContainerCell`: fixed-size `AtomicCell` children, padding and gaps; minimum
     width/height; child rectangles after `layoutChildrenHorizontally` then `layoutChildrenVertically`;
     `onlyCenterCellContributesToMinimumSize`; `contributesToMinimumWidth/Height` false.
   - `LabelCell`: each `HorizontalLabelAlignment` × `VerticalLabelAlignment` on a cell with two labels; `applyLabelLayout`
     positions; horizontal versus vertical layout direction (read `N/cellsystem/LabelCell.java:229-328`).
   - `NodeLabelLocation`: every value round-trips through `fromNodeLabelPlacement`; `UNDEFINED` for unmatched sets;
     `isInsideLocation` and `getOutsideSide` for every value.

## Write-set
`src/alg/common/nodespacing/cellsystem/*.ts`, `src/alg/common/nodespacing/internal/NodeLabelLocation.ts` (+ their
`.test.ts`).

## Read-set
- `N/cellsystem/*.java` (all 9), `N/internal/NodeLabelLocation.java`.
- `src/core/math/{ElkPadding,ElkRectangle,KVector}.ts`, `src/core/options/{PortSide,Alignment}.ts`,
  `src/java/util/EnumSet.ts:28-80`.
- Patterns: `src/alg/common/overlaps/RectangleStripOverlapRemover*.ts` (6a nested-type files).
- `decisions.md#pre-made` (Q1, Q2, Q5).

## Interface contracts (outputs, consumed by T3–T7)
The Java public surface with Java names:
- `Cell.getPadding()`, `getCellRectangle()`, `is/setContributingToMinimumWidth/Height`, `getMinimumWidth/Height()`.
- `ContainerCell.layoutChildrenHorizontally/Vertically()`.
- `StripContainerCell(mode: StripContainerCellStrip, symmetrical, gap)`, `getCell(ContainerArea)`/`setCell`.
- `GridContainerCell(tabular, symmetrical, gap)`, `getCell(row, col)`/`setCell`, `setCenterCellMinimumSize`,
  `getCenterCellRectangle`.
- `LabelCell(gap, nodeLabelLocation?, horizontalLayoutMode?)`, `addLabel`, `applyLabelLayout`.
- `AtomicCell.get/setMinimumContentAreaSize`.
- `NodeLabelLocation.fromNodeLabelPlacement(EnumSet<NodeLabelPlacement>)`.

Constructor overloads follow §6.5 (optional trailing parameters, or a journaled named factory).

## Acceptance criteria
- Given a strip container with three fixed-size children, padding and a gap, when laid out horizontally and then
  vertically, then the child rectangles equal the Java-derived values.
- Given a grid container with a center cell and `onlyCenterCellContributesToMinimumSize`, when the minimum size is
  queried, then it equals the Java-derived value.
- Given every `NodeLabelLocation`, when its placement set is passed to `fromNodeLabelPlacement`, then it returns that
  value; an unmatched set returns `UNDEFINED`.
- Given the files, when `npm run complexity` and `npx vitest run test/architecture` run, then both are clean.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
