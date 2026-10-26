<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Port label placement and node margins

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port nodespacing port labels and node margins`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`; `N` = `J/nodespacing`;
`A` = `N/internal/algorithm`.

## Context
Mission 6b (README). Two classes with no dependencies on each other:
- **`PortLabelPlacementCalculator`** (546 lines, the largest in the package) places the port labels:
  - inside, outside, `NEXT_TO_PORT_IF_POSSIBLE`, `ALWAYS_SAME_SIDE`/`ALWAYS_OTHER_SAME_SIDE`, `SPACE_EFFICIENT`;
  - treat-as-group, and constrained inside labels;
  - 6a's `RectangleStripOverlapRemover` resolves overlaps.
- **`NodeMarginCalculator`** (341 lines) computes each node's `MARGINS` from its labels, ports, port labels and the
  head/tail labels of its edges.

T3 landed the contexts. Read them and `src/alg/common/overlaps/*`; don't edit them (stop 1).

## Task
1. `src/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator.ts` (`A/PortLabelPlacementCalculator.java`):
   - `placeHorizontalPortLabels`, `placeVerticalPortLabels` (`:53-64`) and every private helper.
   - It is over 500 lines, so split it into a facade plus section modules along the Java section comments, for
     example `PortLabelPlacementCalculator{Inside,Outside,ConstrainedInside}.ts` (Q1). Keep Java order, names and
     side effects; sections never import the facade.
   - The overlap removal (`:253-…`) uses `RectangleStripOverlapRemover.createForDirection(…)` and
     `RectangleStripOverlapRemoverOverlapRemovalDirection` exactly as the Java chains them.
   - `default: assert false; return 0;` (`:207-209`) becomes a commented assert plus `return 0` (NS5).
2. `src/alg/common/nodespacing/NodeMarginCalculator.ts` (`N/NodeMarginCalculator.java`):
   - The four `exclude*` builder methods, `process()` and `processNode(node)` (`:114-341`).
   - The Java constructor is `protected` (package access from `NodeDimensionCalculation`). Port it as a public
     constructor with a comment noting the package access; T7 calls it.
   - Split for complexity at Java method or section boundaries only.
3. Keep every branch and the side-effect order.
4. Tests, with expectations derived from the Java source before the code:
   - port labels for each `PortLabelPlacement` combination that `PortLabelPlacement.isValid` accepts, on all four
     sides, with 1 and 3 ports, `labelsNextToPort` true/false, treat-as-group on/off;
   - one overlapping-labels case where the strip overlap removal moves a label;
   - `NodeMarginCalculator` with all four `exclude*` variants on a node with a label, ports, port labels and an edge
     with a head label.

## Write-set
`src/alg/common/nodespacing/internal/algorithm/PortLabelPlacementCalculator*.ts`, `src/alg/common/nodespacing/NodeMarginCalculator*.ts`
(+ their `.test.ts`).

## Read-set
- `A/PortLabelPlacementCalculator.java`, `N/NodeMarginCalculator.java`.
- T3's contexts and `internal/algorithm/NodeLabelAndSizeUtilities.ts`; T2's `cellsystem/{AtomicCell,LabelCell}.ts` (read
  only).
- `src/alg/common/overlaps/{RectangleStripOverlapRemover,RectangleStripOverlapRemoverOverlapRemovalDirection}.ts`.
- `src/core/util/adapters/GraphAdapters.ts`, `src/core/options/{PortLabelPlacement,EdgeLabelPlacement}.ts`,
  `src/core/math/{ElkMargin,ElkRectangle}.ts`.
- `decisions.md#pre-made` (Q1, Q5), `decisions.md#ns5--asserts`.

## Interface contracts (outputs, consumed by T7)
- `PortLabelPlacementCalculator.placeHorizontalPortLabels/placeVerticalPortLabels(nodeContext)`, static.
- `new NodeMarginCalculator(adapter)` with `excludeLabels()`, `excludePorts()`, `excludePortLabels()`,
  `excludeEdgeHeadTailLabels()` (each returns `this`), `process()`, `processNode(node)`.

## Acceptance criteria
- Given an EAST port with an outside label and `NEXT_TO_PORT_IF_POSSIBLE`, when the port has an edge and when it has
  none, then the label position equals the Java-derived value in each case.
- Given two inside port labels that would overlap on one side, when placement runs, then the positions equal the
  values that Java's strip overlap removal produces.
- Given a node with an outside label, ports with labels and an edge head label, when `NodeMarginCalculator.process()`
  runs with each `exclude*` combination, then `MARGINS` equals the Java-derived values.
- Given `PortLabelPlacementCalculator.java:208`, when ported, then it is a comment followed by `return 0`.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
