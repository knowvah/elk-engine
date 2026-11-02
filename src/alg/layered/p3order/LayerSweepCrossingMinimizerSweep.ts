// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import type { GraphInfoHolder } from './GraphInfoHolder.js';
import {
  sortPortDummiesByPortPositions,
  sortPortsByDummyPositionsInLastLayer,
} from './LayerSweepCrossingMinimizerHierarchical.js';
import type { LayerSweepCrossingMinimizerState } from './LayerSweepCrossingMinimizerState.js';
import {
  firstFree,
  firstIndex,
  hasNestedGraph,
  isExternalPortDummy,
  isNotEnd,
  next,
  sideOpposedSweepDirection,
} from './LayerSweepCrossingMinimizerSweepHelpers.js';

/*
 * The sweep of `LayerSweepCrossingMinimizer` (`:450-503`), as functions over the shared state record. The three
 * methods are mutually recursive through the hierarchy (`sweepReducingCrossings` -> `sweepInHierarchicalNodes` ->
 * `sweepInHierarchicalNode` -> `sweepReducingCrossings`): the recursion depth is the nesting depth of the graph
 * hierarchy, not its size, and no recorded row nests graphs (they are U until 7h), so the recursion is kept as the
 * Java has it (C7).
 */

/** @see LayerSweepCrossingMinimizer.java:450 */
export function sweepReducingCrossings(
  state: LayerSweepCrossingMinimizerState,
  graph: GraphInfoHolder,
  forward: boolean,
  firstSweep: boolean,
): boolean {
  const nodes = graph.currentNodeOrder();
  const length = nodes.length;

  let improved = graph.portDistributor().distributePortsWhileSweeping(nodes, firstIndex(forward, length), forward);
  const firstLayer = nodes[firstIndex(forward, length)]!;
  improved = sweepInHierarchicalNodes(state, firstLayer, forward, firstSweep) || improved;
  for (let i = firstFree(forward, length); isNotEnd(length, i, forward); i += next(forward)) {
    improved =
      graph
        .crossMinimizer()
        .minimizeCrossings(
          nodes,
          i,
          forward,
          firstSweep &&
            !graph.lGraph().getProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER) &&
            !graph.lGraph().getProperty(InternalProperties.SECOND_TRY_WITH_INITIAL_ORDER),
        ) || improved;
    improved = graph.portDistributor().distributePortsWhileSweeping(nodes, i, forward) || improved;
    improved = sweepInHierarchicalNodes(state, nodes[i]!, forward, firstSweep) || improved;
  }

  state.graphsWhoseNodeOrderChanged.add(graph);
  return improved;
}

/** @see LayerSweepCrossingMinimizer.java:471 */
function sweepInHierarchicalNodes(
  state: LayerSweepCrossingMinimizerState,
  layer: LNode[],
  isForwardSweep: boolean,
  isFirstSweep: boolean,
): boolean {
  let improved = false;
  for (const node of layer) {
    if (hasNestedGraph(node) && !state.graphInfoHolders[(node.getNestedGraph() as LGraph).id]!.dontSweepInto()) {
      improved = sweepInHierarchicalNode(state, isForwardSweep, node, isFirstSweep) || improved;
    }
  }
  return improved;
}

/** @see LayerSweepCrossingMinimizer.java:482 */
function sweepInHierarchicalNode(
  state: LayerSweepCrossingMinimizerState,
  isForwardSweep: boolean,
  node: LNode,
  isFirstSweep: boolean,
): boolean {
  const nestedLGraph = node.getNestedGraph()!;
  const nestedGraph = state.graphInfoHolders[nestedLGraph.id]!;
  const nestedGraphNodeOrder = nestedGraph.currentNodeOrder();
  const startIndex = firstIndex(isForwardSweep, nestedGraphNodeOrder.length);
  const firstNode = nestedGraphNodeOrder[startIndex]![0]!;

  if (isExternalPortDummy(firstNode)) {
    nestedGraphNodeOrder[startIndex] = sortPortDummiesByPortPositions(
      node,
      nestedGraphNodeOrder[startIndex]!,
      sideOpposedSweepDirection(isForwardSweep),
    );
  } else {
    nestedGraph.crossMinimizer().setFirstLayerOrder(nestedGraphNodeOrder, isForwardSweep);
  }

  const improved = sweepReducingCrossings(state, nestedGraph, isForwardSweep, isFirstSweep);
  sortPortsByDummyPositionsInLastLayer(nestedGraph.currentNodeOrder(), nestedGraph.parent()!, isForwardSweep);

  return improved;
}
