<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Port placement and port placement size calculators

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): port nodespacing port placement`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`; `A` = `N/internal/algorithm`
with `N` = `J/nodespacing`.

## Context
Mission 6b (README). These classes compute how much node width and height the ports need, then place the ports on each
side:
- `FIXED_POS`, `FIXED_RATIO` and free port constraints;
- port alignment (`BEGIN`/`CENTER`/`END`/`JUSTIFIED`/`DISTRIBUTED`);
- `PORTS_OVERHANG`, `UNIFORM_PORT_SPACING`;
- port margins from port labels.

T3 landed `NodeContext`/`PortContext`; read them, and don't edit them (stop 1). T7 calls these from
`NodeLabelAndSizeCalculator`.

## Task
1. Port the following to `src/alg/common/nodespacing/internal/algorithm/`:
   - `PortPlacementCalculator.ts` (`A/PortPlacementCalculator.java`, 423 lines):
     - `placeHorizontalPorts`, `placeVerticalPorts` and their private helpers;
     - the public `PORT_RATIO_OR_POSITION` property (`:45`, a `Property<number>` with the Java id and default).
   - `HorizontalPortPlacementSizeCalculator.ts` (409 lines):
     - `calculateHorizontalPortPlacementSize`;
     - the package-private `minSizeRequiredToRespectSpacing` (`:209`), exported for `Vertical…` with a comment noting
       its Java package access;
     - `EQUALITY_TOLERANCE` (`:195`);
     - `assert secondRatio >= firstRatio` (`:212`) stays a comment (NS5).
   - `VerticalPortPlacementSizeCalculator.ts` (390 lines): `calculateVerticalPortPlacementSize` and helpers.
2. Keep every branch, the Java method boundaries, the side-effect order and the iteration order over
   `nodeContext.portContexts.get(side)`. Split for complexity only at Java method or section boundaries (Q1), and
   journal each split.
3. `Math.max`/`Math.min` map directly; `ElkMath.maxd` and `DoubleMath.fuzzyEquals` (if used) use the landed helpers
   (Q5).
4. Tests, with expectations derived from the Java source before the code, on nodes built with `ElkGraphUtil` and run
   through T3's `NodeContext` + `PortContextCreator`:
   - each `PortConstraints` value (`FIXED_POS`, `FIXED_RATIO`, `FIXED_ORDER`, `FIXED_SIDE`, `FREE`) × horizontal and
     vertical sides: the node size the ports require and the resulting port positions;
   - each `PortAlignment` for free ports, with 1 and 3 ports; `PORTS_OVERHANG` on/off; `UNIFORM_PORT_SPACING` on/off;
   - `minSizeRequiredToRespectSpacing` on ratios that hit and miss `EQUALITY_TOLERANCE`.

## Write-set
`src/alg/common/nodespacing/internal/algorithm/{PortPlacementCalculator,HorizontalPortPlacementSizeCalculator,VerticalPortPlacementSizeCalculator}*.ts`
(+ their `.test.ts`).

## Read-set
- `A/{PortPlacementCalculator,HorizontalPortPlacementSizeCalculator,VerticalPortPlacementSizeCalculator}.java`.
- T3's `internal/{NodeContext,PortContext}.ts`, `internal/algorithm/PortContextCreator.ts`; T2's `cellsystem/AtomicCell.ts`
  (read only).
- `src/core/options/{PortConstraints,PortAlignment,SizeOptions}.ts`, `src/core/math/{ElkMath,ElkMargin}.ts`,
  `src/graph/properties/Property.ts`.
- `decisions.md#pre-made` (Q1, Q5), `decisions.md#ns5--asserts`.

## Interface contracts (outputs, consumed by T7)
`PortPlacementCalculator.placeHorizontalPorts/placeVerticalPorts(nodeContext)`,
`HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(nodeContext)`,
`VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(nodeContext)`, and
`PortPlacementCalculator.PORT_RATIO_OR_POSITION`. All static, with Java names.

## Acceptance criteria
- Given a node with three free ports on NORTH and `PortAlignment.DISTRIBUTED`, when the size calculator and then the
  placement run, then the required width and the port x-coordinates equal the Java-derived values.
- Given `FIXED_RATIO` ports, when the node is resized and placement runs, then the positions follow
  `PORT_RATIO_OR_POSITION` as in Java.
- Given `HorizontalPortPlacementSizeCalculator.java:212`, when ported, then it is a comment, with no added check.
- Given the files, when `npm run complexity` runs, then it is clean.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
