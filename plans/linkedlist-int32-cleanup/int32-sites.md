<!-- SPDX-License-Identifier: EPL-2.0 -->

# Int32 sites: crossing-count and path-count sums (T2, D4)

Scope: non-test sources of `src/alg/layered/intermediate/greedyswitch/`, `src/alg/layered/p3order/` and
`src/alg/layered/p3order/counting/`. TS paths are relative to `src/alg/layered/`, Java paths to
`plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/` at `8bca22f4`. TS lines are those after the
change. Each row was classified by the Java declared operand types (D4), and every `converted` row was read against
the Java by the orchestrator after the subagent's pass.

Enumeration (run in the worktree; `D` is the two directory roots, `counting/` is under `p3order/`):

```sh
D="src/alg/layered/intermediate/greedyswitch src/alg/layered/p3order"
rg -n '(\+=|-=|\*=)' $D -g '!*.test.ts'                                # compound assignments
rg -n '(\+\+|--)' $D -g '!*.test.ts' | rg -v 'for \('                  # increments outside a for header
rg -n '[\w\)\]!] [+\-*] [\w\(!]' $D -g '!*.test.ts'                    # bare binary + - *
```

Totals: **30 statements converted** in 9 files (rows 1-17: the 3 of row 6 with a wrap test, 27 `converted (no seam)`),
**9 rows kept** (rows 18-26). Row 27 lists what was `Int32` before this mission.

## Converted

| # | TS file:line | Java file:line | operation (Java) | verdict | reason or test name |
| - | ------------ | -------------- | ---------------- | ------- | ------------------- |
| 1 | `intermediate/greedyswitch/SwitchDecider.ts:138-144` | `SwitchDecider.java:138-141` | `int upperLowerCrossings = getCrossingMatrixEntry(upper, lower) + leftInlayer.getFirst() + rightInlayer.getFirst() + northSouthCounter.getUpperLowerCrossings()` | converted (no seam) | three nested `Int32.add`, left to right; needs more than 2^31 crossings |
| 2 | `intermediate/greedyswitch/SwitchDecider.ts:145-151` | `SwitchDecider.java:142-145` | the same four-term sum for `lowerUpperCrossings` | converted (no seam) | as row 1 |
| 3 | `intermediate/greedyswitch/SwitchDecider.ts:155-156` | `SwitchDecider.java:152-153` | `upperLowerCrossings += crossingNumbers.getFirst()`; `lowerUpperCrossings += crossingNumbers.getSecond()` | converted (no seam) | `Pair<Integer, Integer>` unboxed into `int` addition |
| 4 | `intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.ts:198,201` | `BetweenLayerEdgeTwoNodeCrossingsCounter.java:213,216` | `upperLowerCrossings += upperAdjacencies.size()`; `lowerUpperCrossings += lowerAdjacencies.size()` (`int` fields, `:36-37`) | converted (no seam) | accumulates over the merge loop, so not bounded by one collection |
| 5 | `intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.ts:204-211` | `BetweenLayerEdgeTwoNodeCrossingsCounter.java:219-220` | `… += countAdjacenciesBelowNodeOfFirstPort()` for both fields | converted (no seam) | as row 4 |
| 6 | `p3order/LayerSweepTypeDeciderNodeInfo.ts:19-21` | `LayerSweepTypeDecider.java:165-167` | `hierarchicalInfluence += …; randomInfluence += …; connectedEdges += …` (`int` fields, `:160-162`) | converted | `LayerSweepTypeDeciderNodeInfo.test.ts` › "wraps every field to the low 32 bits when the sum passes Integer.MAX_VALUE" (red before: `expected 2147483648 to be -2147483648`) |
| 7 | `p3order/LayerSweepTypeDecider.ts:112` | `LayerSweepTypeDecider.java:93` | `pathsToHierarchical += currentNode.connectedEdges` (`int` locals, `:76-77`) | converted (no seam) | `nodeInfo` is private; needs more than 2^31 paths |
| 8 | `p3order/LayerSweepTypeDecider.ts:117` | `LayerSweepTypeDecider.java:98` | `pathsToRandom += currentNode.connectedEdges` | converted (no seam) | as row 7 |
| 9 | `p3order/LayerSweepTypeDecider.ts:140-141` | `LayerSweepTypeDecider.java:104-105,127-128` | `pathsToRandom += randomInfluence; pathsToHierarchical += hierarchicalInfluence` per outgoing edge | converted (no seam) | one TS helper (`transferAlongOutgoingEdges`) is both Java loops |
| 10 | `p3order/LayerSweepTypeDecider.ts:130-131` | `LayerSweepTypeDecider.java:116-117` | the same two `+=` per north/south dummy | converted (no seam) | as row 7 |
| 11 | `p3order/LayerSweepTypeDecider.ts:77` | `LayerSweepTypeDecider.java:135` | `double allPaths = pathsToRandom + pathsToHierarchical` | converted (no seam) | an `int` addition, widened to `double` afterwards (JLS 5.2) |
| 12 | `p3order/LayerSweepTypeDecider.ts:81` | `LayerSweepTypeDecider.java:136` | `(pathsToRandom - pathsToHierarchical) / allPaths` | converted (no seam) | `Int32.sub`, then the `double` division |
| 13 | `p3order/LayerSweepTypeDecider.ts:161` | `LayerSweepTypeDecider.java:152` | `targetNodeInfo.connectedEdges++` | converted (no seam) | the path-count field of row 6, not a count of one collection (JLS 15.14.2: `++` is `int` addition) |
| 14 | `p3order/GreedyPortDistributor.ts:126-133` | `GreedyPortDistributor.java:117-118` | `upperLowerCrossings += hierarchicalCrossingsCounter.getUpperLowerCrossings()`; the same for `lowerUpper` (`int` locals, `:110-111`) | converted (no seam) | needs more than 2^31 crossings |
| 15 | `p3order/LayerSweepCrossingMinimizerCounting.ts:53,69,105` | `LayerSweepCrossingMinimizer.java:348,378` | `wrongModelOrder++` (`int`, `:337,367`) | converted (no seam) | counts pairs, n(n-1)/2 per layer or per node, so not bounded by one collection; `:53` is the port's own `+=` of a per-layer subtotal (helper split), congruent mod 2^32 with Java's single `++` chain |
| 16 | `p3order/BarycenterHeuristic.ts:371` | `BarycenterHeuristic.java:251` | `stateOf(node).degree++` (`int degree`, `:296`) | converted (no seam) | the field `:246,267` add callee degrees to (already `Int32.add` at `BarycenterHeuristic.ts:378`) |
| 17 | `p3order/ForsterConstraintResolverConstraintGroup.ts:91`; `p3order/counting/HyperedgeCrossingsCounter.ts:126,131,337` | `ForsterConstraintResolver.java:443`; `HyperedgeCrossingsCounter.java:206,211,313` | `degree = nodeGroup1.degree + nodeGroup2.degree`; `portPos[port.id] = targetCount + northInputPorts + otherInputPorts`; `targetCount += otherInputPorts`; `firstIndex -= 1` | converted (no seam) | sums of group degrees; sums over the port lists of every node of a layer (the same function already wrapped `targetCount + 1`); `firstIndex` sits between the already wrapped `firstIndex *= 2` and `2 * firstIndex - 1` |

## Kept bare

| # | TS file:line | Java file:line | operation (Java) | verdict | reason |
| - | ------------ | -------------- | ---------------- | ------- | ------ |
| 18 | `p3order/GreedyPortDistributor.ts:165` | `GreedyPortDistributor.java:145` | `nPorts += node.getPorts().size()` | kept | it is the size of the array `new int[nPorts]` (`:150`): bounded by an array size |
| 19 | `intermediate/greedyswitch/NorthSouthEdgeNeighbouringNodeCrossingsCounter.ts:140` | `NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:152` | `numberOfEdges += hasConnectedNorthSouthEdge(port) ? 1 : 0` | kept | adds 0 or 1 per port of one node's port list |
| 20 | `intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.ts:102` | `BetweenLayerEdgeTwoNodeCrossingsCounter.java:307` | `currentSize - currentAdjacency().currentCardinality` | kept | both count entries of one adjacency list and `currentCardinality <= currentSize`: result in `[0, size]` |
| 21 | `p3order/LayerSweepCrossingMinimizerCounting.ts:158,162` | `LayerSweepCrossingMinimizer.java:438,442` | `totalCrossings += countAllCrossings(…) + modelOrderInfluence`; `totalCrossings += countCurrentNumberOfCrossings(child)` | kept | `double totalCrossings` (`:416`) and `double modelOrderInfluence` (`:421`): binary numeric promotion makes both additions `double` |
| 22 | `p3order/LayerSweepCrossingMinimizerCounting.ts:189,197` | `LayerSweepCrossingMinimizer.java:433,435` | `modelOrderInfluence += influence * count` | kept | `double` accumulator, `double` factor |
| 23 | `p3order/BarycenterHeuristic.ts:370,379,386`; `p3order/ForsterConstraintResolverConstraintGroup.ts:90` | `BarycenterHeuristic.java:247,250,268,275`; `ForsterConstraintResolver.java:442` | `summedWeight += …`; `summedWeight = nodeGroup1.summedWeight + nodeGroup2.summedWeight` | kept | `double summedWeight` (`BarycenterHeuristic.java:294`, `ForsterConstraintResolver.java:372`) |
| 24 | `p3order/ForsterConstraintResolver.ts:222,232,404`; `p3order/ForsterConstraintResolverConstraintGroup.ts:119`; `p3order/AbstractBarycenterPortDistributor.ts:241` | `ForsterConstraintResolver.java:198,213,339,431`; `AbstractBarycenterPortDistributor.java:250` | `incomingConstraintsCount++` / `--`; `inLayerConnections++` | kept | each counts entries of constraint lists it is later compared with by `size()` (`:277`), or the connected ports of one port |
| 25 | `intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.ts:55-56,79-80,114,117,122`; `p3order/counting/HyperedgeCrossingsCounter.ts:89,93,118,124,127,148,315,400,403`; `p3order/counting/CrossingsCounter.ts:341,373`; `p3order/counting/AllCrossingsCounter.ts:97,115`; `p3order/counting/CrossingsCounterNorthSouth.ts:148-217`; `p3order/{LayerTotalPortDistributor,NodeRelativePortDistributor,InteractiveCrossingMinimizer,GraphInfoHolder,AbstractBarycenterPortDistributor}.ts`; `intermediate/greedyswitch/GreedySwitchHeuristic.ts:144` | the `@see` of each | `size++`, `cardinality++`, `portEdges++`, `sourceCount++`, `targetCount++`, `otherInputPorts++`, `northInputPorts++`, `delta--`, `openHyperedges++/--`, `numBetweenLayerEdges++`, `numPorts++`, `nPorts++`, `inputCount++`, `index++`, `pos++` | kept | `++`/`--` counters of the elements of one collection (ports, edges or corners), port ids that index `portPos`, or array positions |
| 26 | loop and index arithmetic in all three directories (`i + 1`, `length - 1`, `freeLayerIndex ± 1`, `2 * i + 1`, `hyperedges.length * 2`, `positionOf(node) + 1`, `side1.ordinal() - side2.ordinal()`) | the `@see` of each | index or size arithmetic | kept | loop indices and positions inside one array or list; no accumulator. `double`/`float` arithmetic (`BarycenterHeuristic.ts:175,186,206,209`, `InteractiveCrossingMinimizer.ts:110,254,276`, `SweepCopy.ts:160,169`, `MedianHeuristic.ts:110`, `ForsterConstraintResolver.ts:356,361`) is not `int` |

## Already `Int32` before this mission

| # | TS file | What |
| - | ------- | ---- |
| 27 | `p3order/counting/{BinaryIndexedTree,CrossingsCounter,CrossingsCounterNorthSouth,AllCrossingsCounter,HyperedgeCrossingsCounter}.ts`, `p3order/LayerSweepCrossingMinimizerCounting.ts:130,134` (`int totalCrossings`, `LayerSweepCrossingMinimizer.java:393-403`), `p3order/BarycenterHeuristic.ts:378`, `p3order/AbstractBarycenterPortDistributor.ts:240`, `p3order/MedianHeuristic.ts` | crossing sums, tree sums and products; unchanged, not re-derived here |
