<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-crossing-min-tests (mission 7c-tests, 2026-11-03)

## Observation: JUnitCore needs one JVM per class for per-suite counts

- **Context**: T1 writing `tools/oracle/java-tests.sh`.
- **Finding**: `org.junit.runner.JUnitCore a b c` prints one combined `OK (n tests)` / `Tests run:` summary; per-class
  counts need one invocation per class (about 0.5 s each, 6.6 s for the fourteen suites). A class it cannot load is
  reported as `Tests run: 1, Failures: 1` (JUnit's own `initializationError`), so a typo in a class name shows as a
  failing suite, not a usage error.
- **Impact**: 7d–7h pass fully qualified names and read the per-line counts; a `runs=1 failures=1` line is a name to
  check first.
- **Confidence**: High

## Observation: `getCrossWithManySelfLoopsGraph` returns with stale port ids

- **Context**: T2's id-numbering test over every builder of `TestGraphCreator`.
- **Finding**: Java returns at `TestGraphCreator.java:406` without a closing `setUpIds()`; the mid-builder call at
  line 389 numbered only the first two ports, so later ports keep creation-counter ids (`[0, 2, 3, …]`).
- **Impact**: a ported suite reading `port.id` or `node.id` after this builder must call `setUpIds()` first; Java
  behaves the same.
- **Confidence**: High

## Observation: `MockRandom.nextFloat` advances before returning, at float precision

- **Context**: T2 porting `MockRandom` (`TestGraphCreator.java:1338-1376`).
- **Finding**: `current += changeBy; return current;` is `float += double`, so the first draw is `fround(0.0001)` =
  0.00009999999747378752, then 0.00019999999494757503 and 0.00029999998514540493; `nextDouble` delegates, so float and
  double draws share one sequence.
- **Impact**: expected values that read the sequence are the float-narrowed sums, not multiples of 0.0001.
- **Confidence**: High

## Observation: `TestGraphCreator` builders that read list-valued option defaults need `initElkReflect()`

- **Context**: T2's builder tests.
- **Finding**: `addNorthSouthEdge`, `setPortOrderFixed`, `addExternalPortDummyNodeToLayer` and
  `getNodesInDifferentLayoutUnitsPreventSwitch` read `IN_LAYER_SUCCESSOR_CONSTRAINTS`/`GRAPH_PROPERTIES` defaults
  through `getProperty`, which clones the default and throws `IllegalStateException` without
  `LayoutMetaDataService.initElkReflect()`.
- **Impact**: every ported suite calls it in `beforeAll` (the 7c note on hand-built graphs applies to the creator).
- **Confidence**: High

## Observation: `GRAPH_PROPERTIES` is an `EnumSet`, not a JS `Set`

- **Context**: T3a asserting that `setPortOrderFixed` marks the graph with `NON_FREE_PORTS`.
- **Finding**: `InternalProperties.GRAPH_PROPERTIES` holds an `EnumSet<GraphProperties>` (`src/java/util/EnumSet.ts`);
  membership is `.contains(x)`, and `.has(x)` is a runtime `TypeError`.
- **Impact**: ported suites that check graph properties use `contains`.
- **Confidence**: High

## Observation: a portless node keeps `PORT_CONSTRAINTS` `UNDEFINED` in the creator's graphs

- **Context**: T3a port-constraint assertions over the 13 in-layer builders.
- **Finding**: `addPortOnSide` raises the default `UNDEFINED` to `FIXED_SIDE` on a node's first port, so a node that
  never gets a port stays `UNDEFINED` (`getInLayerEdgesCrossingsNoFixedOrderNoEdgeBetweenUpperAndLower`, left node 0);
  `setFixedOrderConstraint`/`setPortOrderFixed` set `FIXED_ORDER`.
- **Impact**: expectations on port constraints in the counter suites must account for portless nodes.
- **Confidence**: High

## Observation: a nested `GraphInfoHolder` is looked up by graph id

- **Context**: T5 building nested `GraphInfoHolder`s in `LayerSweepTypeDeciderTest`.
- **Finding**: `GraphInfoHolder` finds its parent holder as `graphs[parent.getGraph().id]`; `LGraph.id` defaults to 0,
  so the suite sets `graph.id = 0` and `nestedGraph.id = 1` by hand before building the holders, with the top-level
  holder at index 0 of the list.
- **Impact**: any hand-built nested `GraphInfoHolder` test sets graph ids first or the lookup returns the wrong holder.
- **Confidence**: High

## Observation: the hierarchical sweep paths pass the Java-literal suites first time

- **Context**: T5's nested-graph cases (`GraphInfoHolder` with a parent, `LayerSweepTypeDecider` on child graphs,
  `sweepInHierarchicalNodes`, `GreedyPortDistributor` on compound nodes) — paths no oracle replay row reaches.
- **Finding**: all 17 such cases pass against the Java literals with no change to `src/`.
- **Impact**: 7h still re-measures them with recorded rows, but the paths now carry a Java-derived check.
- **Confidence**: High

## Observation: two groups of north/south builders leave different dummy state

- **Context**: T3b porting `NorthSouthEdgeTestGraphCreator`.
- **Finding**: `getThreeLayerNorthSouthCrossingShouldSwitchGraph` sets `setAsNorthSouthNode` and `ORIGIN` by hand and never
  sets `PORT_DUMMY` or `IN_LAYER_LAYOUT_UNIT` (the dummies keep themselves as layout unit); three builders mark long-edge
  dummies with `setType(LONG_EDGE)` only, keeping `IN_LAYER_LAYOUT_UNIT` = the node, while `setAsLongEdgeDummy` builders
  have a null unit. In `addNorthSouthEdge`, `normalNodeEastOfNsPortNode` is true when the east/west node is in an
  _earlier_ layer (name inverted); the port sides follow that flag. All faithful to the Java.
- **Impact**: tests depending on layout units or port dummies see this split between builder groups; do not "fix" it.
- **Confidence**: High
