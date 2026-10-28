<!-- SPDX-License-Identifier: EPL-2.0 -->

# 7a branches unreached by the oracle replays (T9, L4)

Measured 2026-10-27 on `feature/layered-framework` after the X4 re-record (`fix(T1)`, `fix(T8)`): one run of the three
oracle replays alone with v8 coverage restricted to `src/alg/layered/**` (test files excluded), load 50.3 / 38.0 / 29.5:

```bash
npx vitest run --coverage --coverage.include='src/alg/layered/**' --coverage.exclude='**/*.test.ts' \
  --coverage.reporter=json --coverage.reporter=text --coverage.reportsDirectory=<scratch> \
  src/alg/layered/graph/transform/LayeredFrameworkTransformVectors.test.ts \
  src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts test/melk/layered-registry.test.ts
```

280 tests pass. Totals over the 7a sources: statements 59.79 % (2,084/3,485), branches 40.10 % (462/1,152), functions
61.65 % (574/931), lines 60.63 % (2,084/3,437); the threshold error the run prints reflects the restricted include list.
Staged classes (`test/architecture/staged-classes.json`) are excluded. 690 branches stay untaken; every one appears in
the table below exactly once, under one category:

| Category | Meaning | Branches |
| -------- | ------- | -------- |
| S1–S15 | Numeric or algorithmic behaviour: an oracle site scenario (T10 row, T11 anchored test) | 357 |
| J | Structural behaviour with Java-derived expectations already unit-tested (enum constants, `valueOf`/`name`/`compareTo`, list bookkeeping, back-references, predicates, iterables, `toString`/designation strings, the `getPortSideView` proxy, staged-member delegation, `OPTION_TARGET_FILTER` target lookups) — L4 allows Java constants, ids and defaults; no arithmetic | 300 |
| U | Unreachable from public API in 7a (see the list after the table) | 4 |
| X | Throwing phase-factory `create()` arms (L1), excluded by the brief | 31 |

## Scenarios

Each scenario is one input graph (ELK JSON where the importer builds it; otherwise built on the LGraph with Java
public API in the recorder) plus a call sequence; `expected` lists the fields T11 asserts. Ids are stable.
`G` = `LGraph`, `N` = `LNode`, `P` = `LPort`, `U` = `LGraphUtil`.

| # | Scenario id | Graph | Calls | Expected shape |
| - | ----------- | ----- | ----- | -------------- |
| S1 | `site/lgraphutil/resizeNode` | one node 40×30 with one port per side and node labels right of, below and inside the node; `PORT_CONSTRAINTS` FREE and FIXED_POS variants | `U.resizeNode(n, (80, 60), movePorts, moveLabels)` for each of the 4 flag pairs | node size, `NODE_SIZE_CONSTRAINTS`, every port and label position |
| S2 | `site/lgraphutil/coordinates` | root G with padding and offset; parent node with a nested G (padding, offset) holding two nodes; an edge with bend points, junction points and labels | `U.offsetGraph` / `offsetGraphs`; `U.isDescendant` (true, false, same node); `U.changeCoordSystem` nested→root, root→nested, same graph; `G.getActualSize`; `P.getAbsoluteAnchor` per port; `N.borderToContentAreaCoordinates` for the 4 flag pairs; `N.getInteractiveReferencePoint` under CENTER and TOP_LEFT | every resulting vector, the boolean, positions |
| S3 | `site/lgraphutil/layers` | one layer of 5 nodes: `ALIGNMENT` LEFT, RIGHT, CENTER, AUTOMATIC with in/out ports, AUTOMATIC without ports; left/right margins; a dummy node | `U.placeNodesHorizontally(layer, xoffset)`; `U.findMaxNonDummyNodeWidth(layer, true/false)` with `DIRECTION` RIGHT and DOWN | node x positions, the two widths per direction |
| S4 | `site/lgraphutil/graphProperties` | layerless G: comment box, hypernode, external-port dummy, nodes with UNDEFINED / FREE / FIXED_SIDE constraints, a port of degree 2, N/S and E/W ports, a self loop, edge labels CENTER/HEAD/TAIL; `DIRECTION` RIGHT and DOWN | `U.computeGraphProperties(g)` (twice: fresh and pre-filled set) | `GRAPH_PROPERTIES` set, each node's `PORT_CONSTRAINTS` after the call |
| S5 | `site/lgraphutil/ports` | nodes of non-zero and zero size; `MERGE_EDGES` and `HYPERNODE` variants with SIDE_FIXED/FREE constraints | `U.createPort` with and without end point for every `DIRECTION`, INPUT/OUTPUT; `U.provideCollectorPort` (reuse, create, UNDEFINED type); `U.initializePort` for UNDEFINED side with FIXED_SIDE, FIXED_RATIO on every side (zero and non-zero node size), explicit anchor | port side, position, anchor, `PORT_BORDER_OFFSET`, `PORT_RATIO_OR_POSITION`, `GRAPH_PROPERTIES` |
| S6 | `site/lgraphutil/externalPorts` | standalone holder ports | `U.createExternalPortDummy` over N/S/E/W × implicit/explicit anchor × negative border offset, FIXED_ORDER with `PORT_INDEX` on each side, FIXED_RATIO/FIXED_POS position info on each axis, FIXED_SIDE with UNDEFINED side; `U.getExternalPortPosition` for each `EXT_PORT_SIDE` | dummy size, port position, `PORT_ANCHOR`, `PORT_RATIO_OR_POSITION`, constraints, returned positions and moved dummy positions |
| S7 | `site/lgraphutil/other` | nodes with and without `SPACING_INDIVIDUAL` (holder with/without the property), a node without a graph; layerless nodes with and without `MODEL_ORDER` | `U.getIndividualOrInherited`; `U.getMinimalModelOrder` (with, without model orders) | returned values |
| S8 | `site/spacings` | G with every spacing option set to distinct values; nodes of each `NodeType` with and without individual overrides | `new Spacings(g)`; `getHorizontalSpacing`/`getVerticalSpacing` over node pairs and type pairs; element form with a non-node (throws) | spacing per pair, exception class and message |
| S9 | `site/tarjan` | LGraph with nested SCCs, a self loop and an acyclic tail | `new Tarjan(...)` / `tarjan(graph)` as `SCCModelOrderCycleBreaker` calls it | per node `TARJAN_ID`, `TARJAN_LOWLINK`, `TARJAN_ON_STACK`, `IS_PART_OF_CYCLE`; SCC list in order |
| S10 | `site/lgraphAdapters` | layered G (X4 layering) with N/S port dummies (`PORT_DUMMY`), top/bottom comment nodes, labels on ports, nodes and edges, ports on all sides at distinct positions | `LGraphAdapters.adapt` with each flag combination and a node filter; every adapter getter; `sortPortList()` with the default comparator | adapted node/port/edge/label identities (paths) in order, sorted port order, margins, label sides/texts, `hasCompoundConnections` |
| S11 | `site/transform/externalPorts` | ELK JSON: INCLUDE_CHILDREN hierarchy whose inner node has external ports with labels (inside and outside placements), FREE constraints voting by edge direction, ports without edges, no `PORT_BORDER_OFFSET` | a `transform` row (import + dump + transfer) | `expected.lgraph`, `expected.elk` |
| S12 | `site/transform/insideSelfLoops` | ELK JSON: compound node with `INSIDE_SELF_LOOPS_ACTIVATE` and inside/outside self loops, model-order variants | a `transform` row | as S11 |
| S13 | `site/transform/hierarchy` | ELK JSON: INCLUDE_CHILDREN with cross-hierarchy edges between ports and nodes at three levels, an edge contained in a different graph than its endpoints, coordinate-system origin cases | a `transform` row | as S11 |
| S14 | `site/transform/misc` | ELK JSON set: undefined port side under fixed constraints, node size minimum with fixed graph size, edges with bend points and junction points, invalid edges (lookup miss), port labels, parent-node layout flags (`NODE_SIZE_CONSTRAINTS`, padding) | `transform` rows | as S11 |
| S15 | `site/transform/nonMutating` | the S11–S14 graphs plus two curated models | `ElkGraphLayoutTransferrer.applyLayoutNonMutating(lgraph)` after import, exported as ELK JSON | the returned graph's ELK JSON |

## Unreachable in 7a (U)

- `graph/LGraphUtil.ts` private constructor, `graph/LGraphAdapters.ts` private constructor (`J/graph/LGraphUtil.java`,
  `J/graph/LGraphAdapters.java`: no instance is ever created).
- `graph/LGraphUtilGraphProperties.ts:103` implicit no-match arm of the edge-label switch: `EdgeLabelPlacement` has
  only CENTER, HEAD and TAIL (`J/graph/LGraphUtil.java:396-404`).
- `graph/LGraphAdaptersLPortAdapter.ts` `addSelfLoopEdges` (`J/graph/LGraphAdapters.java:380-389`, `:429-438`): needs
  `SELF_LOOP_HOLDER`, which nothing sets before 7g (T5 journal row).

## Every untaken branch

| File (under `src/alg/layered/`) | Function | TS lines | Branches | Category |
| ------------------------------- | -------- | -------- | -------- | -------- |
| `graph/LGraphUtil.ts` | `resizeNode` | 84, 89 | 4 | S1 |
| `graph/LGraphUtil.ts` | `movePort` | 113, 114, 118, 120, 124, 125, 130, 131 | 12 | S1 |
| `graph/LGraphUtil.ts` | `moveLabels` | 146, 147, 151 | 10 | S1 |
| `graph/LGraphUtil.ts` | `offsetGraph` | 195 | 2 | S2 |
| `graph/LGraphUtil.ts` | `isDescendant` | 293 | 2 | S2 |
| `graph/LGraphUtil.ts` | `changeCoordSystem` | 310, 321, 334 | 6 | S2 |
| `graph/LNode.ts` | `borderToContentAreaCoordinates` | 330, 334 | 4 | S2 |
| `graph/LNode.ts` | `getInteractiveReferencePoint` | 346, 353, 356 | 3 | S2 |
| `graph/LGraphUtilLayers.ts` | `placeNodesHorizontally` | 38, 40, 46, 50 | 8 | S3 |
| `graph/LGraphUtilLayers.ts` | `alignmentRatio` | 62, 64, 66, 68, 73, 77, 83, 85 | 10 | S3 |
| `graph/LGraphUtilLayers.ts` | `findMaxNonDummyNodeWidth` | 110, 117, 119 | 6 | S3 |
| `graph/LGraphUtilGraphProperties.ts` | `computeGraphProperties` | 37, 43, 45, 48, 53, 56 | 12 | S4 |
| `graph/LGraphUtilGraphProperties.ts` | `portGraphProperties` | 68, 74, 75, 76, 80, 81, 87 | 15 | S4 |
| `graph/LGraphUtilGraphProperties.ts` | `edgeGraphProperties` | 99, 102 | 2 | S4 |
| `graph/LGraphUtilPorts.ts` | `placeNewPort` | 69 | 1 | S5 |
| `graph/LGraphUtilPorts.ts` | `addNorthSouthPortProperty` | 87, 93 | 2 | S5 |
| `graph/LGraphUtilPorts.ts` | `calcPortSide` | 112 | 2 | S5 |
| `graph/LGraphUtilPorts.ts` | `directionalPortSide` | 164 | 1 | S5 |
| `graph/LGraphUtilPorts.ts` | `calcPortOffset` | 184, 186, 188 | 3 | S5 |
| `graph/LGraphUtilPorts.ts` | `provideCollectorPort` | 239, 254 | 2 | S5 |
| `graph/LGraphUtilPorts.ts` | `initializePort` | 307 | 1 | S5 |
| `graph/LGraphUtilPorts.ts` | `portRatio` | 329, 337 | 2 | S5 |
| `graph/LGraphUtilExternalPorts.ts` | `placeDummy` | 184, 190 | 2 | S6 |
| `graph/LGraphUtilExternalPorts.ts` | `placeNorthDummy` | 232, 236 | 4 | S6 |
| `graph/LGraphUtilExternalPorts.ts` | `placeSouthDummy` | 248, 252 | 2 | S6 |
| `graph/LGraphUtilExternalPorts.ts` | `orderInformation` | 260 | 1 | S6 |
| `graph/LGraphUtilExternalPorts.ts` | `indexInformation` | 278, 279, 283, 284 | 4 | S6 |
| `graph/LGraphUtilExternalPorts.ts` | `positionInformation` | 300, 306, 309 | 3 | S6 |
| `graph/LGraphUtilExternalPorts.ts` | `placeExternalPort` | 374 | 1 | S6 |
| `graph/LGraphUtilOther.ts` | `getIndividualOrInherited` | 29, 31, 37 | 8 | S7 |
| `graph/LGraphUtilOther.ts` | `getMinimalModelOrder` | 73 | 2 | S7 |
| `options/Spacings.ts` | `nodeTypeSpacing` | 122, 124 | 2 | S8 |
| `options/Spacings.ts` | `(anonymous_6)` | 133 | 2 | S8 |
| `options/Spacings.ts` | `(anonymous_7)` | 148 | 2 | S8 |
| `options/Spacings.ts` | `getHorizontalSpacing` | 163, 166 | 6 | S8 |
| `options/Spacings.ts` | `getLocalSpacing` | 181 | 2 | S8 |
| `options/Spacings.ts` | `getIndividualOrDefault` | 210, 212, 217 | 6 | S8 |
| `graph/Tarjan.ts` | `tarjan` | 40 | 2 | S9 |
| `graph/Tarjan.ts` | `stronglyConnected` | 52, 56, 63 | 6 | S9 |
| `graph/Tarjan.ts` | `visitEdge` | 84, 87, 91, 93, 96, 98 | 14 | S9 |
| `graph/Tarjan.ts` | `leave` | 113, 121 | 4 | S9 |
| `graph/LGraphAdapters.ts` | `adapt` | 63, 65 | 3 | S10 |
| `graph/LGraphAdaptersLEdgeAdapter.ts` | `getLabels` | 27 | 2 | S10 |
| `graph/LGraphAdaptersLGraphAdapter.ts` | `getNodes` | 75, 81 | 2 | S10 |
| `graph/LGraphAdaptersLGraphAdapter.ts` | `addCommentNodes` | 96, 102 | 2 | S10 |
| `graph/LGraphAdaptersLNodeAdapter.ts` | `getLabels` | 51 | 1 | S10 |
| `graph/LGraphAdaptersLNodeAdapter.ts` | `getPorts` | 61 | 1 | S10 |
| `graph/LGraphAdaptersLNodeAdapter.ts` | `(anonymous_7)` | 82 | 2 | S10 |
| `graph/LGraphAdaptersLNodeAdapter.ts` | `sortPortList` | 83 | 2 | S10 |
| `graph/LGraphAdaptersLPortAdapter.ts` | `getLabels` | 50 | 1 | S10 |
| `graph/LGraphAdaptersLPortAdapter.ts` | `getIncomingEdges` | 72, 74, 79, 81 | 4 | S10 |
| `graph/LGraphAdaptersLPortAdapter.ts` | `getOutgoingEdges` | 94, 96, 101, 103 | 4 | S10 |
| `graph/LGraphAdaptersPortComparator.ts` | `compare` | 20, 27, 29 | 8 | S10 |
| `graph/LGraphAdaptersPortComparator.ts` | `compareByPosition` | 41, 45, 49, 53, 57 | 5 | S10 |
| `graph/transform/ElkGraphImporterExternalPorts.ts` | `countExternalPortEdges` | 38, 45 | 2 | S11 |
| `graph/transform/ElkGraphImporterExternalPorts.ts` | `checkExternalPorts` | 83, 88, 99 | 7 | S11 |
| `graph/transform/ElkGraphImporterExternalPorts.ts` | `ensurePortBorderOffset` | 112 | 2 | S11 |
| `graph/transform/ElkGraphImporterExternalPorts.ts` | `computeLabelInsidePart` | 126 | 2 | S11 |
| `graph/transform/ElkGraphImporterExternalPorts.ts` | `transformExternalPortLabels` | 153, 159, 162, 163, 167, 168 | 10 | S11 |
| `graph/transform/ElkGraphImporterExternalPorts.ts` | `voteOutgoing` | 262, 265, 267 | 6 | S11 |
| `graph/transform/ElkGraphImporterExternalPorts.ts` | `voteIncoming` | 282, 285, 287 | 6 | S11 |
| `graph/transform/ElkGraphImporterExternalPorts.ts` | `isConnectedToExternalNodes` | 339 | 1 | S11 |
| `graph/transform/ElkGraphImporterFlat.ts` | `importInsideSelfLoops` | 87, 89, 90, 91 | 5 | S12 |
| `graph/transform/ElkGraphImporterModelOrder.ts` | `hasInsideSelfLoops` | 90 | 1 | S12 |
| `graph/transform/ElkGraphImporterHierarchical.ts` | `createNestedGraph` | 63, 70, 76 | 7 | S13 |
| `graph/transform/ElkGraphImporterHierarchical.ts` | `importHierarchicalNode` | 118, 124 | 2 | S13 |
| `graph/transform/ElkGraphImporterHierarchical.ts` | `importHierarchicalEdge` | 181 | 1 | S13 |
| `graph/transform/ElkGraphImporterHierarchical.ts` | `importHierarchicalEdges` | 213, 217 | 2 | S13 |
| `graph/transform/ElkGraphImporterHierarchical.ts` | `findCoordinateSystemOrigin` | 292, 296, 299 | 5 | S13 |
| `graph/transform/ElkGraphImporterEdges.ts` | `createSourcePort` | 74, 83 | 3 | S14 |
| `graph/transform/ElkGraphImporterEdges.ts` | `createTargetPort` | 97 | 1 | S14 |
| `graph/transform/ElkGraphImporterEdges.ts` | `transformEdgeLabels` | 112 | 1 | S14 |
| `graph/transform/ElkGraphImporterEdges.ts` | `copyOriginalBendPoints` | 139 | 1 | S14 |
| `graph/transform/ElkGraphImporterEdges.ts` | `checkEdgeValidity` | 255, 257 | 2 | S14 |
| `graph/transform/ElkGraphImporterEntryPoints.ts` | `ensureDefinedPortSide` | 43 | 1 | S14 |
| `graph/transform/ElkGraphImporterGraphs.ts` | `createLGraph` | 36 | 1 | S14 |
| `graph/transform/ElkGraphImporterMap.ts` | `lookup` | 17 | 1 | S14 |
| `graph/transform/ElkGraphImporterNodes.ts` | `transformNode` | 70 | 1 | S14 |
| `graph/transform/ElkGraphImporterNodes.ts` | `transformNodePorts` | 87 | 1 | S14 |
| `graph/transform/ElkGraphImporterPorts.ts` | `transformPortLabels` | 106 | 1 | S14 |
| `graph/transform/ElkGraphLayoutTransferrer.ts` | `applyLayout` | 48, 83, 96 | 3 | S14 |
| `graph/transform/ElkGraphLayoutTransferrer.ts` | `applyLayerlessNode` | 122 | 1 | S14 |
| `graph/transform/ElkGraphLayoutTransferrerApply.ts` | `needsNodeSize` | 56 | 1 | S14 |
| `graph/transform/ElkGraphLayoutTransferrerApply.ts` | `computeSourcePoint` | 128 | 1 | S14 |
| `graph/transform/ElkGraphLayoutTransferrerApply.ts` | `applyEdgeLayout` | 163, 179 | 2 | S14 |
| `graph/transform/ElkGraphLayoutTransferrerApply.ts` | `copyJunctionPoints` | 227 | 1 | S14 |
| `graph/transform/ElkGraphLayoutTransferrerApply.ts` | `applyParentNodeLayout` | 279 | 1 | S14 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `collectNodes` | 54, 56, 58, 66, 68, 70 | 8 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `applyPortLayoutNonMutating` | 88 | 2 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `applyNodeLayoutNonMutating` | 120, 121, 122, 123, 125, 139 | 10 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `sourcePointNonMutating` | 150 | 2 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `applyEdgeDetailsNonMutating` | 184, 187 | 2 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `applyEdgeLayoutNonMutating` | 205, 221, 238, 241 | 6 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `calculateHierarchicalOffsetNonMutating` | 254 | 2 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `applyParentNodeLayoutNonMutating` | 290, 294, 298, 307, 309 | 8 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `applyComputedPaddingNonMutating` | 317 | 2 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `applyNodesNonMutating` | 331, 335, 351 | 8 | S15 |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | `applyLayoutNonMutating` | 388 | 2 | S15 |
| `IHierarchyAwareLayoutProcessor.ts` | `isHierarchyAwareLayoutProcessor` | 23 | 3 | J |
| `LayeredLayoutProvider.ts` | `layout` | 39, 42, 47 | 4 | J |
| `LayeredPhases.ts` | `valueOf` | 45 | 2 | J |
| `components/ComponentOrderingStrategy.ts` | `valueOf` | 39 | 2 | J |
| `graph/LEdge.ts` | `reverse` | 52, 54, 57, 59, 67, 69 | 12 | J |
| `graph/LEdge.ts` | `setSource` | 93, 99 | 2 | J |
| `graph/LEdge.ts` | `setTarget` | 117, 123 | 2 | J |
| `graph/LEdge.ts` | `setTargetAndInsertAtIndex` | 139, 145 | 4 | J |
| `graph/LEdge.ts` | `isSelfLoop` | 156, 160 | 6 | J |
| `graph/LEdge.ts` | `isInLayerEdge` | 169 | 2 | J |
| `graph/LEdge.ts` | `getOther` | 194 | 2 | J |
| `graph/LEdge.ts` | `(anonymous_11)` | 198, 200, 202 | 4 | J |
| `graph/LEdge.ts` | `(anonymous_12)` | 208, 210, 212 | 4 | J |
| `graph/LEdge.ts` | `getDesignation` | 218 | 4 | J |
| `graph/LEdge.ts` | `toString` | 227, 230 | 6 | J |
| `graph/LEdge.ts` | `removeElement` | 243 | 2 | J |
| `graph/LEdge.ts` | `insertElement` | 250 | 4 | J |
| `graph/LGraph.ts` | `toString` | 132, 134 | 4 | J |
| `graph/LGraphElement.ts` | `getDesignation` | 25 | 2 | J |
| `graph/LLabel.ts` | `toString` | 31, 33 | 2 | J |
| `graph/LLabel.ts` | `getDesignation` | 39 | 2 | J |
| `graph/LNode.ts` | `setLayer` | 84 | 1 | J |
| `graph/LNode.ts` | `(anonymous_3)` | 90, 96 | 2 | J |
| `graph/LNode.ts` | `(anonymous_4)` | 102, 106, 112 | 9 | J |
| `graph/LNode.ts` | `getGraph` | 119 | 2 | J |
| `graph/LNode.ts` | `getPorts` | 169, 171, 173 | 5 | J |
| `graph/LNode.ts` | `(anonymous_10)` | 180, 182, 184 | 3 | J |
| `graph/LNode.ts` | `(anonymous_11)` | 191, 193, 195, 197, 199 | 5 | J |
| `graph/LNode.ts` | `getPortSideView` | 214, 220, 222 | 4 | J |
| `graph/LNode.ts` | `(anonymous_13)` | 232, 234 | 4 | J |
| `graph/LNode.ts` | `(anonymous_14)` | 233 | 2 | J |
| `graph/LNode.ts` | `getIndex` | 309, 311 | 2 | J |
| `graph/LNode.ts` | `(anonymous_27)` | 378, 379 | 4 | J |
| `graph/LNode.ts` | `getDesignation` | 390, 394 | 6 | J |
| `graph/LNode.ts` | `isInlineEdgeLabel` | 403, 404 | 2 | J |
| `graph/LNode.ts` | `toString` | 412 | 2 | J |
| `graph/LNode.ts` | `typePredicateOf` | 423, 425, 427 | 3 | J |
| `graph/LNode.ts` | `sidePredicateOf` | 435, 437, 439, 441, 443 | 5 | J |
| `graph/LNode.ts` | `removeElement` | 451 | 2 | J |
| `graph/LNode.ts` | `arrayIndex` | 458 | 4 | J |
| `graph/LNode.ts` | `get` | 471, 475, 476 | 6 | J |
| `graph/LNode.ts` | `has` | 482 | 2 | J |
| `graph/LNode.ts` | `set` | 486 | 4 | J |
| `graph/LNodeNodeType.ts` | `valueOf` | 55 | 2 | J |
| `graph/LNodeNodeType.ts` | `getColor` | 83, 85, 87, 89, 91, 93 | 6 | J |
| `graph/LPort.ts` | `setNode` | 79, 85 | 2 | J |
| `graph/LPort.ts` | `setSide` | 104, 108 | 2 | J |
| `graph/LPort.ts` | `getName` | 185 | 2 | J |
| `graph/LPort.ts` | `getIndex` | 269, 271 | 2 | J |
| `graph/LPort.ts` | `getDesignation` | 277, 281 | 6 | J |
| `graph/LPort.ts` | `toString` | 289, 293, 299 | 12 | J |
| `graph/LPort.ts` | `removeElement` | 311 | 2 | J |
| `graph/transform/ElkGraphTransformerUtility.ts` | `getOriginIdentifier` | 23 | 2 | J |
| `graph/transform/ElkGraphTransformerUtility.ts` | `getIdentifier` | 31, 33, 35 | 6 | J |
| `options/CenterEdgeLabelPlacementStrategy.ts` | `valueOf` | 53 | 2 | J |
| `options/CenterEdgeLabelPlacementStrategy.ts` | `usesLabelSizeInformation` | 80, 81, 82 | 3 | J |
| `options/ConstraintCalculationStrategy.ts` | `valueOf` | 32 | 2 | J |
| `options/CrossingMinimizationStrategy.ts` | `valueOf` | 61 | 2 | J |
| `options/CuttingStrategy.ts` | `valueOf` | 34 | 2 | J |
| `options/CycleBreakingStrategy.ts` | `valueOf` | 83 | 2 | J |
| `options/DirectionCongruency.ts` | `valueOf` | 32 | 2 | J |
| `options/EdgeConstraint.ts` | `valueOf` | 34 | 2 | J |
| `options/EdgeLabelSideSelection.ts` | `valueOf` | 40 | 2 | J |
| `options/EdgeLabelSideSelection.ts` | `transpose` | 70, 72, 74, 76, 78, 80, 82 | 7 | J |
| `options/EdgeStraighteningStrategy.ts` | `valueOf` | 35 | 2 | J |
| `options/FixedAlignment.ts` | `valueOf` | 40 | 2 | J |
| `options/GraphCompactionStrategy.ts` | `valueOf` | 46 | 2 | J |
| `options/GraphProperties.ts` | `valueOf` | 48 | 2 | J |
| `options/GreedySwitchType.ts` | `valueOf` | 34 | 2 | J |
| `options/GroupOrderStrategy.ts` | `valueOf` | 34 | 2 | J |
| `options/InLayerConstraint.ts` | `valueOf` | 34 | 2 | J |
| `options/InteractiveReferencePoint.ts` | `valueOf` | 32 | 2 | J |
| `options/LayerConstraint.ts` | `valueOf` | 38 | 2 | J |
| `options/LayerUnzippingStrategy.ts` | `valueOf` | 32 | 2 | J |
| `options/LayeredSpacings.ts` | `(anonymous_2)` | 39, 41, 42, 43, 45, 47, 49 | 14 | J |
| `options/LayeringStrategy.ts` | `valueOf` | 74 | 2 | J |
| `options/LongEdgeOrderingStrategy.ts` | `valueOf` | 35 | 2 | J |
| `options/LongEdgeOrderingStrategy.ts` | `returnValue` | 62, 64, 66 | 3 | J |
| `options/NodeFlexibility.ts` | `valueOf` | 51 | 2 | J |
| `options/NodeFlexibility.ts` | `isFlexibleSizeWhereSpacePermits` | 82 | 2 | J |
| `options/NodeFlexibility.ts` | `isFlexiblePorts` | 88, 89, 90 | 3 | J |
| `options/NodeFlexibility.ts` | `isAtLeast` | 103, 105, 108, 110 | 4 | J |
| `options/NodeFlexibility.ts` | `getNodeFlexibility` | 123, 125 | 2 | J |
| `options/NodePlacementStrategy.ts` | `valueOf` | 54 | 2 | J |
| `options/NodePromotionStrategy.ts` | `valueOf` | 58 | 2 | J |
| `options/OrderingStrategy.ts` | `valueOf` | 36 | 2 | J |
| `options/PortSortingStrategy.ts` | `valueOf` | 32 | 2 | J |
| `options/PortType.ts` | `valueOf` | 30 | 2 | J |
| `options/SelfLoopDistributionStrategy.ts` | `valueOf` | 34 | 2 | J |
| `options/SelfLoopOrderingStrategy.ts` | `valueOf` | 34 | 2 | J |
| `options/SelfLoopPlacementStrategy.ts` | `valueOf` | 37 | 2 | J |
| `options/SplineRoutingMode.ts` | `valueOf` | 34 | 2 | J |
| `options/ValidifyStrategy.ts` | `valueOf` | 34 | 2 | J |
| `options/WrappingStrategy.ts` | `valueOf` | 34 | 2 | J |
| `graph/LGraphAdaptersLPortAdapter.ts` | `addSelfLoopEdges` | 124, 127 | 3 | U |
| `graph/LGraphUtilGraphProperties.ts` | `edgeGraphProperties` | 103 | 1 | U |
| `options/CrossingMinimizationStrategy.ts` | `create` | 91, 93, 95, 97, 99 | 5 | X |
| `options/CycleBreakingStrategy.ts` | `create` | 113, 115, 117, 119, 121, 123, 125, 127, 129, 131 | 10 | X |
| `options/LayeringStrategy.ts` | `create` | 104, 106, 108, 110, 112, 114, 116, 118, 120, 122 | 10 | X |
| `options/NodePlacementStrategy.ts` | `create` | 84, 86, 88, 90, 92, 94 | 6 | X |

## Re-planning input (X5: every unreached branch gets an oracle row)

The user chose the literal L4 reading (X5): the 300 J branches also need oracle site rows, which takes T10 past stop
11's cap of about 15 scenarios. Candidate groups for the re-plan, by where the branches sit (J branches per file):

| Candidate | Branches | Files (J count) | Oracle shape |
| --------- | -------- | --------------- | ------------ |
| S16 `site/lnode/bookkeeping` | 79 | `graph/LNode.ts` (79) | one LGraph with layers; `setLayer` both forms, `getPorts` all four forms over every type/side, `getPortSideView` before/after `cachePortSides`, edge iterables, `getIndex`, `isInlineEdgeLabel`, `toString`/designation |
| S17 `site/ledge/bookkeeping` | 54 | `graph/LEdge.ts` (54) | `setSource`/`setTarget`/`setTargetAndInsertAtIndex`, `reverse` with and without collector ports and end labels, `getOther` both forms incl. throws, `isSelfLoop`/`isInLayerEdge`, `toString` |
| S18 `site/lport/bookkeeping` | 28 | `graph/LPort.ts` (28) | `setNode`, `setSide` per side (anchor), predicates, degree/net flow, predecessor/successor/connected iterables, `getIndex`, designation, `toString` |
| S19 `site/lgraph/strings` | 22 | `LGraph.ts` (4), `LLabel.ts` (4), `LGraphElement.ts` (2), `transform/ElkGraphTransformerUtility.ts` (8), `LNodeNodeType.ts` getColor (part of 8) and `LayeredLayoutProvider.ts` (4) | `toString`, `getDesignation`, origin identifiers of imported elements, `NodeType.getColor`, provider delegation |
| S20 `site/options/enums` | ~95 | every option enum, `LayeredPhases`, `ComponentOrderingStrategy`, `NodeType` (`valueOf` miss, `name`, `ordinal`, `compareTo`), `EdgeLabelSideSelection`, `CenterEdgeLabelPlacementStrategy`, `LongEdgeOrderingStrategy`, `NodeFlexibility` methods per constant, `IHierarchyAwareLayoutProcessor` | reflection over each Java enum: constants, `valueOf` of a bad name (exception text), each method per constant |
| S21 `site/layeredSpacings/targetFilter` | 14 | `options/LayeredSpacings.ts` (14) | `OPTION_TARGET_FILTER` over each LGraph element kind × option targets |
| S22 `site/nodeFlexibility/lookup` | (in S20) | `options/NodeFlexibility.ts` `getNodeFlexibility` | node with/without the option, graph default |

That is 15 + 6–7 = 21–22 scenarios before any further splitting; T10/T11 need a re-plan (recorder shape for
reflection-driven enum rows, row budget against the 5 MB cap, test-file layout).

## Amendments after T10 and T11 (2026-10-28, X5–X7)

Appended; the tables above are the T9 record and are not edited. After T10 recorded the 22 groups (330 rows, with
the `fix(T10)` rows) and T11a–T11d anchored them, these branches of the table above are reclassified **U** (Java
cannot take them, or the Java mechanism is unreachable from the public API in 7a), each with the reason the owning
task verified:

| File (under `src/alg/layered/`) | TS lines | Was | Reason |
| ------------------------------- | -------- | --- | ------ |
| `graph/LGraphUtil.ts` `offsetGraph` | 195 | S2 | `JUNCTION_POINTS` defaults to a non-null empty chain and a null set restores the default (T3 note, T11b) |
| `graph/LNode.ts` `getInteractiveReferencePoint` default arm | 356 | S2 | `InteractiveReferencePoint` has only CENTER and TOP_LEFT (T10) |
| `graph/LNode.ts` `getPortSideView` proxy `has` trap | 220 | J | TS-only surface (Java `subList` has no membership-by-index); kept by the existing structural cases (T10, T11b) |
| `graph/transform/ElkGraphImporterGraphs.ts` `createLGraph` label-manager arm | 36 | S14 | `LABEL_MANAGER` is not carried by ELK JSON, so no row can round-trip it; two Java-source cases without a row (T10, T11c) |
| `graph/transform/ElkGraphImporterMap.ts` `lookup` null key | 17 | S14 | no importer path passes a null key; one Java-source case (`HashMap.get(null)`) without a row (T11c) |
| `graph/transform/ElkGraphImporterHierarchical.ts` | 213, 296, 299 | S13 | the hierarchy queue holds only `INCLUDE_CHILDREN` nodes; an edge's containing node without an LNode or nested graph fails the map lookup first; `findCoordinateSystemOrigin` null-nested arm unreachable from any importable graph (T10, T11c) |
| `graph/transform/ElkGraphLayoutTransferrer.ts` `applyLayerlessNode` | 122 | S14 | external-port dummies exist only in the top-level graph of a run (T11c) |
| `graph/transform/ElkGraphLayoutTransferrerApply.ts` | 163, 224–227 | S14 | importer-built edges always carry `ORIGIN`; `JUNCTION_POINTS` is never null (T10, T11c) |
| `graph/transform/ElkGraphLayoutTransferrerNonMutating.ts` | 184, 205, 238, 298, 307, 317, 331, 335 (×2) | S15 | dead by construction: the rebuilt graph is a fresh `ElkGraph` with no options (`ElkGraphLayoutTransferrer.java:459, :516, :588, :762, :779` read the fresh elements), `createEdge` never returns null (`:520`), `JUNCTION_POINTS` is never null (`:705`), `collectNodes` already drops external-port dummies; orchestrator-verified against the Java (T11c) |
| `LayeredLayoutProvider.ts` `layout` `isCanceled` arm | 47 | J | reachable only after 7f: the staged `ElkLayered.doLayout`/`doCompoundLayout` throw first (X6); rows `site/provider/{cancelled,include-children-cancelled}` keep the oracle layout for 7f (T11c) |
| `IHierarchyAwareLayoutProcessor.ts` null/primitive guards | 23 | J | TS-only surface, no Java counterpart (X6); the `hierarchyAware` row pins the two `instanceof` results and the implementor list (T11c) |
| `options/EdgeLabelSideSelection.ts` `transpose` default arm | 82 | J | closed enum (`assert false; return null`); one non-oracle structural case asserting the Java-source `null` (T11d) |

Every other branch of the table has a `layered-sites.json` row and a colocated case citing it (T11a replays all 330
rows; T11b 138 rows, T11c 139, T11d 53). Per-class branch coverage after T11 is 100 % for every non-staged 7a class
except `LGraphUtil.ts` 97.2 %, `LNode.ts` 98.9 %, `ElkGraphImporterHierarchical.ts` 94.6 %,
`ElkGraphLayoutTransferrer.ts` 92.9 %, `ElkGraphLayoutTransferrerApply.ts` 94.1 %,
`ElkGraphLayoutTransferrerNonMutating.ts` 78.8 % and `LayeredLayoutProvider.ts` 50 %, each remainder listed above.
