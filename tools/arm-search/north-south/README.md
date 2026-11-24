<!-- SPDX-License-Identifier: EPL-2.0 -->

# North/south routing arms (issue #59, arms 1-6)

The six arms of `NorthToSouthRoutingStrategy` and `SouthToNorthRoutingStrategy` that mission 7h left unreached
(`tools/arm-search/arms.json`, group `north-south`). All six are reached through layout by the four graphs of
`candidates.json`.

| Candidate                                                       | Arms                                                           | Java                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- |
| `sites/HierarchicalPortOrthogonalEdgeRouter/splitSegment/north` | 2 (`SouthToNorthRoutingStrategy.ts:38 if[0]`), 6 (`:78 if[0]`) | `SouthToNorthRoutingStrategy.java:47`, `:72` |
| `sites/HierarchicalPortOrthogonalEdgeRouter/splitSegment/south` | 1 (`NorthToSouthRoutingStrategy.ts:38 if[0]`), 5 (`:78 if[0]`) | `NorthToSouthRoutingStrategy.java:47`, `:72` |
| `sites/HierarchicalPortOrthogonalEdgeRouter/straightEdge/north` | 4 (`SouthToNorthRoutingStrategy.ts:58 if[1]`)                  | `SouthToNorthRoutingStrategy.java:62`        |
| `sites/HierarchicalPortOrthogonalEdgeRouter/straightEdge/south` | 3 (`NorthToSouthRoutingStrategy.ts:58 if[1]`)                  | `NorthToSouthRoutingStrategy.java:62`        |

Northern external ports are routed by the south-to-north strategy and southern ones by the north-to-south strategy
(`HierarchicalPortOrthogonalEdgeRouter.java:544-585`), hence the crossed names.

## Files

- `generate.ts`: builds the four graphs. Nothing is random; its header derives each graph from the guard of its arm.
- `candidates.json`: the generator's output, in the format of `tools/arm-search/screen.spec.ts` (kind `compound`: a
  `run` row of `SITE_ROWS` in `tools/vectors/LayeredCompoundVectors.java`).
- `instrument/north-south-routing.patch`: logging lines for scratch copies of `OrthogonalRoutingGenerator.java` and the
  two strategies (the segments of a hierarchical port routing, the critical threshold and dependency count, and one
  line in each of the three arms). It is not an oracle patch; `instrument.sh apply` applies it to a scratch copy only.

## Reproduce

```sh
scratch="$TMPDIR/layered-arm-search/north-south"
npx tsx tools/arm-search/north-south/generate.ts            # rewrites candidates.json, byte for byte

# the port: every candidate takes its arms
tools/arm-search/screen.sh --each tools/arm-search/north-south/candidates.json

# the oracle: the instrumented lines "ARM <Strategy>.java:<line> ..." name the arm taken
tools/arm-search/instrument.sh apply "$scratch/src" tools/arm-search/north-south/instrument/north-south-routing.patch
tools/arm-search/instrument.sh build "$scratch/src" "$scratch/classes"
# one ELK JSON file per candidate (the `elk` member), then a single-file probe that lays each out with
# RecursiveGraphLayoutEngine (tools/arm-search/README.md, "Confirming a candidate on the oracle")
tools/arm-search/instrument.sh probe "$scratch/classes" "$scratch/LayoutProbe.java" "$scratch"/final/*.json
```

## Why earlier scans missed the arms

- The strategies only see one hyperedge segment per north/south external port. A port with a single connection gives a
  segment that is a straight line or a plain two-bend route: no dependency, no split, no straight edge inside a routed
  segment. Each arm needs a port connected to nodes in **several layers**.
- In a compound layout the nested graph's port constraints are reduced to `FIXED_SIDE` or `FREE`
  (`CompoundGraphPreprocessor.java:941-945`), so `FIXED_POS` and `FIXED_RATIO` positions never reach the router there:
  the port dummy sits at the mean x of its layer dummies. The position is set through the connections, not the port.
- With `SEPARATE_CHILDREN` a `FIXED_POS` compound node does reach the router with its positions (two ports with
  swapped anchors and two children reach the same arms), but a `run` row cannot hold that graph: the row's replay
  compares the tree at the last `CompoundGraphPostprocessor` stop (`replayScenario`,
  `test/helpers/layered-compound-replay-stops.ts`), which a run without `INCLUDE_CHILDREN` does not have.
