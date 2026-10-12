<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — JVM vectors for the ElkGraph model

**Agent:** java-architect · **Commit:** `test(vectors): record elkgraph model behaviour from the oracle jvm`

## Context
The ElkGraph model's observable behaviour (unique live lists, inverse references, containment
moves, property-map order, `eAllContents` order, `toString`, exceptions) is EMF's, not written
down in ELK. Per AD-13 the expected values are recorded on the JVM **before** any TS model exists;
T6 and T9 replay them. The generator only *calls* ELK/EMF and records results (D9). It runs the
oracle's built `org.eclipse.elk.graph` jar so the recorded behaviour is the pinned commit's.

## Task
1. Write `tools/vectors/graph-vectors.sh` (bash 3.2-compatible, like `tools/oracle/run.sh`): reads
   `jars["org.eclipse.elk.graph"]` from `../elk-oracle/oracle-build.json` (honour `ELK_ORACLE_DIR`),
   resolves `org.eclipse.emf.common`, `org.eclipse.emf.ecore` and Guava from the p2 cache the
   same way `run.sh` does, then runs `java -cp … tools/vectors/GraphVectors.java <outDir>`.
2. Write `tools/vectors/GraphVectors.java`: a scripted-scenario interpreter. Each scenario is a
   list of steps over elements addressed by string ids; after every step it records the full
   state. Scenarios are hard-coded in the generator (deterministic, no randomness).
3. Run it twice; commit the byte-identical `test/golden/refs/java/graph.json`.

## Write-set
`tools/vectors/GraphVectors.java`, `tools/vectors/graph-vectors.sh`,
`test/golden/refs/java/graph.json` (generated, never hand-edited).

## Read-set
- `../decisions.md#d2--elist-and-emap-contract`, `#d4--eobject-surface`, `#d9--jvm-vectors-for-the-model`, `#d10--divergences-accepted-up-front`
- `tools/vectors/GuavaVectors.java:1-80` (style, JSON encoding helpers), `tools/oracle/run.sh`
  (classpath resolution from the p2 cache), `tools/oracle/README.md`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/model/elkgraph.ecore` (features and opposites)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkGraphUtil.java:80-700`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.graph.test/src/org/eclipse/elk/graph/util/ElkGraphUtilTest.java`
  (its graph must be one scenario)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/GraphIdentifierGenerator.java:230-330`

## Interface contract (output, consumed by T6, T9, T10)
```json
{ "jdk": "…", "elkCommit": "8aaa3c14…", "scenarios": [ { "name": "…", "steps": [
  { "op": "createNode", "id": "n1", "parent": "g" },
  { "op": "listAdd", "owner": "e1", "feature": "sources", "element": "n1", "result": true,
    "state": { "<id>": { "class": "ElkNode", "container": "g" | null,
                         "lists": { "children": ["n1"], "ports": [], "labels": [], "containedEdges": [],
                                    "outgoingEdges": [], "incomingEdges": [] },
                         "toString": "ElkNode \"n1\" (0.0,0.0 | 0.0,0.0)" | null }, … },
    "allContents": { "g": ["n1", "e1", …] },
    "propertyKeys": { "n1": ["org.test.a", "org.test.b"] },
    "throws": { "class": "IllegalArgumentException", "message": "…" } } ] } ] }
```
- Ops: `createGraph`, `createNode` (`ElkGraphUtil.createNode(parent|null)`), `createPort`,
  `createLabel` (`text?`), `createEdge` (`containingNode|null`), `createSimpleEdge`,
  `createHyperedge`, `createEdgeSection`, `createBendPoint`, `setParent`, `setContainingNode`,
  `setIdentifier`, `setText`, `setLocation`, `setDimensions`, `listAdd`, `listAddAt`, `listSet`,
  `listRemove`, `listRemoveAt`, `listMove`, `listClear`, `setProperty` (string value),
  `removeProperty` (`setProperty(p, null)`), `copyProperties`, `sortChildren` (`ECollections.sort`
  by identifier, descending), `updateContainment`, and read-only queries recorded as `result`:
  `findBestEdgeContainment`, `containingGraph`, `findLowestCommonAncestor`, `isDescendant`,
  `elementLabeledBy`, `isHyperedge`, `isHierarchical`, `isSelfloop`, `isConnected`,
  `firstEdgeSection(reset, removeOthers)`, `generateIdentifiers` (`assertValid().assertExists()`,
  recording every identifier after `execute()`).
- Features recorded per class: node `labels, ports, children, containedEdges, outgoingEdges,
  incomingEdges`; port `labels, outgoingEdges, incomingEdges`; label `labels`; edge `labels,
  sources, targets, sections`; section `bendPoints, outgoingSections, incomingSections` plus
  scalars `incomingShape`, `outgoingShape`, `startX/Y`, `endX/Y`; bend point `x, y`.
- `toString` is recorded only for `ElkNode`, `ElkPort`, `ElkEdge`, `ElkLabel`, and property map
  entries (deterministic); `null` for shapes/sections/bend points whose Java `toString` embeds an
  identity hash (D10).
- Properties: `new Property<String>("org.test.a")` etc.; keys recorded by id in map order.
- `throws`: simple class name + message, state recorded after the failed step.
- Exceptions inside a list op (`listSet` duplicate) record EMF's message verbatim.

## Scenarios (≥ 30; names are push-forward)
The `ElkGraphUtilTest` graph with every `findBestEdgeContainment` case (incl. the cross-graph
`null` and the unconnected throw); label-of-label chains (`elementLabeledBy`, `containingGraph`);
hyperedge with outer/inner sections and `incoming/outgoingSections` inverse; `setParent` moving a
node between parents and between graphs (containedEdges unaffected); `listAdd` duplicate →
`false`; `listSet` to a duplicate → throw; recursive containment (node into its own child's
children; edge containing-node into a node it is an ancestor of? — follow what the Java allows);
`listMove`; `sortChildren`; `removeProperty` then `setProperty` (appends); `setProperty` on an
existing key (position kept); `copyProperties` between holders; `eAllContents` on a graph with
properties, labels, ports, children, edges, sections, bend points (order per D4); `firstEdgeSection`
with 3 sections; `generateIdentifiers` on ids `'a b'`, `'1x'`, `''`, `null`, `'ok'`, duplicates.

## Acceptance criteria
- Given the wrapper, when run twice, then the two `graph.json` files are byte-identical (sha256).
- Given the `ElkGraphUtilTest` scenario, then the recorded results equal every JUnit assertion
  (incl. `null` for the cross-graph edge and `IllegalArgumentException` for the unconnected edge).
- Given a duplicate `listAdd` and a `listSet` to a duplicate, then the recorded outcomes are
  `false` and `IllegalArgumentException` with EMF's message.
- Given `setProperty/removeProperty/setProperty` sequences, then `propertyKeys` records
  insertion order with the re-put key last.
- Given `generateIdentifiers`, then recorded ids are `a_b`, `_x`, generated `N1`…/`G1` as the
  Java produces.

## Quality bar
README gates. Each Java method ≤ 30 NLOC, CCN ≤ 10 (lizard; beware `<` after `:` in lambdas,
see `.agent-notes/java-foundations.md`). JDK 21. File header lists the ELK/EMF classes exercised.
`shellcheck` clean on the wrapper.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit (new files only).

## Boundaries
Never edit `tools/vectors/JavaVectors.java` or any existing vector file (M4, STOP 4). No TS
changes. No randomness anywhere in the scenarios (no `assertUnique`, no `Math.random`).
