<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Graph-free option classes and `ComponentOrderingStrategy`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T2): port the graph-free layered option enums`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`S` = `src/alg/layered`.

## Context

Mission 7a (README). The `options` package has 35 classes; 27 reference no `graph` type and no unported class except
in javadoc. They come first because the LGraph model (T3) and the generated `LayeredOptions` reference them.

- **Patterns:** the enum translation in `docs/translation-rules.md` and an existing ported option enum such as
  `src/alg/common/compaction/options/TraversalStrategy.ts` (ordinal, `values()`, `valueOf`, Java-defined members).
- Javadoc `{@link}` to unported classes (`EdgeStraighteningStrategy` → `BKNodePlacer`, `PortSortingStrategy` →
  `PortListSorter`, `ValidifyStrategy` → `ICutIndexCalculator`) stay as comment text with no import.

## Task

1. Port each class to `S/options/<Name>.ts` with its `@see` line, constants in Java order, Java-defined fields and
   methods (`CenterEdgeLabelPlacementStrategy`, `EdgeLabelSideSelection` and `LongEdgeOrderingStrategy` each have one
   method), and its colocated `<Name>.test.ts`:
   `CenterEdgeLabelPlacementStrategy`, `ConstraintCalculationStrategy`, `CuttingStrategy`, `DirectionCongruency`,
   `EdgeConstraint`, `EdgeLabelSideSelection`, `EdgeStraighteningStrategy`, `FixedAlignment`,
   `GraphCompactionStrategy`, `GraphProperties`, `GreedySwitchType`, `GroupOrderStrategy`, `InLayerConstraint`,
   `InteractiveReferencePoint`, `LayerConstraint`, `LayerUnzippingStrategy`, `LongEdgeOrderingStrategy`,
   `NodePromotionStrategy`, `OrderingStrategy`, `PortSortingStrategy`, `PortType`, `SelfLoopDistributionStrategy`,
   `SelfLoopOrderingStrategy`, `SelfLoopPlacementStrategy`, `SplineRoutingMode`, `ValidifyStrategy`,
   `WrappingStrategy`.
2. Port `J/components/ComponentOrderingStrategy.java` to `S/components/ComponentOrderingStrategy.ts` with its test.
3. Tests assert constants, ordinals and each method's result per constant, read from the Java (L4 allows enum
   constants and Java-defined values). Any `@Deprecated`/advanced annotations become comments.

## Write-set

`S/options/<the 27 names>.ts` and their `.test.ts`, `S/components/ComponentOrderingStrategy{,.test}.ts`.

## Read-set

`J/options/<the 27 names>.java`, `J/components/ComponentOrderingStrategy.java`; `docs/translation-rules.md` (enum
rows); one existing ported enum and its test.

## Interface contract (consumed by T3, T4, T6, T7)

Each module exports the enum class under the Java name with static constants, `ordinal()`, `name()`, `values()`,
`valueOf(name)` and the Java methods, exactly like the existing ported enums the melk emitter already references.

## Acceptance criteria

- Given each of the 28 enums, when `values()` is read, then names and ordinals equal the Java declaration order.
- Given `CenterEdgeLabelPlacementStrategy`, `EdgeLabelSideSelection` and `LongEdgeOrderingStrategy`, when their
  method is called on every constant, then the result equals the Java's for that constant.
- Given `npx vitest run test/architecture`, then the new files pass the SPDX, globals, builtins and bundle checks.

## Observability / Rollback

N/A — no new observable operations. Reversible: revert the commit.
