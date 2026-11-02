// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { SortByInputModelProcessor } from '../intermediate/SortByInputModelProcessor.js';
import { ModelOrderNodeComparator } from '../intermediate/preserveorder/ModelOrderNodeComparator.js';
import { ModelOrderPortComparator } from '../intermediate/preserveorder/ModelOrderPortComparator.js';
import type { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LongEdgeOrderingStrategy } from '../options/LongEdgeOrderingStrategy.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';
import type { GraphInfoHolder } from './GraphInfoHolder.js';

/*
 * The crossing and model-order counting of `LayerSweepCrossingMinimizer` (`:326-448`), as functions over the list of
 * graph holders (Java's `graphInfoHolders`, indexed by `LGraph.id`).
 *
 * C7 verdict: `countCurrentNumberOfCrossings` is a true self-recursion (it calls itself with the child holder of each
 * child graph, not an overload), and `countCurrentNumberOfCrossingsNodePortOrder` calls it for the children. Its
 * depth is the nesting depth of the graph hierarchy; no recorded row nests graphs (U until 7h), so the recursion is
 * kept as the Java has it, with the same `ArrayDeque` loop around it.
 */

/**
 * Compares all nodes in a each layer and counts how often they are not in model order. This requires that the
 * `SortByInputModelProcessor` ran previously.
 *
 * @param graph the graph
 * @param layers layers to check
 * @param strategy the ordering strategy to compare the nodes
 * @param cmGroupOrderStrategy the strategy of the group model order
 * @returns The number of model order conflicts
 * @see LayerSweepCrossingMinimizer.java:334
 */
export function countModelOrderNodeChanges(
  graph: LGraph,
  layers: LNode[][],
  strategy: OrderingStrategy,
  cmGroupOrderStrategy: GroupOrderStrategy,
): number {
  let previousLayer = -1;
  let wrongModelOrder = 0;
  for (const layer of layers) {
    // FIXME I do not think that the NONE cmGroupOrderStrategy is respected here.
    const comp = new ModelOrderNodeComparator(
      graph,
      previousLayer === -1 ? layers[0]! : layers[previousLayer]!,
      strategy,
      LongEdgeOrderingStrategy.EQUAL,
      { groupOrderStrategy: cmGroupOrderStrategy, beforePorts: false },
    );
    wrongModelOrder += countWrongModelOrderOfNodes(layer, comp);
    previousLayer++;
  }
  return wrongModelOrder;
}

/** The pair loops over the nodes of one layer (`LayerSweepCrossingMinimizer.java:343-352`). */
function countWrongModelOrderOfNodes(layer: LNode[], comp: ModelOrderNodeComparator): number {
  let wrongModelOrder = 0;
  for (let i = 0; i < layer.length; i++) {
    for (let j = i + 1; j < layer.length; j++) {
      if (
        layer[i]!.hasProperty(InternalProperties.MODEL_ORDER) &&
        layer[j]!.hasProperty(InternalProperties.MODEL_ORDER) &&
        comp.compare(layer[i]!, layer[j]!) > 0
      ) {
        wrongModelOrder++;
      }
    }
  }
  return wrongModelOrder;
}

/**
 * Compares all ports in a each layer and counts how often they are not in model order. This requires that the
 * `SortByInputModelProcessor` ran previously.
 *
 * @param graph the graph
 * @param layers layers to check
 * @param _groupOrderStrategy the strategy of the group model order (unused in Java as well)
 * @returns The number of model order conflicts
 * @see LayerSweepCrossingMinimizer.java:365
 */
export function countModelOrderPortChanges(
  graph: LGraph,
  layers: LNode[][],
  _groupOrderStrategy: GroupOrderStrategy,
): number {
  let previousLayer = -1;
  let wrongModelOrder = 0;
  for (const layer of layers) {
    for (const lNode of layer) {
      const comp = new ModelOrderPortComparator(
        graph,
        previousLayer === -1 ? layers[0]! : layers[previousLayer]!,
        lNode.getGraph()!.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY),
        SortByInputModelProcessor.longEdgeTargetNodePreprocessing(lNode),
        lNode.getGraph()!.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER),
      );
      for (let i = 0; i < lNode.getPorts().length; i++) {
        for (let j = i + 1; j < lNode.getPorts().length; j++) {
          if (comp.compare(lNode.getPorts()[i]!, lNode.getPorts()[j]!) > 0) {
            wrongModelOrder++;
          }
        }
      }
    }
    previousLayer++;
  }
  return wrongModelOrder;
}

/**
 * We only need to count crossings below the current graph and also only if they are marked as to be processed
 * hierarchically.
 *
 * @see LayerSweepCrossingMinimizer.java:392
 */
export function countCurrentNumberOfCrossings(
  graphInfoHolders: readonly GraphInfoHolder[],
  currentGraph: GraphInfoHolder,
): number {
  let totalCrossings = 0;
  const countCrossingsIn: GraphInfoHolder[] = [];
  countCrossingsIn.push(currentGraph);
  while (countCrossingsIn.length !== 0) {
    const gD = countCrossingsIn.pop()!;
    totalCrossings = Int32.add(totalCrossings, gD.crossCounter().countAllCrossings(gD.currentNodeOrder()));
    for (const childLGraph of gD.childGraphs()) {
      const child = graphInfoHolders[childLGraph.id]!;
      if (!child.dontSweepInto()) {
        totalCrossings = Int32.add(totalCrossings, countCurrentNumberOfCrossings(graphInfoHolders, child));
      }
    }
  }

  return totalCrossings;
}

/**
 * We only need to count crossings and violations of node and port order below the current graph and also only
 * if they are marked as to be processed hierarchically.
 *
 * @see LayerSweepCrossingMinimizer.java:415
 */
export function countCurrentNumberOfCrossingsNodePortOrder(
  graphInfoHolders: readonly GraphInfoHolder[],
  currentGraph: GraphInfoHolder,
): number {
  let totalCrossings = 0;
  const countCrossingsIn: GraphInfoHolder[] = [];
  countCrossingsIn.push(currentGraph);
  while (countCrossingsIn.length !== 0) {
    const gD = countCrossingsIn.pop()!;
    const modelOrderInfluence = modelOrderInfluenceOf(currentGraph, gD);
    totalCrossings += gD.crossCounter().countAllCrossings(gD.currentNodeOrder()) + modelOrderInfluence;
    for (const childLGraph of gD.childGraphs()) {
      const child = graphInfoHolders[childLGraph.id]!;
      if (!child.dontSweepInto()) {
        totalCrossings += countCurrentNumberOfCrossings(graphInfoHolders, child);
      }
    }
  }

  return totalCrossings;
}

/**
 * The `modelOrderInfluence` block of the loop body in `countCurrentNumberOfCrossingsNodePortOrder`
 * (`LayerSweepCrossingMinimizer.java:420-435`): the options are read from `currentGraph`, the layers from `gD`.
 */
function modelOrderInfluenceOf(currentGraph: GraphInfoHolder, gD: GraphInfoHolder): number {
  let modelOrderInfluence = 0;
  // Additionally add changes to the model order to the number of crossings.
  // The influence of port and node order can be configured.
  const modelOrderStrategy = currentGraph.lGraph().getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY);
  const cmGroupOrderStrategy = currentGraph
    .lGraph()
    .getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_GROUP_ORDER_STRATEGY);
  const crossingCounterNodeInfluence = currentGraph
    .lGraph()
    .getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE);
  const crossingCounterPortInfluence = currentGraph
    .lGraph()
    .getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_PORT_INFLUENCE);
  if (modelOrderStrategy !== OrderingStrategy.NONE) {
    modelOrderInfluence +=
      crossingCounterNodeInfluence *
      countModelOrderNodeChanges(
        currentGraph.lGraph(),
        gD.currentNodeOrder(),
        modelOrderStrategy,
        cmGroupOrderStrategy,
      );
    modelOrderInfluence +=
      crossingCounterPortInfluence *
      countModelOrderPortChanges(currentGraph.lGraph(), gD.currentNodeOrder(), cmGroupOrderStrategy);
  }
  return modelOrderInfluence;
}
