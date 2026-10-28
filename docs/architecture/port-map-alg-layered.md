<!-- SPDX-License-Identifier: EPL-2.0 -->

# Port map: `alg.layered`

Split from [port-map.md](port-map.md) (summary, conventions, counting commands, cross-bundle rules).

## `alg.layered` → `src/alg/layered/`

29 package directories, 258 Java + 0 Xtend files, 64,082 LOC
(`plugins/org.eclipse.elk.alg.layered/src`).

| Java package (`org.eclipse.elk.` omitted)  | TS directory                                   | Files |    LOC | Strategy                                          |
| ------------------------------------------ | ---------------------------------------------- | ----: | -----: | ------------------------------------------------- |
| `alg.layered`                              | `src/alg/layered`                              |     9 |  3,301 | hand port; hosts `Layered.melk`                   |
| `alg.layered.compaction.components`        | `src/alg/layered/compaction/components`        |     5 |    922 | hand port                                         |
| `alg.layered.compaction.oned`              | `src/alg/layered/compaction/oned`              |     8 |  1,153 | hand port                                         |
| `alg.layered.compaction.oned.algs`         | `src/alg/layered/compaction/oned/algs`         |     5 |    544 | hand port                                         |
| `alg.layered.compaction.recthull`          | `src/alg/layered/compaction/recthull`          |     3 |    604 | hand port                                         |
| `alg.layered.components`                   | `src/alg/layered/components`                   |    10 |  2,614 | hand port                                         |
| `alg.layered.compound`                     | `src/alg/layered/compound`                     |     4 |  1,506 | hand port                                         |
| `alg.layered.graph`                        | `src/alg/layered/graph`                        |    13 |  3,839 | hand port                                         |
| `alg.layered.graph.transform`              | `src/alg/layered/graph/transform`              |     4 |  2,215 | hand port (EMF types → AD-11)                     |
| `alg.layered.intermediate`                 | `src/alg/layered/intermediate`                 |    52 | 13,606 | hand port                                         |
| `alg.layered.intermediate.compaction`      | `src/alg/layered/intermediate/compaction`      |     5 |  1,698 | hand port                                         |
| `alg.layered.intermediate.greedyswitch`    | `src/alg/layered/intermediate/greedyswitch`    |     5 |  1,114 | hand port                                         |
| `alg.layered.intermediate.loops`           | `src/alg/layered/intermediate/loops`           |     6 |  1,023 | hand port                                         |
| `alg.layered.intermediate.loops.ordering`  | `src/alg/layered/intermediate/loops/ordering`  |     2 |    730 | hand port                                         |
| `alg.layered.intermediate.loops.routing`   | `src/alg/layered/intermediate/loops/routing`   |     7 |  1,931 | hand port                                         |
| `alg.layered.intermediate.preserveorder`   | `src/alg/layered/intermediate/preserveorder`   |     3 |  1,032 | hand port                                         |
| `alg.layered.intermediate.unzipping`       | `src/alg/layered/intermediate/unzipping`       |     1 |    314 | hand port                                         |
| `alg.layered.intermediate.wrapping`        | `src/alg/layered/intermediate/wrapping`        |     9 |  2,168 | hand port                                         |
| `alg.layered.options`                      | `src/alg/layered/options`                      |    35 |  2,509 | hand port; melk codegen (AD-12) output lands here |
| `alg.layered.p1cycles`                     | `src/alg/layered/p1cycles`                     |    11 |  1,681 | hand port                                         |
| `alg.layered.p2layers`                     | `src/alg/layered/p2layers`                     |     9 |  2,501 | hand port                                         |
| `alg.layered.p3order`                      | `src/alg/layered/p3order`                      |    16 |  4,037 | hand port                                         |
| `alg.layered.p3order.counting`             | `src/alg/layered/p3order/counting`             |     6 |  1,450 | hand port                                         |
| `alg.layered.p4nodes`                      | `src/alg/layered/p4nodes`                      |     4 |  2,479 | hand port                                         |
| `alg.layered.p4nodes.bk`                   | `src/alg/layered/p4nodes/bk`                   |     7 |  2,313 | hand port                                         |
| `alg.layered.p5edges`                      | `src/alg/layered/p5edges`                      |     3 |    874 | hand port                                         |
| `alg.layered.p5edges.orthogonal`           | `src/alg/layered/p5edges/orthogonal`           |     5 |  1,962 | hand port                                         |
| `alg.layered.p5edges.orthogonal.direction` | `src/alg/layered/p5edges/orthogonal/direction` |     5 |    512 | hand port                                         |
| `alg.layered.p5edges.splines`              | `src/alg/layered/p5edges/splines`              |     6 |  3,450 | hand port                                         |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`) | Declares                                                                                                                                                                                                                | Generated class                       | TS target                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `alg/layered/Layered.melk`         | bundle (`idPrefix org.eclipse.elk.layered`)                                                                                                                                                                             | `LayeredMetaDataProvider`             | `src/alg/layered/options/LayeredMetaDataProvider.ts` |
| ↳                                  | `algorithm layered(LayeredLayoutProvider)`                                                                                                                                                                              | `LayeredOptions`                      | `src/alg/layered/options/LayeredOptions.ts`          |
| ↳                                  | 13 groups (cycleBreaking, layering, crossingMinimization, nodePlacement, edgeRouting, spacing, priority, compaction, highDegreeNodes, wrapping, layerUnzipping, edgeLabels, considerModelOrder); 89 option declarations | (registered inside the classes above) | —                                                    |

JUnit: `org.eclipse.elk.alg.layered.test` (15 package directories, 97 files, 22,384 LOC) → colocated
tests:

| Test package                             | TS target                                              | Files |   LOC | Strategy  |
| ---------------------------------------- | ------------------------------------------------------ | ----: | ----: | --------- |
| `alg.layered`                            | `src/alg/layered/*.test.ts`                            |     3 | 1,561 | hand port |
| `alg.layered.compaction`                 | `src/alg/layered/compaction/*.test.ts`                 |     1 |   622 | hand port |
| `alg.layered.compaction.recthull`        | `src/alg/layered/compaction/recthull/*.test.ts`        |     1 |   212 | hand port |
| `alg.layered.components`                 | `src/alg/layered/components/*.test.ts`                 |     1 |   139 | hand port |
| `alg.layered.intermediate`               | `src/alg/layered/intermediate/*.test.ts`               |    27 | 5,746 | hand port |
| `alg.layered.intermediate.greedyswitch`  | `src/alg/layered/intermediate/greedyswitch/*.test.ts`  |     8 | 4,757 | hand port |
| `alg.layered.intermediate.loops`         | `src/alg/layered/intermediate/loops/*.test.ts`         |     2 |   227 | hand port |
| `alg.layered.intermediate.loops.routing` | `src/alg/layered/intermediate/loops/routing/*.test.ts` |     2 |   148 | hand port |
| `alg.layered.issues`                     | `src/alg/layered/issues/*.test.ts`                     |    33 | 3,335 | hand port |
| `alg.layered.p1cycles`                   | `src/alg/layered/p1cycles/*.test.ts`                   |     1 |   199 | hand port |
| `alg.layered.p2layers`                   | `src/alg/layered/p2layers/*.test.ts`                   |     3 |   720 | hand port |
| `alg.layered.p3order`                    | `src/alg/layered/p3order/*.test.ts`                    |     9 | 3,432 | hand port |
| `alg.layered.p3order.counting`           | `src/alg/layered/p3order/counting/*.test.ts`           |     4 |   925 | hand port |
| `alg.layered.p4nodes`                    | `src/alg/layered/p4nodes/*.test.ts`                    |     1 |   211 | hand port |
| `alg.layered.p5edges`                    | `src/alg/layered/p5edges/*.test.ts`                    |     1 |   150 | hand port |

## Status after mission 7a (2026-10-28) {#status-7a}

Ported (design in [alg-layered.md](alg-layered.md)): `alg.layered` root — `LayeredLayoutProvider`, `LayeredPhases`,
`IHierarchyAwareLayoutProcessor` (`ElkLayered` staged for 7f; `GraphConfigurator`, `InteractiveLayeredGraphVisitor`,
`DebugUtil`, `DotDebugUtil`, `JsonDebugUtil` → 7f per L2); `alg.layered.components` — `ComponentOrderingStrategy`
only; `alg.layered.graph` — all 13 classes (+ `LGraphUtil` and `LGraphAdapters` section/M15 files, `Tarjan`);
`alg.layered.graph.transform` — all 4 (+ importer and transferrer section files, `ElkGraphTransformerUtility`);
`alg.layered.options` — all 35 plus the generated `LayeredOptions` and `LayeredMetaDataProvider`. Every other row
of the table above is pending (7b–7h). Staged files (`test/architecture/staged-classes.json`): `ElkLayered` (7f),
`intermediate/LabelDummySwitcher` (7f), `intermediate/loops/{SelfLoopEdge,SelfLoopHolder,SelfLoopPort}` (7g),
`intermediate/wrapping/{BreakingPointInserter,BreakingPointInserterBPInfo}` (7g), `compound/CrossHierarchyEdge` (7h),
`p5edges/splines/SplineSegment` (7e). JUnit: `LayeredSpacingTest` ported (15 of 16 cases; `AfterLayoutTest` → 7f);
`TestGraphCreator` → 7b (L6).
