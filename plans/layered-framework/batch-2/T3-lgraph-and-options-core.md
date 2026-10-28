<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — LGraph model, options core, staged classes

**Agent:** main session (executor) · **Commit:** `feat(T3): port the lgraph model and the layered options core`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`S` = `src/alg/layered`.

## Context

Mission 7a (README). The LGraph is the data structure every layered phase works on. `LNode`, `LPort`, `LEdge` read
`LayeredOptions` and `InternalProperties`; `InternalProperties` holds LGraph and staged types; the generated
`LayeredOptions` names the five graph-dependent strategy enums, which take an `LGraph`; `LEdge.reverse` and
`LGraph.toNodeArray` call `LGraphUtil`, which uses `Spacings`. Port them together (~4,400 Java lines plus the
generated options). The executor runs this task itself rather than delegating: it is the keystone every later task
compiles against, and no part of it typechecks alone.

- **Patterns:** ElkGraph plain classes (`src/graph/**`, AD-11) for element/property-holder style;
  `src/core/math/{ElkMargin,ElkPadding,KVector,KVectorChain}.ts`; `src/graph/properties/MapPropertyHolder.ts`;
  `src/java/lang/UnsupportedOperationException.ts`; the
  nodespacing ports for overload naming (`docs/architecture/alg-common.md` §6.5) and nested types (M15).
- `Random` → `src/java/util/Random.ts`; Guava `Multimap` → `src/guava/Multimap.ts`; `LabelCell` →
  `src/alg/common/nodespacing/cellsystem/LabelCell.ts`.

## Task

1. **Model:** `S/graph/{LGraphElement,LShape,LMargin,LPadding,LLabel,LPort,LEdge,LNode,Layer,LGraph,LGraphUtil}.ts`
   with nested types per M15 (e.g. `LNode.NodeType`), and `S/options/Spacings.ts`. Every method and branch;
   side-effect order kept. `LPort`'s javadoc link to `LabelAndNodeSizeProcessor` stays comment text. `LGraphUtil`
   (1,163 lines) splits at Java method boundaries if the complexity limits require it (stop 10).
2. **Top level:** `S/LayeredPhases.ts`, `S/IHierarchyAwareLayoutProcessor.ts`.
3. **Options:** `S/options/InternalProperties.ts` (ids verbatim; javadoc-only links to
   `FinalSplineBendpointsCalculator`, `LayerConstraintPreprocessor`, `SplineEdgeRouter` stay text) and the 5
   graph-dependent enums `CycleBreakingStrategy`, `LayeringStrategy`, `CrossingMinimizationStrategy`,
   `NodePlacementStrategy`, `NodeFlexibility`. Each `create()` arm throws
   `new UnsupportedOperationException('<Class> is ported in mission <7x>')` with no import (L1); other members verbatim.
4. **Staged classes** (L1), each with the header marker `@staged <mission>` and only the members listed:

   ### Staged classes

   | File | Mission | Members ported verbatim |
   | ---- | ------- | ----------------------- |
   | `S/compound/CrossHierarchyEdge.ts` | 7h | type only (constructor throws) |
   | `S/intermediate/wrapping/BreakingPointInserter.ts` + nested `BPInfo` (M15) | 7g | `BPInfo` type only |
   | `S/p5edges/splines/SplineSegment.ts` | 7e | type only |
   | `S/intermediate/loops/SelfLoopHolder.ts` | 7g | `getSLPortMap()` |
   | `S/intermediate/loops/SelfLoopPort.ts` | 7g | `getIncomingSLEdges()`, `getOutgoingSLEdges()` |
   | `S/intermediate/loops/SelfLoopEdge.ts` | 7g | `getLEdge()` |

   T6 adds `S/intermediate/LabelDummySwitcher.ts` (7f, `INCLUDE_LABEL`) and T7 adds `S/ElkLayered.ts` (7f).
5. **Registry and fitness:** `test/architecture/staged-classes.json` (`[{ path, mission }]`) and
   `test/architecture/staged-classes.fitness.test.ts`: every `src/**` file with the marker is listed with the same
   mission, every listed file exists and carries the marker.
6. **Generated options (L7):** add `'org.eclipse.elk.alg.layered.LayeredLayoutProvider'` to `PENDING_TYPES`
   (`tools/melk/config.ts`), run `npm run melk:generate Layered`, commit the emitted
   `S/options/{LayeredOptions,LayeredMetaDataProvider}.ts`. Generator edits are allowed under S4 only. Add
   `test/melk/layered-options.test.ts` modelled on `test/melk/polyomino-options.test.ts`: freshness, and every
   registered option's id, default and targets against `Layered.melk`.
7. **Tests:** structural behaviour read from the Java (list membership, `setNode`/`setSource`/`setTarget`
   bookkeeping, `reverse`, `Layer.getIndex`, property defaults, enum constants, the throwing arms). Numeric methods
   (`getAbsoluteAnchor`, `getActualSize`, margins, `LGraphUtil` geometry, `Spacings`) get **no** hand-derived
   literals (L4); T6/T8 replay and T9 cover them.

## Write-set

- `S/graph/{LGraphElement,LShape,LMargin,LPadding,LLabel,LPort,LEdge,LNode,Layer,LGraph,LGraphUtil}.ts` (+ M15
  nested-type and section files), `S/{LayeredPhases,IHierarchyAwareLayoutProcessor}.ts`.
- `S/options/{Spacings,InternalProperties,CycleBreakingStrategy,LayeringStrategy,CrossingMinimizationStrategy,NodePlacementStrategy,NodeFlexibility,LayeredOptions,LayeredMetaDataProvider}.ts`.
- The six staged files above; `test/architecture/{staged-classes.json,staged-classes.fitness.test.ts}`.
- `tools/melk/config.ts` (the pending entry); `tools/melk/**` under S4; `test/melk/layered-options.test.ts`.
- Colocated `.test.ts` for every file above.

## Read-set

- `J/graph/{LGraphElement,LShape,LMargin,LPadding,LLabel,LPort,LEdge,LNode,Layer,LGraph,LGraphUtil}.java`,
  `J/{LayeredPhases,IHierarchyAwareLayoutProcessor}.java`, `J/options/{Spacings,InternalProperties,CycleBreakingStrategy,
  LayeringStrategy,CrossingMinimizationStrategy,NodePlacementStrategy,NodeFlexibility}.java`.
- For the staged members: `J/intermediate/loops/{SelfLoopHolder,SelfLoopPort,SelfLoopEdge}.java` (those methods
  only), `J/graph/LGraphAdapters.java:515-552` (the call sites).
- `tools/melk/{config,generate}.ts`, `test/melk/polyomino-options.test.ts`, `tools/melk/sources/Layered.melk`.
- `decisions.md` L1, L7, S4.

## Interface contract (consumed by T4–T8)

Java names and signatures throughout (AD-11); overloads per §6.5. `LNode.NodeType` constants in Java order.
`InternalProperties.<NAME>` and `LayeredOptions.<NAME>` are `IProperty<T>` with the Java ids and defaults.
`staged-classes.json`: `[{ "path": "src/alg/layered/…", "mission": "7e" | "7f" | "7g" | "7h" }]`, sorted by path.

## Acceptance criteria

- Given the staged registry, when the fitness test runs, then every file with the marker is listed with its mission,
  and every listed file exists and carries the marker.
- Given a strategy constant whose class is not ported, when `create()` runs, then it throws
  `UnsupportedOperationException` naming the class and the mission.
- Given `npm run melk:generate Layered` run twice, then the output is unchanged and equals the committed files
  (freshness test); `melk:generate Core Labels Polyomino` leaves their six files byte-identical (S4).
- Given `LayeredOptions`, when applied to a recording registry, then no registration references
  `LayeredLayoutProvider` and every option id, default and target matches `Layered.melk`.
- Given the LGraph model, when ports, edges and nodes are attached, moved and reversed, then lists and back-references
  match the Java bookkeeping.

## Observability / Rollback

N/A — no new observable operations. Reversible: revert the commit.
