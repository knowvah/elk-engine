<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Node and port contexts

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T3): port nodespacing node and port contexts`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`; `N` = `J/nodespacing`.

## Context
Mission 6b (README). `NodeContext` holds everything the algorithm classes read about one node: the options read once,
the cell system, and the port contexts sorted per side. `PortContext` holds one port's position, margin and label cell.
Every class in batch 3 consumes both. T2 landed the cell system and `NodeLabelLocation`; read them, and don't edit them
(stop 1).

## Task
1. Port to `src/alg/common/nodespacing/`:
   - `internal/NodeContext.ts`:
     - The constructor (`N/internal/NodeContext.java:137-185`) reads options through the adapter in Java order.
     - `applyNodeSize`, `getPortAlignment`, and the static `comparePortSides`/`comparePortContexts` (`:191-282`).
     - `portContexts` (`:102`) = `TreeMultimap.create(NodeContext.comparePortSides, NodeContext.comparePortContexts)`
       from `src/guava/TreeMultimap.ts` (Q2). It has TreeSet semantics: two ports on one side with equal
       `getVolatileId()` compare 0 and collapse, exactly as in Java. Keep that behaviour, and test it.
     - The 3 `EnumMap` fields (`:121-125`) use `Maps.newEnumMap` (`src/guava/Maps.ts:113`), which iterates in ordinal
       order.
     - The two `UnsupportedConfigurationException` throws (`:151-160`: `"Invalid port label placement: " + set`,
       `"Invalid node label placement: " + set`) use `src/core/UnsupportedConfigurationException.ts` (Q4). The message
       concatenates `EnumSet.toString()` (`src/java/util/EnumSet.ts:138`, Java `AbstractCollection` format).
     - `assert false` at `:277` stays a comment naming the line (NS5); no extra branch is added. The method still
       returns 0 after the switch.
   - `internal/PortContext.ts`: the fields, the constructor (`N/internal/PortContext.java:68-104`), `applyPortPosition`.
   - `internal/algorithm/PortContextCreator.ts`: `createPortContexts(nodeContext, ignoreInsidePortLabels)`.
   - `internal/algorithm/NodeLabelAndSizeUtilities.ts`: all public static methods (`N/internal/algorithm/NodeLabelAndSizeUtilities.java:52-288`),
     including the `EnumSet.of(SizeConstraint.PORT_LABELS)` site at `:248` (Q2).
2. `PortContext` and `NodeContext` reference each other. Use `import type` where only types are needed, otherwise the
   M12 cached-getter pattern (Q3). The constructor order never changes.
3. Adapters come from `src/core/util/adapters/*` (`GraphAdapter`, `NodeAdapter`, `PortAdapter`, `ElkGraphAdapters`).
   Read them; don't edit them (stop 1).
4. Tests, with expectations derived from the Java source before the code:
   - A node built with `ElkGraphUtil` and adapted with `ElkGraphAdapters`, with ports on all four sides and
     out-of-order volatile ids: `portContexts.get(side)` iterates NORTH/EAST ascending and SOUTH/WEST descending by
     volatile id; keys iterate in `comparePortSides` order.
   - Two ports with equal volatile ids on one side collapse to one context (the TreeSet semantics).
   - `NodeContext` reads every option it reads in Java: default values and explicitly set values, including
     `topdownLayout` and `treatAsCompoundNode`.
   - `NodeLabelAndSizeUtilities`: `getMinimumNodeSize`/`getMinimumClientAreaSize`/`getMinimumNodeOrClientAreaSize` for
     `MINIMUM_SIZE` with and without `DEFAULT_MINIMUM_SIZE`/`MINIMUM_SIZE_ACCOUNTS_FOR_PADDING`;
     `areSizeConstraintsFixed`; `isFirstOutsidePortLabelPlacedDifferently`.

## Write-set
`src/alg/common/nodespacing/internal/{NodeContext,PortContext}.ts`,
`src/alg/common/nodespacing/internal/algorithm/{PortContextCreator,NodeLabelAndSizeUtilities}.ts` (+ their `.test.ts`).

## Read-set
- `N/internal/{NodeContext,PortContext}.java`, `N/internal/algorithm/{PortContextCreator,NodeLabelAndSizeUtilities}.java`.
- T2's `src/alg/common/nodespacing/cellsystem/*.ts`, `internal/NodeLabelLocation.ts` (read only).
- `src/guava/{TreeMultimap,Multimap,Maps}.ts`, `src/java/util/EnumSet.ts`, `src/core/util/adapters/{GraphAdapters,ElkGraphAdapters}.ts`,
  `src/core/util/IndividualSpacings.ts`.
- `decisions.md#pre-made` (Q2, Q3, Q5), `decisions.md#ns5--asserts`.

## Interface contracts (outputs, consumed by T4–T7)
- `NodeContext` public fields with Java names (`node`, `nodeSize`, `treatAsCompoundNode`, `sizeConstraints`,
  `sizeOptions`, `portConstraints`, `portLabelsPlacement`, `portLabelsTreatAsGroup`, `nodeLabelPlacement`, the
  spacings, `surroundingPortMargins`, `topdownLayout`, `portContexts`, `nodeContainer`, `nodeContainerMiddleRow`,
  `insideNodeLabelContainer`, `insidePortLabelCells`, `outsideNodeLabelContainers`, `nodeLabelCells`).
- Methods: `constructor(parentGraph, node)`, `applyNodeSize()`, `getPortAlignment(side)`.
- `PortContext` fields `parentNodeContext`, `port`, `portPosition`, `labelsNextToPort`, `portMargin`,
  `portLabelCell`, plus `applyPortPosition()`.
- `PortContextCreator.createPortContexts`, and the static methods of `NodeLabelAndSizeUtilities`, keep their Java
  names and signatures.

## Acceptance criteria
- Given ports on all four sides with shuffled volatile ids, when `PortContextCreator.createPortContexts` runs, then
  `portContexts.get(side)` iterates in the Java comparator order for each side.
- Given two ports on one side with equal volatile ids, when contexts are created, then `portContexts.get(side).size()`
  is 1.
- Given a node with `MINIMUM_SIZE` set and the size options varied, when `getMinimumNodeOrClientAreaSize` runs, then
  it returns the Java-derived vector.
- Given a port label placement or node label placement set for which `PortLabelPlacement.isValid` or
  `NodeLabelPlacement.isValid` is false, when `new NodeContext(…)` runs, then `UnsupportedConfigurationException` is
  thrown with the Java message, set order included.
- Given `NodeContext.java:277`, when ported, then it is a comment, with no added branch.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
