<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Model completion: node, port, edge, section, factory, ElkGraphUtil, vector replay

**Agent:** typescript-pro (effort high) · **Commit:** `feat(graph): complete the elkgraph model, factory and elkgraphutil`

## Context
`ElkEdgeImpl.isHierarchical/isSelfloop` call `ElkGraphUtil`, and `ElkGraphUtil.create*` call the
factory, so the edge/node/port/section impls, the factory and the util land together. The proof
is twofold: the ported JUnit `ElkGraphUtilTest` and the step-by-step replay of every `graph.json`
scenario (D9). STOP 7 applies: 3 model revisions rejected by `graph.json` → report the rows.

## Task
TDD — write `test/helpers/graph-vectors.ts` (scenario/step types + a step interpreter over the
TS model, mirroring `GraphVectors.java`'s op set) and `ElkGraph.replay.test.ts` first; show the
red run; then port in Java method order:
- `ElkConnectableShapeImpl` (`outgoingEdges`/`incomingEdges` as `ManyInverse` lists, `eInverseAdd/Remove`).
- `ElkNodeImpl` (`ports`, `children`, `containedEdges` containment lists; `parent` with the
  recursive check; `isHierarchical`; `eBasicRemoveFromContainerFeature`; `toString`).
- `ElkPortImpl` (`parent`; `toString`). `ElkEdgeImpl` (`containingNode`, `sources`/`targets`
  `ManyInverse`, `sections` containment, `isHyperedge/isHierarchical/isSelfloop/isConnected`,
  `toString` with `Joiner.on(', ')` and hyperedge brackets).
- `ElkEdgeSectionImpl` (start/end doubles, `bendPoints` containment without inverse, `parent`,
  `incomingShape`/`outgoingShape` plain references, `outgoingSections`/`incomingSections`
  `ManyInverse`, `identifier`, `setStartLocation/EndLocation`, `toString` per D10).
- `ElkGraphFactoryImpl` (`eINSTANCE` assignment, `createElk*`, `convertIPropertyToString`,
  `convertPropertyValueToString`; the `EDataType` string factories return `null` as in Java).
- `ElkGraphUtil` (every public method, `AncestorIterator`, `PropertiesSkippingTreeIterator` as a
  generator that skips property entries, `isAdvancedPropertyValue`/`isExperimentalPropertyValue`
  via the T7 registries, `containingGraph`/`elementLabeledBy` using `eContainer()`).
- Port `ElkGraphUtilTest.java` as `ElkGraphUtil.test.ts`; NPE cases assert `TypeError` (D10).

## Write-set
`src/graph/impl/{ElkConnectableShapeImpl,ElkNodeImpl,ElkPortImpl,ElkEdgeImpl,ElkEdgeSectionImpl,ElkGraphFactoryImpl}.ts`,
`src/graph/util/ElkGraphUtil.ts`, `src/graph/util/ElkGraphUtil.test.ts`,
`src/graph/impl/ElkGraph.replay.test.ts`, `test/helpers/graph-vectors.ts`.

## Read-set
- `../decisions.md` (all of D2–D5, D9, D10)
- `batch-1/T2-graph-vectors.md#interface-contract-output-consumed-by-t6-t9-t10` + `test/golden/refs/java/graph.json`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/{ElkConnectableShapeImpl,ElkNodeImpl,ElkPortImpl,ElkEdgeImpl,ElkEdgeSectionImpl,ElkGraphFactoryImpl}.java`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.graph.test/src/org/eclipse/elk/graph/util/ElkGraphUtilTest.java`
- T6 (`src/emf/**`), T7 (`src/graph/properties/**`, `ElkReflect`), T8 (`src/graph/*.ts`, `src/graph/impl/*.ts`)
- `src/guava/{Iterables,Lists,Joiner,Strings}.ts`, `src/java/lang/DoubleToString.ts`
- `plans/java-foundations/batch-3/T11-java-hashmap.md` (how a vector-replay test is structured here)

## Interface contract (consumed by T10, missions 3+)
`ElkGraphFactory.eINSTANCE` resolves to `ElkGraphFactoryImpl`; `ElkGraphUtil` exports every Java
static as a function on an `ElkGraphUtil` namespace object (`createGraph`, `createNode`,
`createPort`, `createLabel(parent)` / `createLabelWithText(text, parent)` (arity clash),
`createEdge`, `createSimpleEdge`, `createHyperedge`, `createEdgeSection`, `firstEdgeSection`,
`createBendPoint(section, x?, y?)`, `updateContainment`, `findBestEdgeContainment`,
`findLowestCommonAncestor`, `allIncomingEdges`, `allOutgoingEdges`, `allIncidentEdges` (shape |
node, one function dispatching on the guard), `allIncidentShapes`, `allIncidentSections`,
`isDescendant`, `containingGraph`, `connectableShapeToNode`, `connectableShapeToPort`,
`getSourceNode`, `getTargetNode`, `getSourcePort`, `getTargetPort`, `elementLabeledBy`,
`propertiesSkippingIteratorFor`, `isAdvancedPropertyValue`, `isExperimentalPropertyValue`).
`test/helpers/graph-vectors.ts` exports `loadGraphVectors()`, `replayScenario(scenario)` returning
per-step actual states shaped like the vector file, and `GRAPH_VECTORS_PATH`.

## Acceptance criteria
- Given `graph.json`, when every scenario is replayed step by step, then every recorded `state`,
  `allContents`, `propertyKeys`, `toString` (where non-null), `result` and `throws` matches, with
  0 skipped scenarios and the counts asserted in the test.
- Given the ported `ElkGraphUtilTest`, then every case passes; `connectableShapeToNode(null)`
  and `findBestEdgeContainment(null)` throw `TypeError`.
- Given an edge `n1 → n3_1_1` (grandchild), then `isHierarchical()` true, `isSelfloop()` false,
  `isHyperedge()` false, `isConnected()` true, as the vector records.
- Given `ElkGraphUtil.firstEdgeSection(edge, true, true)` on an edge with 3 sections, then one
  section remains, bend points cleared, start/end `(0,0)`.
- Given a hyperedge `[a, b] -> [c]` with identifier `e`, then `toString()` is
  `ElkEdge "e" [ElkNode "a" (…), ElkNode "b" (…)] -> [ElkNode "c" (…)]` as recorded.

## Quality bar
README gates; ≥ 90% coverage (100% target); functions ≤ 30 NLOC, CCN ≤ 10; files ≤ 500 lines
(`ElkGraphUtil.ts` may need the private iterators in the same file — if it exceeds 500 lines,
journal and split the two iterator classes into `src/graph/util/ElkGraphUtil.iterators.ts`
**only after** STOP 1 consideration: that file is outside the write-set, so STOP and ask).
Every model revision rejected by a vector row gets a journal line (hypothesis, failing scenario,
verdict).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Never edit `graph.json` (STOP 4). No `GraphIdentifierGenerator` (T10). No change to `src/emf/**`
or T8 files; if a T6/T8 bug surfaces, STOP 1 with the failing scenario named.
